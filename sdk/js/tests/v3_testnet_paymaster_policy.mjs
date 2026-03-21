#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

const PHALA_API_TOKEN = process.env.MORPHEUS_RUNTIME_TOKEN || process.env.PHALA_API_TOKEN || process.env.PHALA_SHARED_SECRET || "";
const PAYMASTER_APP_ID = process.env.MORPHEUS_PAYMASTER_APP_ID || "28294e89d490924b79c85cdee057ce55723b3d56";
const PAYMASTER_DAPP_ID = process.env.MORPHEUS_PAYMASTER_DAPP_ID || "demo-dapp";
const PAYMASTER_ACCOUNT_ID = process.env.PAYMASTER_ACCOUNT_ID || "0x0c3146e78efc42bfb7d4cc2e06e3efd063c01c56";
const CORE_HASH = process.env.AA_CORE_HASH_TESTNET || "0xe24d2980d17d2580ff4ee8dc5dddaa20e3caec38";
const PAYMASTER_METHOD = process.env.MORPHEUS_PAYMASTER_METHOD || "executeUserOp";
const PAYMASTER_MAX_GAS_UNITS = Number(process.env.MORPHEUS_PAYMASTER_TESTNET_MAX_GAS_UNITS || 5_000_000);
const SKIP_PAYMASTER_ALLOWLIST_UPDATE = process.env.SKIP_PAYMASTER_ALLOWLIST_UPDATE === "1";
const PHALA_SSH_RETRIES = Math.max(1, Number(process.env.PHALA_SSH_RETRIES || 3));
const REPORT_DIR = path.resolve(import.meta.dirname, "..", "..", "docs", "reports");

if (!PHALA_API_TOKEN) {
  console.error("MORPHEUS_RUNTIME_TOKEN, PHALA_API_TOKEN, or PHALA_SHARED_SECRET is required.");
  process.exit(1);
}

function normalizeHash(value = "") {
  const hex = String(value || "").replace(/^0x/i, "").toLowerCase();
  return hex ? `0x${hex}` : "";
}

async function runPhalaRemoteShell(shellScript, { maxBuffer = 10 * 1024 * 1024 } = {}) {
  let lastError = null;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "morpheus-paymaster-policy-"));
  const localScriptPath = path.join(tempDir, "remote.sh");
  await writeFile(localScriptPath, shellScript, { mode: 0o700 });

  for (let attempt = 1; attempt <= PHALA_SSH_RETRIES; attempt += 1) {
    const remoteScriptPath = `/tmp/morpheus-paymaster-policy-${Date.now()}-${attempt}.sh`;
    try {
      await execFileAsync(
        "phala",
        ["cp", "--api-token", PHALA_API_TOKEN, localScriptPath, `${PAYMASTER_APP_ID}:${remoteScriptPath}`],
        { maxBuffer },
      );
      const result = await execFileAsync(
        "phala",
        ["ssh", "--api-token", PHALA_API_TOKEN, PAYMASTER_APP_ID, "--", "sh", remoteScriptPath],
        { maxBuffer },
      );
      await execFileAsync(
        "phala",
        ["ssh", "--api-token", PHALA_API_TOKEN, PAYMASTER_APP_ID, "--", "rm", "-f", remoteScriptPath],
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
cd /dstack
docker compose --env-file /dstack/.host-shared/.decrypted-env -f /dstack/docker-compose.yaml exec -T phala-worker node --input-type=module - <<'JS'
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
  const jsonLine = stdout.trim().split("\n").find((line) => line.trim().startsWith("{"));
  if (!jsonLine) throw new Error(`unexpected paymaster output: ${stdout.trim()}`);
  return JSON.parse(jsonLine);
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

  const approved = await callRemotePaymaster(approvedPayload);
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
    const response = await callRemotePaymaster(item.payload);
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
  const reportPath = path.join(REPORT_DIR, `2026-03-14-v3-testnet-paymaster-policy.${Date.now()}.json`);
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
