# V3 Testnet Validation Suite Report

Date: 2026-04-25T04:56:44.830Z

## Environment

- RPC: `null`
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

- Address: `NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu`
- Core hash: `0x539220806839cb7ac42cf66bafd0ab720830aaf3`
- Web3Auth verifier: `0x798aec1f02ceab8c1724c29661e77faf9fca793e`
- Whitelist hook: `0x07bb3a80daaf29d82e12ec386a468f97efe6f070`
- Account ID: `n/a`
- Virtual address: `n/a`

Transactions:

- registerAccount: `0xd3d8917970eb852b844f0e1c59c440e3da789e1fe873ac93486976970dea40d3`
- nativeExecute: `0x2aae9ab6bfa871a8b8fb788c6d0ddee52d607d706eccea53f2374a99ac2a47fc`
- hookConfigRequest: `0xfd786c33095d90655d2edcde4a5b58d43889830231a588290920cb06cadce960`
- verifierConfigRequest: `0xba0b22881b2281d190a5ddbbc5f1007088030fc6b2c2cf6a85ae2df0815f19fa`
- evmExecute: `0x7e708976ef0a097ba98961ff5068850431caad18b6a74b907888c4f4a6ed7f33`

## Plugin Matrix Summary

- Report path: `sdk/docs/reports/v3-testnet-plugin-matrix.latest.json`
- Core hash: `0x332c7ce272e20f948d3fce0ea722d95c4136b360`
- Mock target: `0x721104f5d472700db234d196390e9ca3a70b5cfa`

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

- Core hash: `0x91f75721e7856ff6cd5760fe9d2159c08e344e3a`
- Market hash: `0xf654ed64164824a734102d2c2cadef677d7f75f6`
- TEE verifier: `0x35b4fd889b06e03032806c81c632558c0186699b`
- Whitelist hook: `0x1b4cff005b9f2413328bea714ebd3f1190c91759`
- Listing ID: `1`
- Account ID: `0x5fb565394a905be370f536473bc6da74b959543a`
- Buyer recorded: `0x2b7f1e207dca5bd3a70297e751b10fee260c38da`
- Backup owner after sale: `0x2b7f1e207dca5bd3a70297e751b10fee260c38da`
- Listing status: `2`

## Paymaster On-Chain Summary

- Core hash: `0xc9df2994e613d068fdf00fd2e6e185630a2573e6`
- Verifier hash: `0xb53f474d087a9bbb897b26682e48fccda6942d30`
- Paymaster hash: `0x3f9407e4a6bd721629d2498b725df1b85de5403a`
- Account ID: `0xa1684710c6501c7448c2f4e9382fd0708e758fca`
- Sponsored txid: `0x7113806c6c09e91c5b62395e7514cdba9a1938a93743f74a348b9b3fe5474ec5`
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
- Attestation hash: `24a9fb340d6ae378e586c822c81c9fdc1d2fe0268fd7b785e098a90580ade701`

Denied cases:

- missingOperationHash
- wrongDappId
- wrongAccountId
- wrongTargetContract
- wrongMethod
- gasTooHigh
- wrongTargetChain

## Paymaster Relay Summary

- Relay txid: `0xf2b3d59d5355e7f6583f944bc13afb88103f41fc4e1be05fc3bbd198a83c255c`
- Account ID: `0xce944e5de7cbaa098e2a96dbdac8bad66a5611e2`
- Policy ID: `testnet-aa`
- Approval digest: `7549989798d6f8443fb46e735df612c17dddd061573b9fbe2d5235bfdc866ecc`
- Attestation hash: `db52e6d69f022f14df29ac5139154feda25b1dd21c9ad35d9b2216c754ecb075`
- CVM app id: `n/a`
- VM state: `HALT`

