#!/usr/bin/env node

import { rpc } from "@cityofzion/neon-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "..", "..", "..");
const REPORT_DIR = path.resolve(REPO_ROOT, "sdk", "docs", "reports");
const REGISTRY_PATH = path.resolve(REPO_ROOT, "frontend", "src", "config", "generatedMorpheusRegistry.js");

const EXPECTED_CONTRACTS = {
  aaCore: {
    manifestName: "UnifiedSmartWalletV3",
    methods: [
      "registerAccount",
      "executeUserOp",
      "executeUserOps",
      "getVerifier",
      "getHook",
      "getNonce",
      "verify",
    ],
  },
  aaWeb3AuthVerifier: {
    manifestName: "Web3AuthVerifier",
    methods: ["setPublicKey", "getPublicKey", "validateSignature"],
  },
  aaSessionKeyVerifier: {
    manifestName: "SessionKeyVerifier",
    methods: ["setSessionKey", "clearSessionKey", "getSessionKey", "validateSignature"],
  },
  aaSocialRecoveryVerifier: {
    manifestName: "SocialRecoveryVerifier",
    methods: [
      "setupRecovery",
      "requestRecoveryTicket",
      "submitRecoveryTicket",
      "finalizeRecovery",
      "verify",
      "verifyMetaTx",
    ],
  },
};

function normalizeHash(value = "") {
  return String(value || "").replace(/^0x/i, "").toLowerCase();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GET ${url} failed with HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`GET ${url} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function validateRuntime(publicApiUrl) {
  const baseUrl = String(publicApiUrl || "").replace(/\/+$/, "");
  assert(baseUrl, "mainnet public API URL is required");

  const [catalog, status] = await Promise.all([
    readJson(`${baseUrl}/api/runtime/catalog`),
    readJson(`${baseUrl}/api/runtime/status`),
  ]);

  assert(catalog?.envelope?.version, "runtime catalog envelope version is required");
  assert(Array.isArray(catalog.workflows), "runtime catalog workflows must be an array");
  assert(catalog.workflows.some((workflow) => workflow?.id === "automation.upkeep"), "runtime catalog must include automation.upkeep");
  assert(status?.runtime?.status === "operational", "mainnet runtime status must be operational");
  assert(status?.catalog?.envelope?.version === catalog.envelope.version, "runtime status envelope must match catalog");

  return {
    baseUrl,
    envelopeVersion: catalog.envelope.version,
    workflowCount: catalog.workflows.length,
    runtimeStatus: status.runtime.status,
    executionPlane: catalog?.topology?.executionPlane || null,
    riskPlane: catalog?.topology?.riskPlane || null,
  };
}

async function validateContract(client, key, hash, expected) {
  assert(normalizeHash(hash), `${key} hash is required`);
  const state = await client.getContractState(normalizeHash(hash));
  const methods = Array.isArray(state?.manifest?.abi?.methods)
    ? state.manifest.abi.methods.map((method) => method.name)
    : [];
  const missingMethods = expected.methods.filter((method) => !methods.includes(method));

  assert(state?.manifest?.name === expected.manifestName, `${key} manifest name mismatch`);
  assert(missingMethods.length === 0, `${key} missing methods: ${missingMethods.join(", ")}`);

  return {
    key,
    hash: `0x${normalizeHash(hash)}`,
    manifestName: state.manifest.name,
    methodCount: methods.length,
    requiredMethods: expected.methods,
    missingMethods,
  };
}

async function main() {
  const { MORPHEUS_PUBLIC_REGISTRY } = await import(pathToFileURL(REGISTRY_PATH).href);
  const mainnet = MORPHEUS_PUBLIC_REGISTRY?.mainnet;
  assert(mainnet, "mainnet registry entry is required");

  const rpcUrl = process.env.MAINNET_RPC_URL || process.env.NEO_MAINNET_RPC_URL || mainnet.rpcUrl;
  const client = new rpc.RPCClient(rpcUrl);
  const version = await client.getVersion();
  const networkMagic = Number(version?.protocol?.network);
  assert(networkMagic === Number(mainnet.networkMagic), `mainnet network magic mismatch: ${networkMagic}`);

  const [runtime, contracts] = await Promise.all([
    validateRuntime(mainnet.morpheus.publicApiUrl),
    Promise.all(
      Object.entries(EXPECTED_CONTRACTS).map(([key, expected]) =>
        validateContract(client, key, mainnet.contracts[key], expected),
      ),
    ),
  ]);

  const report = {
    createdAt: new Date().toISOString(),
    network: "mainnet",
    rpcUrl,
    networkMagic,
    runtime,
    contracts,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, "v3-mainnet-readonly.latest.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  process.stdout.write(`${JSON.stringify({
    reportPath,
    network: report.network,
    runtimeStatus: runtime.runtimeStatus,
    contractCount: contracts.length,
    contracts: contracts.map((item) => `${item.key}:${item.hash}`),
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
