#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import paymasterRuntimeConfig from "./paymaster-runtime-config.js";
import phalaCliHelpers from "./phala-cli.js";

const execFileAsync = promisify(execFile);
const { resolvePhalaCliCommand } = phalaCliHelpers;

const PHALA_API_TOKEN = process.env.MORPHEUS_RUNTIME_TOKEN || process.env.PHALA_API_TOKEN || process.env.PHALA_SHARED_SECRET || "";
const PAYMASTER_APP_ID = process.env.MORPHEUS_PAYMASTER_APP_ID || "ddff154546fe22d15b65667156dd4b7c611e6093";
const PAYMASTER_DAPP_ID = process.env.MORPHEUS_PAYMASTER_DAPP_ID || "demo-dapp";
const PAYMASTER_ACCOUNT_ID = process.env.PAYMASTER_ACCOUNT_ID || "0x0c3146e78efc42bfb7d4cc2e06e3efd063c01c56";
const CORE_HASH = process.env.AA_CORE_HASH_TESTNET || "0xe24d2980d17d2580ff4ee8dc5dddaa20e3caec38";
const PAYMASTER_METHOD = process.env.MORPHEUS_PAYMASTER_METHOD || "executeUserOp";
const PAYMASTER_MAX_GAS_UNITS = Number(process.env.MORPHEUS_PAYMASTER_TESTNET_MAX_GAS_UNITS || 5_000_000);
const SKIP_PAYMASTER_ALLOWLIST_UPDATE = process.env.SKIP_PAYMASTER_ALLOWLIST_UPDATE === "1";
const PHALA_SSH_RETRIES = Math.max(1, Number(process.env.PHALA_SSH_RETRIES || 3));
const REMOTE_WORKER_SERVICE =
  process.env.MORPHEUS_REMOTE_WORKER_SERVICE
  || process.env.MORPHEUS_PAYMASTER_REMOTE_WORKER_SERVICE
  || "testnet-request-worker";
const { resolvePaymasterAuthorizeEndpoint } = paymasterRuntimeConfig;
const PAYMASTER_ENDPOINT = resolvePaymasterAuthorizeEndpoint(process.env);
const PHALA_CLI_COMMAND = resolvePhalaCliCommand(process.env);
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.resolve(MODULE_DIR, "..", "..", "docs", "reports");

if (!PHALA_API_TOKEN) {
  console.error("MORPHEUS_RUNTIME_TOKEN, PHALA_API_TOKEN, or PHALA_SHARED_SECRET is required.");
  process.exit(1);
}

function normalizeHash(value = "") {
  const hex = String(value || "").replace(/^0x/i, "").toLowerCase();
  return hex ? `0x${hex}` : "";
}

function isAuthFailureStatus(status) {
  return Number(status) === 401 || Number(status) === 403;
}

function parseLastJsonLine(stdout = "") {
  const lines = String(stdout || "").trim().split("\n").map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!line.startsWith("{")) continue;
    try {
      return JSON.parse(line);
    } catch {}
  }
  return null;
}

async function runPhalaRemoteShell(shellScript, { maxBuffer = 10 * 1024 * 1024 } = {}) {
  if (!PHALA_CLI_COMMAND) {
    throw new Error('phala CLI is required for remote paymaster validation (global phala or npx phala)');
  }
  let lastError = null;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "morpheus-paymaster-policy-"));
  const localScriptPath = path.join(tempDir, "remote.sh");
  await writeFile(localScriptPath, shellScript, { mode: 0o700 });

  for (let attempt = 1; attempt <= PHALA_SSH_RETRIES; attempt += 1) {
    const remoteScriptPath = `/tmp/morpheus-paymaster-policy-${Date.now()}-${attempt}.sh`;
    try {
      await execFileAsync(
        PHALA_CLI_COMMAND[0],
        [...PHALA_CLI_COMMAND.slice(1), "cp", "--api-token", PHALA_API_TOKEN, localScriptPath, `${PAYMASTER_APP_ID}:${remoteScriptPath}`],
        { maxBuffer },
      );
      const result = await execFileAsync(
        PHALA_CLI_COMMAND[0],
        [...PHALA_CLI_COMMAND.slice(1), "ssh", "--api-token", PHALA_API_TOKEN, PAYMASTER_APP_ID, "--", "sh", remoteScriptPath],
        { maxBuffer },
      );
      await execFileAsync(
        PHALA_CLI_COMMAND[0],
        [...PHALA_CLI_COMMAND.slice(1), "ssh", "--api-token", PHALA_API_TOKEN, PAYMASTER_APP_ID, "--", "rm", "-f", remoteScriptPath],
        { maxBuffer },
      ).catch(() => {});
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      return result;
    } catch (error) {
      lastError = error;
      if (attempt >= PHALA_SSH_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }

  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function callRemotePaymaster(payload) {
  const bodyBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const normalizedAccount = normalizeHash(PAYMASTER_ACCOUNT_ID);
  const normalizedTarget = normalizeHash(CORE_HASH);
  const overrideAssignments = [
    ["MORPHEUS_PAYMASTER_TESTNET_ENABLED", "true"],
    ["MORPHEUS_PAYMASTER_TESTNET_POLICY_ID", "testnet-aa"],
    ["MORPHEUS_PAYMASTER_TESTNET_ALLOW_DAPPS", PAYMASTER_DAPP_ID],
    ["MORPHEUS_PAYMASTER_TESTNET_ALLOW_ACCOUNTS", normalizedAccount],
    ["MORPHEUS_PAYMASTER_TESTNET_ALLOW_TARGETS", normalizedTarget],
    ["MORPHEUS_PAYMASTER_TESTNET_ALLOW_METHODS", "executeUserOp,executeUnifiedByAddress"],
    ["MORPHEUS_PAYMASTER_TESTNET_MAX_GAS_UNITS", String(PAYMASTER_MAX_GAS_UNITS)],
  ]
    .map(([key, value]) => `process.env.${key} = ${JSON.stringify(value)};`)
    .join("\n");
const shellScript = `
set -e
WORKER_CONTAINER="$(docker ps --format '{{.Names}}' | awk '/request-worker/ { print; exit }')"
if [ -z "$WORKER_CONTAINER" ]; then
  echo "request-worker container not found" >&2
  exit 1
fi
docker exec -i "$WORKER_CONTAINER" node --input-type=module - <<'JS'
${overrideAssignments}
process.env.PHALA_API_TOKEN = process.env.PHALA_API_TOKEN || process.env.MORPHEUS_RUNTIME_TOKEN || process.env.PHALA_SHARED_SECRET || "";
const body = JSON.parse(Buffer.from('${bodyBase64}', 'base64').toString('utf8'));
const { default: handler } = await import('/app/workers/phala-worker/src/worker.js');
const req = new Request('http://local/paymaster/authorize', {
  method: 'POST',
  headers: { authorization: 'Bearer ' + process.env.PHALA_API_TOKEN, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
const res = await handler(req);
const text = await res.text();
let parsed;
try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
console.log(JSON.stringify({ status: res.status, body: parsed }));
JS
`;
  const { stdout } = await runPhalaRemoteShell(shellScript, { maxBuffer: 10 * 1024 * 1024 });
  const parsed = parseLastJsonLine(stdout);
  if (!parsed) throw new Error(`unexpected paymaster output: ${stdout.trim()}`);
  return parsed;
}

async function callDirectPaymaster(payload) {
  const endpoint = PAYMASTER_ENDPOINT.endsWith("/paymaster/authorize")
    ? PAYMASTER_ENDPOINT
    : `${PAYMASTER_ENDPOINT}/paymaster/authorize`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${PHALA_API_TOKEN}`,
      "x-phala-token": PHALA_API_TOKEN,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function callPaymaster(payload) {
  if (!PAYMASTER_ENDPOINT) {
    return callRemotePaymaster(payload);
  }

  const direct = await callDirectPaymaster(payload);
  if (!isAuthFailureStatus(direct?.status) || !PHALA_CLI_COMMAND) {
    return direct;
  }

  console.warn('[paymaster-policy] direct authorize endpoint rejected the provided token; retrying via Phala CLI remote worker path');
  return callRemotePaymaster(payload);
}

function assertApproved(response, label) {
  if (Number(response?.status) !== 200) {
    throw new Error(`${label}: expected HTTP 200, got ${response?.status}`);
  }
  if (response?.body?.approved !== true) {
    throw new Error(`${label}: expected approved=true, got ${JSON.stringify(response?.body || {}, null, 2)}`);
  }
}

function assertDenied(response, label, reasonPattern) {
  if (Number(response?.status) !== 200) {
    throw new Error(`${label}: expected HTTP 200, got ${response?.status}`);
  }
  if (response?.body?.approved !== false) {
    throw new Error(`${label}: expected approved=false, got ${JSON.stringify(response?.body || {}, null, 2)}`);
  }
  if (!reasonPattern.test(String(response?.body?.reason || ""))) {
    throw new Error(`${label}: expected reason ${reasonPattern}, got ${response?.body?.reason || "n/a"}`);
  }
}

async function main() {
  const accountId = normalizeHash(PAYMASTER_ACCOUNT_ID);
  if (!SKIP_PAYMASTER_ALLOWLIST_UPDATE) {
    console.log(`Using per-request remote paymaster overrides for ${accountId}...`);
  }

  const approvedPayload = {
    network: "testnet",
    target_chain: "neo_n3",
    account_id: accountId,
    dapp_id: PAYMASTER_DAPP_ID,
    target_contract: normalizeHash(CORE_HASH),
    method: PAYMASTER_METHOD,
    estimated_gas_units: 1985656,
    operation_hash: `0x${"44".repeat(32)}`,
  };

  const approved = await callPaymaster(approvedPayload);
  assertApproved(approved, "approved");

  const cases = [
    {
      id: "missingOperationHash",
      payload: { ...approvedPayload, operation_hash: "" },
      reason: /operation_hash is required/i,
    },
    {
      id: "wrongDappId",
      payload: { ...approvedPayload, dapp_id: "rogue-dapp", operation_hash: `0x${"45".repeat(32)}` },
      reason: /dapp_id is not allowlisted/i,
    },
    {
      id: "wrongAccountId",
      payload: { ...approvedPayload, account_id: "0x9999000011112222333344445555666677778888", operation_hash: `0x${"46".repeat(32)}` },
      reason: /account_id is not allowlisted/i,
    },
    {
      id: "wrongTargetContract",
      payload: { ...approvedPayload, target_contract: "0x1111111111111111111111111111111111111111", operation_hash: `0x${"47".repeat(32)}` },
      reason: /target_contract is not allowlisted/i,
    },
    {
      id: "wrongMethod",
      payload: { ...approvedPayload, method: "transfer", operation_hash: `0x${"48".repeat(32)}` },
      reason: /method is not allowlisted/i,
    },
    {
      id: "gasTooHigh",
      payload: { ...approvedPayload, estimated_gas_units: PAYMASTER_MAX_GAS_UNITS + 1, operation_hash: `0x${"49".repeat(32)}` },
      reason: /estimated gas exceeds network paymaster limit/i,
    },
    {
      id: "wrongTargetChain",
      payload: { ...approvedPayload, target_chain: "neo_x", operation_hash: `0x${"4a".repeat(32)}` },
      reason: /supports neo_n3 only/i,
    },
  ];

  const deniedCases = {};
  for (const item of cases) {
    const response = await callPaymaster(item.payload);
    assertDenied(response, item.id, item.reason);
    deniedCases[item.id] = {
      approved: response.body.approved,
      reason: response.body.reason,
    };
  }

  const report = {
    network: "testnet",
    appId: PAYMASTER_APP_ID,
    policyId: approved.body.policy_id,
    accountId,
    approved: {
      approvalDigest: approved.body.approval_digest,
      attestationHash: approved.body.attestation_hash,
      targetContract: approved.body.target_contract,
      method: approved.body.method,
    },
    deniedCases,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, "v3-testnet-paymaster-policy.latest.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    reportPath,
    policyId: report.policyId,
    accountId: report.accountId,
    deniedCases: Object.keys(report.deniedCases),
    approvalDigest: report.approved.approvalDigest,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
