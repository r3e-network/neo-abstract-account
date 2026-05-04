# V3 Testnet Validation Suite Report

Date: 2026-05-03T16:39:01.270Z

## Environment

- RPC: `https://api.n3index.dev/testnet`
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
- Core hash: `0xb23c81d20ce8fba031eb84ffb11b6a0cd4d7ecdf`
- Web3Auth verifier: `0x4c3430665c27ed7aa40d067dfec48d39210279f3`
- Whitelist hook: `0x835c5b6f48a1d077282c4cab3b1e9ba7833ba82a`
- Account ID: `n/a`
- Virtual address: `n/a`

Transactions:

- registerAccount: `0x1ceb20f99d0797ccfd9305c222a791355ba84efc9b48d93539c19dc58f93e5e9`
- nativeExecute: `0x04441ed6d2f37c3a400adc407fc84f7f4e13f5a4899bcea8a0af271a2c4b5662`
- hookConfigRequest: `0xd5db8d9a79bbd666c0a685fa8859d04a4f230a64e65c8a31d817f3bd398eb1c0`
- verifierConfigRequest: `0xb82bec4aece35aa08d91d0e16018c8279d4a6062a81264360cafbbc02147b308`
- evmExecute: `0x68a73f3925a865830a98656e8ecf68c3c0a912611a2f06cbd3802c46b34650ea`

## Plugin Matrix Summary

- Report path: `sdk/docs/reports/v3-testnet-plugin-matrix.latest.json`
- Core hash: `0xda79db758ec25a1248b985fb319b2aa769851b43`
- Mock target: `0x276242e301fb175f60c294be9b5f219ff46b141a`

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

- Core hash: `0x35ca288c6c3785f44bf432fbf4969787a81586b5`
- Market hash: `0xb8b9ea9783795376a8e9a92385de5b6b72a73c84`
- TEE verifier: `0xacdc3d87b1e38bd0d63c81fcbab5d3be8fcf2052`
- Whitelist hook: `0x8bc94d124ba252d58460db3320bb766c252ef49f`
- Listing ID: `1`
- Account ID: `0x7916a29286be82c49197f05a03eb6293eb36678f`
- Buyer recorded: `0x689838dcd0e89d6679d786860a59f583e12c5abd`
- Backup owner after sale: `0x689838dcd0e89d6679d786860a59f583e12c5abd`
- Listing status: `2`

## Paymaster On-Chain Summary

- Core hash: `0x8ad10eb7bdabfba345f77ec793c29f887a9e02a6`
- Verifier hash: `0x9c141cf65093a20bc91bc90f60086523d4265607`
- Paymaster hash: `0xcf5dc5d1e2734f161e3e814cb83a608740df37ca`
- Account ID: `0x9be49639b4172f4441e0c2c06209bf08d9112ae2`
- Sponsored txid: `0x9e85a1b6d34883f98d59f473191ce11ce80cacf6d911736f3d79edf1a7c67331`
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
- Attestation hash: `b0b8a230c6d8a75da3460e6738cb621a04404677c848150089ca85f298d4155d`

Denied cases:

- missingOperationHash
- wrongDappId
- wrongAccountId
- wrongTargetContract
- wrongMethod
- gasTooHigh
- wrongTargetChain

## Paymaster Relay Summary

- Relay txid: `0x15adb53a33dfbc90923e0d2a22454cb6b5e1caad8abe00e00c3252766ec59b16`
- Account ID: `0x15ffdf7dc4b716216e28bd1e3a86d731ce65974e`
- Policy ID: `testnet-aa`
- Approval digest: `7ede1a99b3d49ff9ba2fe536441e3e440a79a55708225e2c64b0173639e66db8`
- Attestation hash: `50b0ff07b7be9ea24e58f023967837ae9b0ec3c76d0eb7429d97dbd403b9cc8c`
- CVM app id: `n/a`
- VM state: `HALT`

