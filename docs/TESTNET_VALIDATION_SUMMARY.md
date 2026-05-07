# V3 Testnet Validation Suite Report

Date: 2026-05-07T10:10:47.666Z

## Environment

- RPC: `https://testnet1.neo.coz.io:443`
- Has TEST_WIF: `true`
- Has Morpheus runtime token: `true`
- Paymaster app id: `ddff154546fe22d15b65667156dd4b7c611e6093`
- Paymaster account override: `none`
- Skip allowlist update: `false`
- Has phala CLI: `true`

## Stages

- V3 Smoke: `ok`
- V3 Plugin Matrix: `ok`
- V3 Market Escrow: `ok`
- V3 Paymaster On-Chain: `ok`
- V3 Paymaster Policy: `ok`
- V3 Paymaster Relay: `ok`

## Smoke Summary

- Address: `NR3E4D8NUXh3zhbf5ZkAp3rTxWbQqNih32`
- Core hash: `0xb567391f711f8b7f363cc6625b6f100d303fc95f`
- Web3Auth verifier: `0x9eb2940e93fceb98c104eabe4e6b03b0ae0a40c6`
- Whitelist hook: `0xd2e5fc7cc2936d20d8b9f20960e8a77381a9fbb1`
- Account ID: `n/a`
- Virtual address: `n/a`

Transactions:

- registerAccount: `0x5125450b223d0b3b637d3f01842394297f8ea39eed57e4312b401712fc3ee65e`
- nativeExecute: `0xf443d8c35a0ef0b65b5851c4cfdae6541ba5486bc3048e619486e89e223ebb87`
- hookConfigRequest: `0x3b579a29f3c8e05a0bd9d169bf43725987b3f9810a767bd1fe340892f40f55e3`
- verifierConfigRequest: `0x3140f548ca388b7780e8857b56289dd20347fd7bada021545d98df22b543dc9e`
- evmExecute: `0x9d641c5e224361e63513d0ec9fe7adf21b8ba723f0122cd25e8bff8d1ab3a605`

## Plugin Matrix Summary

- Report path: `sdk/docs/reports/v3-testnet-plugin-matrix.latest.json`
- Core hash: `0xe5236013196d38752d9a761eec508b4efbd0081a`
- Mock target: `0xfa9ddeca4383d7ea8d3008aab141eb2d32c85b6f`

Scenarios:

- directConfigGuards
- web3Auth
- teeVerifier
- webAuthnVerifier
- sessionKeyVerifier
- multiSigVerifier
- subscriptionVerifier
- zkEmailVerifier
- whitelistHook
- dailyLimitHook
- tokenRestrictedHook
- multiHook
- neoDidCredentialHook

## Market Escrow Summary

- Core hash: `0xc1108e9bd756dd07b6ee604139609cd3dacd67d1`
- Market hash: `0x562c06c56fa21e11ef2625485bd6c67e3e99cb87`
- TEE verifier: `0x7790371c92047b32e596eda0f49fd399f3630b60`
- Whitelist hook: `0xfc9d0388c81837359b7db636c0dd7e67365d80aa`
- Listing ID: `1`
- Account ID: `0x9efc40c3379c9c9aeaa331bc962329d67b5e18a1`
- Buyer recorded: `0x8ddb288f3ff8692c0348f9b71037141e13e61f81`
- Backup owner after sale: `0x8ddb288f3ff8692c0348f9b71037141e13e61f81`
- Listing status: `2`

## Paymaster On-Chain Summary

- Core hash: `0x106a58a17df6cad8d85908237dc53a5eceed5402`
- Verifier hash: `0x5753807c35c78b03ab9bf9c553bdb91b7d467946`
- Paymaster hash: `0x4bfca4aa88fc73876434e99b02f21e65899b4a65`
- Account ID: `0x9a62ce9353a438b44abe1989195e136e2f63bda6`
- Sponsored txid: `0x13de5b0d8a1cbfa855a11061fd058bc2a1f7f89ed6655705b6dd3f832750206c`
- Sponsored result: `GAS`
- Deposit before: `200000000`
- Deposit after: `190000000`
- Reimbursement: `10000000`
- Over-limit rejected: `true`
- Revoked rejected: `true`
- Withdraw success: `true`

## Paymaster Policy Summary

- Report path: `sdk/docs/reports/v3-testnet-paymaster-policy.latest.json`
- Policy ID: `testnet-aa`
- Account ID: `0x0c3146e78efc42bfb7d4cc2e06e3efd063c01c56`
- Approval digest: `4e6f87401838f21de14798e50a6eee0182c5a0877fd8461a306cb686254c1d49`
- Attestation hash: `e9a1a4581ed3f01a853f124c915b2304ec2bbe3d45f676259688ba355fe3f7b6`

Denied cases:

- missingOperationHash
- wrongDappId
- wrongAccountId
- wrongTargetContract
- wrongMethod
- gasTooHigh
- wrongTargetChain

## Paymaster Relay Summary

- Relay txid: `0xfb8b957060e94c3383bb261721df71f0d52c6e5da7e1c826114ee48fba18979d`
- Account ID: `0x15ffdf7dc4b716216e28bd1e3a86d731ce65974e`
- Policy ID: `testnet-aa`
- Approval digest: `6798597a22d575f8269efffc3746bd051b80cb3e5f32eeaec8aa91d27cff4ced`
- Attestation hash: `5f7771b10a3ce9c27b72a690cc1785c731961fb3d13ad066233de1e3756ae336`
- CVM app id: `n/a`
- VM state: `HALT`

