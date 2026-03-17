#!/usr/bin/env node

import http from "node:http";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

const { rpc, sc, wallet, experimental, tx, u, CONST } = require("@cityofzion/neon-js");
const { ethers } = require("ethers");
const { buildV3UserOperationTypedData, sanitizeHex } = require("../src/metaTx");
const { AbstractAccountClient } = require("../src/index");

const relayModule = await import("../../../frontend/api/relay-transaction.js");
const relayHandler = relayModule.default;

const TEST_WIF = process.env.TEST_WIF || process.env.NEO_TESTNET_WIF || "";
const RPC_URL = process.env.TESTNET_RPC_URL || process.env.NEO_RPC_URL || "https://testnet1.neo.coz.io:443";
const CORE_HASH = process.env.AA_CORE_HASH_TESTNET || "0xe24d2980d17d2580ff4ee8dc5dddaa20e3caec38";
const WEB3AUTH_VERIFIER_HASH = process.env.AA_WEB3AUTH_VERIFIER_HASH_TESTNET || "0xf2560a0db44bbb32d0a6919cf90a3d0643ad8e3d";
const PAYMASTER_APP_ID = process.env.MORPHEUS_PAYMASTER_APP_ID || "28294e89d490924b79c85cdee057ce55723b3d56";
const PAYMASTER_API_TOKEN = process.env.PHALA_API_TOKEN || process.env.PHALA_SHARED_SECRET || "";
const PAYMASTER_DAPP_ID = process.env.MORPHEUS_PAYMASTER_DAPP_ID || "demo-dapp";
const DEFAULT_PAYMASTER_ACCOUNT_ID = "0x37298bb6bbb4580fdca24903d67b385ef2268e25";
const PAYMASTER_ACCOUNT_ID = process.env.PAYMASTER_ACCOUNT_ID || DEFAULT_PAYMASTER_ACCOUNT_ID;
const SKIP_PAYMASTER_ALLOWLIST_UPDATE =
  process.env.SKIP_PAYMASTER_ALLOWLIST_UPDATE === "1"
  || (process.env.SKIP_PAYMASTER_ALLOWLIST_UPDATE !== "0" && !process.env.PAYMASTER_ACCOUNT_ID);
const PHALA_SSH_RETRIES = Math.max(1, Number(process.env.PHALA_SSH_RETRIES || 3));
const GAS_HASH = CONST.NATIVE_CONTRACT_HASH.GasToken;

if (!TEST_WIF) {
  console.error("TEST_WIF or NEO_TESTNET_WIF is required.");
  process.exit(1);
}

if (!PAYMASTER_API_TOKEN) {
  console.error("PHALA_API_TOKEN or PHALA_SHARED_SECRET is required.");
  process.exit(1);
}

function normalizeHash(value) {
  const hex = sanitizeHex(value || "");
  return hex ? `0x${hex}` : "";
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

function hash160Param(value) {
  return sc.ContractParam.hash160(sanitizeHex(value));
}

function byteArrayParam(hexValue) {
  return sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(hexValue), true));
}

function integerParam(value) {
  if (typeof value === "bigint") return sc.ContractParam.integer(value.toString());
  return sc.ContractParam.integer(value);
}

function stringParam(value) {
  return sc.ContractParam.string(String(value));
}

function arrayParam(values = []) {
  return sc.ContractParam.array(...values);
}

function emptyByteArrayParam() {
  return sc.ContractParam.byteArray(u.HexString.fromHex("", true));
}

function userOpJsonParam({ targetContract, method, args = [], nonce = 0n, deadline = 0n, signatureHex = "" }) {
  return {
    type: "Struct",
    value: [
      { type: "Hash160", value: normalizeHash(targetContract) },
      { type: "String", value: String(method) },
      { type: "Array", value: args },
      { type: "Integer", value: String(nonce) },
      { type: "Integer", value: String(deadline) },
      { type: "ByteArray", value: `0x${sanitizeHex(signatureHex)}` },
    ],
  };
}

async function waitForAppLog(client, txid, label, timeoutMs = 180000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const appLog = await client.getApplicationLog(txid);
      if (appLog?.executions?.length) return appLog;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error(`${label}: timed out waiting for application log`);
}

function assertHalt(appLog, label) {
  const execution = appLog?.executions?.[0];
  if (!execution) throw new Error(`${label}: missing execution`);
  const vmState = String(execution.vmstate || execution.state || "");
  if (!vmState.includes("HALT")) {
    throw new Error(`${label}: expected HALT, got ${vmState} ${execution.exception || ""}`.trim());
  }
  return execution;
}

async function invokePersisted(client, contractHash, account, networkMagic, operation, params = [], signers = undefined) {
  const contract = new experimental.SmartContract(sanitizeHex(contractHash), {
    account,
    networkMagic,
    rpcAddress: RPC_URL,
    blocksTillExpiry: 200,
  });
  const txid = await contract.invoke(operation, params, signers);
  const appLog = await waitForAppLog(client, txid, operation);
  const execution = assertHalt(appLog, operation);
  return { txid, appLog, execution };
}

async function invokeRead(client, contractHash, operation, params = []) {
  const result = await client.invokeFunction(sanitizeHex(contractHash), operation, params);
  if (String(result?.state || "").includes("FAULT")) {
    throw new Error(`${operation} fault: ${result.exception || "VM fault"}`);
  }
  return result?.stack?.[0];
}

function decodeIntStack(item) {
  return BigInt(item?.value || "0");
}

function decodeByteStringHex(item) {
  if (!item || item.type !== "ByteString" || !item.value) return "";
  return Buffer.from(item.value, "base64").toString("hex");
}

async function runPhalaRemoteShell(shellScript, { maxBuffer = 10 * 1024 * 1024 } = {}) {
  let lastError = null;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "morpheus-phala-"));
  const localScriptPath = path.join(tempDir, "remote.sh");
  await writeFile(localScriptPath, shellScript, { mode: 0o700 });
  for (let attempt = 1; attempt <= PHALA_SSH_RETRIES; attempt += 1) {
    const remoteScriptPath = `/tmp/morpheus-paymaster-${Date.now()}-${attempt}.sh`;
    try {
      await execFileAsync(
        "phala",
        ["cp", "--api-token", PAYMASTER_API_TOKEN, localScriptPath, `${PAYMASTER_APP_ID}:${remoteScriptPath}`],
        { maxBuffer },
      );
      const result = await execFileAsync(
        "phala",
        ["ssh", "--api-token", PAYMASTER_API_TOKEN, PAYMASTER_APP_ID, "--", "sh", remoteScriptPath],
        { maxBuffer },
      );
      await execFileAsync(
        "phala",
        ["ssh", "--api-token", PAYMASTER_API_TOKEN, PAYMASTER_APP_ID, "--", "rm", "-f", remoteScriptPath],
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
  const shellScript = `
set -e
WORKER_CONTAINER="$(docker ps --format '{{.Names}}' | grep 'phala-worker' | head -n1)"
test -n "$WORKER_CONTAINER"
docker exec -i "$WORKER_CONTAINER" node --input-type=module - <<'JS'
const body = JSON.parse(Buffer.from('${bodyBase64}', 'base64').toString('utf8'));
const token = process.env.PHALA_API_TOKEN || process.env.PHALA_SHARED_SECRET;
const res = await fetch('http://127.0.0.1:8080/paymaster/authorize', {
  method: 'POST',
  headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
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

async function updateRemotePaymasterAccount(accountId) {
  const normalized = normalizeHash(accountId).toLowerCase();
  const shellScript = `
set -e
file="/dstack/.host-shared/.decrypted-env"
current="$(grep '^MORPHEUS_PAYMASTER_TESTNET_ALLOW_ACCOUNTS=' "$file" | sed 's/^MORPHEUS_PAYMASTER_TESTNET_ALLOW_ACCOUNTS=//')"
if [ -z "$current" ]; then
  next="${normalized}"
else
  case ",$current," in
    *",${normalized},"*) next="$current" ;;
    *) next="$current,${normalized}" ;;
  esac
fi
dapps="$(grep '^MORPHEUS_PAYMASTER_TESTNET_ALLOW_DAPPS=' "$file" | sed 's/^MORPHEUS_PAYMASTER_TESTNET_ALLOW_DAPPS=//')"
if [ -z "$dapps" ]; then
  next_dapps="${PAYMASTER_DAPP_ID}"
else
  case ",$dapps," in
    *",${PAYMASTER_DAPP_ID},"*) next_dapps="$dapps" ;;
    *) next_dapps="$dapps,${PAYMASTER_DAPP_ID}" ;;
  esac
fi
runtime="$(grep '^MORPHEUS_RUNTIME_CONFIG_JSON=' "$file" | sed 's/^MORPHEUS_RUNTIME_CONFIG_JSON=//')"
runtime="$(printf '%s' "$runtime" | sed "s/^'//" | sed "s/'\$//" | sed 's/^"//' | sed 's/"$//' | sed 's/\\"/"/g')"
runtime="$(printf '%s' "$runtime" | sed "s#\"MORPHEUS_PAYMASTER_TESTNET_ENABLED\":\"[^\"]*\"#\"MORPHEUS_PAYMASTER_TESTNET_ENABLED\":\"true\"#g")"
runtime="$(printf '%s' "$runtime" | sed "s#\"MORPHEUS_PAYMASTER_TESTNET_POLICY_ID\":\"[^\"]*\"#\"MORPHEUS_PAYMASTER_TESTNET_POLICY_ID\":\"testnet-aa\"#g")"
runtime="$(printf '%s' "$runtime" | sed "s#\"MORPHEUS_PAYMASTER_TESTNET_ALLOW_DAPPS\":\"[^\"]*\"#\"MORPHEUS_PAYMASTER_TESTNET_ALLOW_DAPPS\":\"$next_dapps\"#g")"
runtime="$(printf '%s' "$runtime" | sed "s#\"MORPHEUS_PAYMASTER_TESTNET_ALLOW_ACCOUNTS\":\"[^\"]*\"#\"MORPHEUS_PAYMASTER_TESTNET_ALLOW_ACCOUNTS\":\"$next\"#g")"
for kv in \
  "MORPHEUS_PAYMASTER_TESTNET_ENABLED=true" \
  "MORPHEUS_PAYMASTER_TESTNET_POLICY_ID=testnet-aa" \
  "MORPHEUS_PAYMASTER_TESTNET_ALLOW_DAPPS=$next_dapps" \
  "MORPHEUS_PAYMASTER_TESTNET_ALLOW_ACCOUNTS=$next"
do
  key="\${kv%%=*}"
  value="\${kv#*=}"
  if grep -q "^$key=" "$file"; then
    sed -i "s#^$key=.*#$key=$value#" "$file"
  else
    printf '%s=%s\\n' "$key" "$value" >> "$file"
  fi
done
if grep -q '^MORPHEUS_RUNTIME_CONFIG_JSON=' "$file"; then
  sed -i "s#^MORPHEUS_RUNTIME_CONFIG_JSON=.*#MORPHEUS_RUNTIME_CONFIG_JSON='$runtime'#" "$file"
else
  printf "MORPHEUS_RUNTIME_CONFIG_JSON='%s'\\n" "$runtime" >> "$file"
fi
cd /dstack
MORPHEUS_LOCAL_ENV_FILE=/dstack/.host-shared/.decrypted-env docker compose --env-file /dstack/.host-shared/.decrypted-env -f /dstack/docker-compose.yaml up -d
`;
  await runPhalaRemoteShell(shellScript, { maxBuffer: 20 * 1024 * 1024 });
}

async function waitForRemotePaymasterAccount(accountId, timeoutMs = 180000) {
  const normalized = normalizeHash(accountId).toLowerCase();
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await callRemotePaymaster({
      network: "testnet",
      target_chain: "neo_n3",
      account_id: normalized,
      dapp_id: PAYMASTER_DAPP_ID,
      target_contract: normalizeHash(CORE_HASH),
      method: "executeUserOp",
      userop_target_contract: normalizeHash(GAS_HASH),
      userop_method: "symbol",
      estimated_gas_units: 2_000_000,
      operation_hash: `0x${Buffer.from(randomBytes(32)).toString("hex")}`,
    });
    const allowAccounts = Array.isArray(result?.body?.policy?.allow_accounts)
      ? result.body.policy.allow_accounts.map((value) => String(value).toLowerCase())
      : [];
    if (allowAccounts.includes(normalized)) {
      return result.body;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`timed out waiting for remote paymaster allowlist update for ${normalized}`);
}

async function startPaymasterProxy() {
  const sockets = new Set();
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
    if (req.url !== "/paymaster") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }
    try {
      const remote = await callRemotePaymaster(body);
      res.writeHead(Number(remote.status || 200), { "content-type": "application/json" });
      res.end(JSON.stringify(remote.body || {}));
    } catch (error) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    server,
    endpoint: `http://127.0.0.1:${port}/paymaster`,
    async close() {
      for (const socket of sockets) {
        socket.destroy();
      }
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

async function main() {
  const account = new wallet.Account(TEST_WIF);
  const rpcClient = new rpc.RPCClient(RPC_URL);
  const version = await rpcClient.getVersion();
  const networkMagic = Number(version.protocol.network);
  const aaClient = new AbstractAccountClient(RPC_URL, CORE_HASH);

  const accountId = sanitizeHex(PAYMASTER_ACCOUNT_ID || Buffer.from(randomBytes(20)).toString("hex"));
  const evmSigner = ethers.Wallet.createRandom();
  const verifierPubKey = sanitizeHex(evmSigner.signingKey.publicKey);

  console.log(JSON.stringify({
    rpc: RPC_URL,
    coreHash: normalizeHash(CORE_HASH),
    verifierHash: normalizeHash(WEB3AUTH_VERIFIER_HASH),
    relayAddress: account.address,
    relayScriptHash: normalizeHash(account.scriptHash),
    accountId: normalizeHash(accountId),
    verifierPubKey: `0x${verifierPubKey}`,
  }, null, 2));

  let register = null;
  try {
    register = await invokePersisted(
      rpcClient,
      CORE_HASH,
      account,
      networkMagic,
      "registerAccount",
      [
        hash160Param(accountId),
        hash160Param("0".repeat(40)),
        emptyByteArrayParam(),
        hash160Param("0".repeat(40)),
        hash160Param(account.scriptHash),
        integerParam(1),
      ],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Account already exists")) throw error;
    console.log(`registerAccount skipped for existing account ${normalizeHash(accountId)}`);
  }

  const updateVerifier = await invokePersisted(
    rpcClient,
    CORE_HASH,
    account,
    networkMagic,
    "updateVerifier",
    [
      hash160Param(accountId),
      hash160Param(WEB3AUTH_VERIFIER_HASH),
      byteArrayParam(verifierPubKey),
    ],
  );

  console.log(JSON.stringify({
    registerTxid: register?.txid || null,
    updateVerifierTxid: updateVerifier.txid,
  }, null, 2));

  if (!SKIP_PAYMASTER_ALLOWLIST_UPDATE) {
    console.log("Updating remote paymaster allowlist...");
    await updateRemotePaymasterAccount(accountId);
    const paymasterPolicy = await waitForRemotePaymasterAccount(accountId);
    console.log(JSON.stringify({
      paymasterPolicyId: paymasterPolicy?.policy_id || null,
      allowAccounts: paymasterPolicy?.policy?.allow_accounts || [],
    }, null, 2));
  }
  const paymasterProxy = await startPaymasterProxy();

  const nonce = decodeIntStack(await invokeRead(rpcClient, CORE_HASH, "getNonce", [hash160Param(accountId), integerParam(0)]));
  const argsHashHex = await aaClient.computeArgsHash([]);
  const deadline = BigInt(Date.now() + (60 * 60 * 1000));
  const typedData = buildV3UserOperationTypedData({
    chainId: networkMagic,
    verifyingContract: sanitizeHex(WEB3AUTH_VERIFIER_HASH),
    accountIdHash: accountId,
    targetContract: sanitizeHex(GAS_HASH),
    method: "symbol",
    argsHashHex,
    nonce,
    deadline,
  });
  const signature = ethers.Signature.from(await evmSigner.signTypedData(typedData.domain, typedData.types, typedData.message));
  const compactSignature = `${sanitizeHex(signature.r)}${sanitizeHex(signature.s)}`;

  const response = createResponse();
  const snapshot = {
    AA_RELAY_RPC_URL: process.env.AA_RELAY_RPC_URL,
    AA_RELAY_WIF: process.env.AA_RELAY_WIF,
    AA_RELAY_ALLOWED_HASH: process.env.AA_RELAY_ALLOWED_HASH,
    MORPHEUS_NETWORK: process.env.MORPHEUS_NETWORK,
    MORPHEUS_PAYMASTER_TESTNET_ENDPOINT: process.env.MORPHEUS_PAYMASTER_TESTNET_ENDPOINT,
  };

  process.env.AA_RELAY_RPC_URL = RPC_URL;
  process.env.AA_RELAY_WIF = TEST_WIF;
  process.env.AA_RELAY_ALLOWED_HASH = normalizeHash(CORE_HASH);
  process.env.MORPHEUS_NETWORK = "testnet";
  process.env.MORPHEUS_PAYMASTER_TESTNET_ENDPOINT = paymasterProxy.endpoint;

  try {
    console.log("Submitting executeUserOp via AA relay with paymaster pre-authorization...");
    await relayHandler({
      method: "POST",
      headers: {},
      socket: { remoteAddress: `paymaster-relay-${Date.now()}` },
      body: {
        paymaster: {
          account_id: normalizeHash(accountId),
          dapp_id: PAYMASTER_DAPP_ID,
          operation_hash: `0x${Buffer.from(randomBytes(32)).toString("hex")}`,
        },
        metaInvocation: {
          scriptHash: normalizeHash(CORE_HASH),
          operation: "executeUserOp",
          args: [
            { type: "Hash160", value: normalizeHash(accountId) },
            userOpJsonParam({
              targetContract: normalizeHash(GAS_HASH),
              method: "symbol",
              args: [],
              nonce,
              deadline,
              signatureHex: compactSignature,
            }),
          ],
        },
      },
    }, response);
  } finally {
    process.env.AA_RELAY_RPC_URL = snapshot.AA_RELAY_RPC_URL;
    process.env.AA_RELAY_WIF = snapshot.AA_RELAY_WIF;
    process.env.AA_RELAY_ALLOWED_HASH = snapshot.AA_RELAY_ALLOWED_HASH;
    process.env.MORPHEUS_NETWORK = snapshot.MORPHEUS_NETWORK;
    process.env.MORPHEUS_PAYMASTER_TESTNET_ENDPOINT = snapshot.MORPHEUS_PAYMASTER_TESTNET_ENDPOINT;
    await paymasterProxy.close();
  }

  if (response.statusCode !== 200 || !response.payload?.txid) {
    throw new Error(`relay submission failed: ${JSON.stringify(response.payload || {}, null, 2)}`);
  }

  const appLog = await waitForAppLog(rpcClient, response.payload.txid, "relay executeUserOp");
  const execution = assertHalt(appLog, "relay executeUserOp");

  console.log(JSON.stringify({
    txid: response.payload.txid,
    paymaster: response.payload.paymaster || null,
    execution: {
      vmstate: execution.vmstate || execution.state || "",
      stack: execution.stack || [],
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
