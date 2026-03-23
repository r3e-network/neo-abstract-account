const {
  OpCode,
  RpcClient: CoreRpcClient,
  Signer: CoreSigner,
  WitnessScope,
  gasContractHash,
  neoContractHash,
  oracleContractHash,
  policyContractHash,
  reverseHex,
  hash160,
  stdlibContractHash,
} = require("@r3e/neo-js-sdk");
const { Account: BaseAccount } = require("@r3e/neo-js-sdk");
const { ContractParam } = require("@r3e/neo-js-sdk/compat/contract-param");
const { HexString } = require("@r3e/neo-js-sdk/compat/u");
const { createScript, ScriptBuilder: BaseScriptBuilder } = require("@r3e/neo-js-sdk/compat/sc");
const { Transaction: BaseTransaction, Witness } = require("@r3e/neo-js-sdk/compat/tx");
const {
  getAddressFromScriptHash,
  getPrivateKeyFromWIF,
  getScriptHashFromAddress,
  getWIFFromPrivateKey,
  isAddress,
  isPrivateKey,
  isPublicKey,
  isWIF,
  publicKeyFromPrivateKey,
  randomPrivateKeyHex,
  signHex,
  verifyHex,
} = require("@r3e/neo-js-sdk/compat/wallet-helpers");

const CONTRACT_MANAGEMENT_HASH = "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd";

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function strip0x(value) {
  return trimString(value).replace(/^0x/i, "");
}

function normalizeHash(value) {
  const raw = trimString(String(value ?? ""));
  if (!raw) return raw;
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

function normalizeSignerAccount(account) {
  return strip0x(String(account ?? ""));
}

function normalizeParam(param) {
  if (param && typeof param.toJSON === "function") return param.toJSON();
  if (param && typeof param.toJson === "function") return param.toJson();
  return param;
}

function normalizeParams(params = []) {
  return params.map((param) => normalizeParam(param));
}

function normalizeSigners(signers = []) {
  return signers.map((signer) => {
    if (signer instanceof CoreSigner && typeof signer.toJSON === "function") {
      const json = signer.toJSON();
      return { ...json, account: normalizeSignerAccount(json.account) };
    }
    return { ...signer, account: normalizeSignerAccount(signer.account) };
  });
}

function defaultSigners(account) {
  if (!account) return [];
  return [{ account: account.scriptHash, scopes: "CalledByEntry" }];
}

function resolveSigningKey(accountOrKey) {
  if (typeof accountOrKey === "string") return accountOrKey;
  if (accountOrKey?.WIF) return accountOrKey.WIF;
  if (accountOrKey?.privateKey) return accountOrKey.privateKey;
  throw new Error("account is required");
}

function checksumFromNefBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return 0;
  return buffer.readUInt32LE(buffer.length - 4);
}

function decimalToBigInt(input, decimals = 0) {
  const raw = String(input ?? "0").trim();
  if (!raw) return 0n;
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, fraction = ""] = unsigned.split(".");
  const normalized = `${whole || "0"}${fraction.padEnd(decimals, "0").slice(0, decimals)}`.replace(/^0+/, "") || "0";
  const value = BigInt(normalized);
  return negative ? -value : value;
}

function toHexScript(value) {
  if (value instanceof HexString) return value.toBigEndian();
  const raw = trimString(String(value ?? ""));
  if (!raw) return "";
  if (/^(0x)?[0-9a-f]+$/i.test(raw)) return strip0x(raw);
  return Buffer.from(raw, "base64").toString("hex");
}

async function estimateNetworkFee(rpcClient, transaction) {
  try {
    const result = await rpcClient.inner.calculateNetworkFee({ tx: transaction.serialize(true) });
    return BigInt(result?.networkfee || 0);
  } catch {
    return 5000000n;
  }
}

class Account extends BaseAccount {
  static fromWIF(wif) {
    return new Account(wif);
  }

  get publicKey() {
    const value = super.publicKey;
    return typeof value?.toString === "function" ? value.toString() : value;
  }
}

class ScriptBuilder extends BaseScriptBuilder {
  emitAppCall(scriptHash, operation, args = []) {
    return this.emitContractCall({ scriptHash, operation, args });
  }
}

class Transaction extends BaseTransaction {
  static deserialize(value) {
    const raw = trimString(String(value ?? ""));
    if (!raw) throw new Error("transaction payload required");
    if (/^(0x)?[0-9a-f]+$/i.test(raw) && strip0x(raw).length % 2 === 0) {
      return BaseTransaction.deserialize(strip0x(raw));
    }
    return BaseTransaction.deserialize(Buffer.from(raw, "base64").toString("hex"));
  }

  sign(accountOrKey, networkMagic) {
    return super.sign(resolveSigningKey(accountOrKey), networkMagic);
  }
}

class Query {
  constructor({ method, params = [] } = {}) {
    this.method = method;
    this.params = params;
  }
}

class RPCClient {
  constructor(rpcAddress) {
    this.inner = new CoreRpcClient(rpcAddress);
  }

  async execute(query) {
    return this.inner.send(query.method, query.params);
  }

  async getVersion() {
    return this.inner.getVersion();
  }

  async getBlockCount() {
    return this.inner.getBlockCount();
  }

  async getBlock(indexOrHash, verbose = 1) {
    return this.inner.send("getblock", [indexOrHash, verbose]);
  }

  async getApplicationLog(txid, trigger) {
    return this.inner.getApplicationLog({ hash: normalizeHash(txid), trigger });
  }

  async invokeFunction(scriptHash, operation, args = [], signers = undefined) {
    const params = [normalizeHash(scriptHash), operation, normalizeParams(args)];
    if (Array.isArray(signers) && signers.length) {
      params.push(normalizeSigners(signers));
    }
    return this.inner.send("invokefunction", params);
  }

  async invokeScript(script, signers = undefined) {
    const params = [toHexScript(script)];
    if (Array.isArray(signers) && signers.length) {
      params.push(normalizeSigners(signers));
    }
    return this.inner.send("invokescript", params);
  }

  async calculateNetworkFee(transaction) {
    const tx = typeof transaction?.serialize === "function" ? transaction.serialize(true) : transaction?.tx || transaction;
    const result = await this.inner.calculateNetworkFee({ tx });
    return BigInt(result?.networkfee || 0);
  }

  async sendRawTransaction(transaction) {
    const tx = typeof transaction?.serialize === "function" ? transaction.serialize(true) : transaction?.tx || transaction;
    const result = await this.inner.sendRawTransaction({ tx });
    return typeof result === "string" ? result : result?.hash;
  }
}

class NefFileCompat {
  constructor(bytes) {
    this.bytes = Buffer.from(bytes);
    this.checksum = checksumFromNefBytes(this.bytes);
  }

  static fromBuffer(bytes) {
    return new NefFileCompat(bytes);
  }

  serialize() {
    return this.bytes.toString("hex");
  }
}

class ContractManifestCompat {
  constructor(json) {
    this.json = json;
    this.name = json?.name || "";
  }

  static fromJson(json) {
    return new ContractManifestCompat(json);
  }

  toJson() {
    return this.json;
  }
}

async function setBlockExpiry(transaction, config, blocksTillExpiry) {
  const rpcClient = new RPCClient(config.rpcAddress);
  const lifespan = Number(blocksTillExpiry || config.blocksTillExpiry || 100);
  transaction.validUntilBlock = (await rpcClient.getBlockCount()) + lifespan - 1;
}

async function addFees(transaction, config) {
  transaction.networkFee = await estimateNetworkFee(new RPCClient(config.rpcAddress), transaction);
}

async function deployContract(nef, manifest, config) {
  const rpcClient = new RPCClient(config.rpcAddress);
  const signers = defaultSigners(config.account);
  const nefBytes =
    nef?.bytes instanceof Uint8Array || Buffer.isBuffer(nef?.bytes)
      ? Buffer.from(nef.bytes)
      : Buffer.from(strip0x(typeof nef?.serialize === "function" ? nef.serialize() : String(nef || "")), "hex");
  const manifestJson = typeof manifest?.toJson === "function" ? manifest.toJson() : manifest;
  const preview = await rpcClient.invokeFunction(
    CONTRACT_MANAGEMENT_HASH,
    "deploy",
    [
      { type: "ByteArray", value: nefBytes.toString("base64") },
      { type: "String", value: JSON.stringify(manifestJson) },
    ],
    signers,
  );
  if (String(preview?.state || "").includes("FAULT")) {
    throw new Error(preview?.exception || "deploy preview failed");
  }
  const validUntilBlock = (await rpcClient.getBlockCount()) + (config.blocksTillExpiry || 100) - 1;
  const transaction = new Transaction({
    signers,
    validUntilBlock,
    script: Buffer.from(preview.script, "base64").toString("hex"),
    systemFee: decimalToBigInt(preview.gasconsumed || "0", 0),
  });
  await addFees(transaction, config);
  transaction.sign(config.account, config.networkMagic);
  return rpcClient.sendRawTransaction(transaction);
}

function getContractHash(sender, nefChecksum, contractName) {
  const script = new ScriptBuilder()
    .emit(OpCode.ABORT)
    .emitPush(HexString.fromHex(strip0x(String(sender))))
    .emitPush(nefChecksum)
    .emitPush(contractName)
    .build();
  return reverseHex(hash160(script));
}

class SmartContract {
  constructor(contractHash, config) {
    this.contractHash = normalizeHash(contractHash);
    this.config = config;
    this.account = config.account;
    this.rpcClient = new RPCClient(config.rpcAddress);
  }

  async testInvoke(operation, args = [], signers = undefined) {
    return this.rpcClient.invokeFunction(this.contractHash, operation, args, signers);
  }

  async invoke(operation, args = [], signers = undefined) {
    const preview = await this.testInvoke(operation, args, signers);
    if (String(preview?.state || "").includes("FAULT")) {
      throw new Error(preview?.exception || `${operation} preview failed`);
    }
    const transaction = new Transaction({
      signers: Array.isArray(signers) && signers.length ? signers : defaultSigners(this.config.account),
      validUntilBlock: (await this.rpcClient.getBlockCount()) + (this.config.blocksTillExpiry || 100) - 1,
      script: Buffer.from(preview.script, "base64").toString("hex"),
      systemFee: decimalToBigInt(preview.gasconsumed || "0", 0),
    });
    await addFees(transaction, this.config);
    transaction.sign(this.config.account, this.config.networkMagic);
    return this.rpcClient.sendRawTransaction(transaction);
  }
}

ContractParam.bool = ContractParam.boolean;

const rpc = {
  RPCClient,
  Query,
};

const sc = {
  ContractParam,
  ScriptBuilder,
  createScript,
  NEF: NefFileCompat,
  ContractManifest: ContractManifestCompat,
};

const u = {
  HexString,
  reverseHex,
  hash160,
  BigInteger: {
    fromNumber(value) {
      return BigInt(Math.trunc(Number(value)));
    },
    fromDecimal(value, decimals = 0) {
      return decimalToBigInt(value, decimals);
    },
  },
};

const wallet = {
  Account,
  getAddressFromScriptHash,
  getScriptHashFromAddress,
  getPrivateKeyFromWIF,
  getWIFFromPrivateKey,
  getPublicKeyFromPrivateKey: publicKeyFromPrivateKey,
  isAddress,
  isWIF,
  isPrivateKey,
  isPublicKey,
  sign: signHex,
  generateSignature: signHex,
  generatePrivateKey: randomPrivateKeyHex,
  verify: verifyHex,
};

const tx = {
  Transaction,
  Signer: CoreSigner,
  Witness,
  WitnessScope,
};

const experimental = {
  SmartContract,
  deployContract,
  getContractHash,
  txHelpers: {
    setBlockExpiry,
    addFees,
  },
};

const CONST = {
  NATIVE_CONTRACT_HASH: {
    GasToken: gasContractHash().toString(),
    NeoToken: neoContractHash().toString(),
    OracleContract: oracleContractHash().toString(),
    PolicyContract: policyContractHash().toString(),
    ManagementContract: CONTRACT_MANAGEMENT_HASH,
    StdLib: stdlibContractHash().toString(),
  },
};

module.exports = {
  rpc,
  sc,
  u,
  wallet,
  tx,
  experimental,
  CONST,
};
