# V3 Testnet Validation Suite Report

Date: 2026-04-23T00:57:43.937Z

## Environment

- RPC: `null`
- Has TEST_WIF: `true`
- Has Morpheus runtime token: `true`
- Paymaster app id: `ddff154546fe22d15b65667156dd4b7c611e6093`
- Paymaster account override: `0x0c3146e78efc42bfb7d4cc2e06e3efd063c01c56`
- Skip allowlist update: `true`
- Has phala CLI: `true`

## Stages

- V3 Smoke: `ok`
- V3 Plugin Matrix: `ok`
- V3 Market Escrow: `ok`
- V3 Paymaster On-Chain: `ok`
- V3 Paymaster Policy: `ok`
- V3 Paymaster Relay: `ok`

## Smoke Summary

- Address: `NhMYxG5ATmRjSy6ocnPxrA2DiYba6xhFqu`
- Core hash: `0x0d35024659df2fc4a89efdce0ecc965d0113ee41`
- Web3Auth verifier: `0xbe68d48c34ebae2bb7f8a2bb523345efd6b1a059`
- Whitelist hook: `0xac1ea3fbd06c28f6b5da744b9dca89f83a7aaccd`
- Account ID: `n/a`
- Virtual address: `n/a`

Transactions:

- registerAccount: `0x0e76d82a1bf19920d12f3dc725c0909f9c378e9f7e043953157c9f803f845c95`
- nativeExecute: `0xd27cfea8b80e57d53320b8d1ee69625ac05ebd893cc42f6e2ac76835057dabbe`
- hookConfigRequest: `0x3a1aae6865da221b0b75dcf15760f3e4cb6ba608ae6b000598c725812093cf71`
- verifierConfigRequest: `0xaf534cb52e36e5a457da1589e39da5e092849b561198430a76547426a2547133`
- evmExecute: `0xf5c3b5ca14c273a322e8e471921d78e8e0bd952ac3028f8128ca0efad24d4827`

## Plugin Matrix Summary

- Report path: `sdk/docs/reports/v3-testnet-plugin-matrix.latest.json`
- Core hash: `0x44e7a615fc0b757fae43bd3c8cece3971e5d8bf9`
- Mock target: `0xe0106c6f55bac30ad6b872bb58a69a8c1c5c9fa7`

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

- Core hash: `0xee2e6a46c252e2c30c262895fe4dadfc0d344f78`
- Market hash: `0x69f701d81b4aeb39dac028cb95c8552416d704dc`
- TEE verifier: `0xcada8498aff56b19a27454fdaab9ca4e9e08e644`
- Whitelist hook: `0x1f0bcdf48b7d673245a2c9fb542745eb9cffd736`
- Listing ID: `1`
- Account ID: `0x0985ed8b1d2a91c843c0c38e126e20f2643a0b80`
- Buyer recorded: `0x4dddfc9499b4224550b70f2450a85c0e438a7e6a`
- Backup owner after sale: `0x4dddfc9499b4224550b70f2450a85c0e438a7e6a`
- Listing status: `2`

## Paymaster On-Chain Summary

- Core hash: `0xa1527392479e1870edfa8224b3af2dfa8a448a74`
- Verifier hash: `0xb32727ebbb07762ac4d80ef6c040923412a37509`
- Paymaster hash: `0xd8bb20fefda9e2786dd02e643e4b76bf1ad4cc1a`
- Account ID: `0xa44d473ef183f7d27204d0df8a9b0ff228d392a1`
- Sponsored txid: `0xf64555eee03d003fa5cbfd46e7205a7221ddd4bbeec8c92f7e1e62e97dad5b50`
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
- Attestation hash: `adb10cee5d217fcc64e64c5ad12e03c321ba0a936282ea3c5f0b987c1a485f11`

Denied cases:

- missingOperationHash
- wrongDappId
- wrongAccountId
- wrongTargetContract
- wrongMethod
- gasTooHigh
- wrongTargetChain

## Paymaster Relay Summary

- Relay txid: `0x2b784498cb4c9589d5da39a61a665970a57a166ea4351e7815db08dca1cd5b6f`
- Account ID: `0xa9f9b282f0897a5e2356d007a52ad51b3e8ce0e9`
- Policy ID: `testnet-aa`
- Approval digest: `edb4749bcd1862963b2778a89446311d9a569a07b3aaef789e690ff41fbe2c04`
- Attestation hash: `e15a571527626931f4e77976a838bfb32719f49081c623a40d44edf0e968f2b1`
- CVM app id: `ddff154546fe22d15b65667156dd4b7c611e6093`
- VM state: `HALT`

