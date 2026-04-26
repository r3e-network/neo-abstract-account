# V3 Testnet Validation Suite Report

Date: 2026-04-25T11:39:28.754Z

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
- Core hash: `0x5eb821438820b3851ecf21d52c90dccc1645b933`
- Web3Auth verifier: `0xa98c560db194754861561fd394c86d73bb7d0ef5`
- Whitelist hook: `0x42318bf614a8a66aaa183e04c17fcc14c8bc26d8`
- Account ID: `n/a`
- Virtual address: `n/a`

Transactions:

- registerAccount: `0xe80d91a0d248842a8c62696278bc01f9fcaf827920bd44a7e75ae65bdfd013d6`
- nativeExecute: `0xc5ef7c080316931b6c27504eaaf0a0e5a05730547406b99eb0c56581efb2dd0b`
- hookConfigRequest: `0x2c6e2a783d43cbc17d5890cbccfeed609c4e731b0980cf62526cb2aa49cc8825`
- verifierConfigRequest: `0x2fa55192af5ebf31f34c9e71103efddc9f27c199da0ad7959a2a14ea5e6f301f`
- evmExecute: `0x2833e1ca7b8e903b11bb8623071e31fdf49adb90e13ba1f7bdb462302621936b`

## Plugin Matrix Summary

- Report path: `sdk/docs/reports/v3-testnet-plugin-matrix.latest.json`
- Core hash: `0xf39c2ae666d96269c40e1cadfb3fb2835ef7880b`
- Mock target: `0x13c0d8c37049cf15a6d2a77355098106353c57d5`

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

- Core hash: `0x51684e2fbd89d92de10a95574607150dea6a3182`
- Market hash: `0x608350065fc71eb12f5e576aeb0c733fd4ed81d4`
- TEE verifier: `0x87ec0f240714105450c2334a19728d8ef2726f0f`
- Whitelist hook: `0x389872dc98de92e29e248f2669ab1fa493f2a672`
- Listing ID: `1`
- Account ID: `0x518bb49baf21cab379d0649641583168ba0e0413`
- Buyer recorded: `0x89314d980e464400df4317744b0f8126edd05cf5`
- Backup owner after sale: `0x89314d980e464400df4317744b0f8126edd05cf5`
- Listing status: `2`

## Paymaster On-Chain Summary

- Core hash: `0x983ef8a3d6ee92ec8cb5b4d43477d8eb1d6dbf0b`
- Verifier hash: `0x53614d570bb34c8c0667df8ff0c9064f175d13d6`
- Paymaster hash: `0xf9cba355635bd8cc3d5abe9ad30be686c1102687`
- Account ID: `0x1965c6dd066a0fb077fdd3d0c28b0e990f62a7bb`
- Sponsored txid: `0x004951b38e3c36fa9193aeac63655a665a0b53a863a648cc8437fdb4e0fed307`
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
- Attestation hash: `70c9e8aaaadad899bd98fa213ce9fef934e82a259c1a9dd00ae33ec449905f95`

Denied cases:

- missingOperationHash
- wrongDappId
- wrongAccountId
- wrongTargetContract
- wrongMethod
- gasTooHigh
- wrongTargetChain

## Paymaster Relay Summary

- Relay txid: `0x38e69a238084664d06ffc2da739d7cfeef10e4ec10c60e0df90d0df79d82ff7f`
- Account ID: `0x15ffdf7dc4b716216e28bd1e3a86d731ce65974e`
- Policy ID: `testnet-aa`
- Approval digest: `ecce6eddd0fe10ff4c1e3fa9399979444cde1e06e93a63505e7f39ec1629f5d4`
- Attestation hash: `a63b8c813dbac84ebbc7e23c3c017e15ece77552fc14bf6764a6f42ade9404de`
- CVM app id: `n/a`
- VM state: `HALT`

