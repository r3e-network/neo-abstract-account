# V3 Testnet Validation Suite Report

Date: 2026-03-25T00:50:55.597Z

## Environment

- RPC: `https://testnet1.neo.coz.io:443`
- Has TEST_WIF: `true`
- Has Morpheus runtime token: `true`
- Paymaster app id: `ddff154546fe22d15b65667156dd4b7c611e6093`
- Paymaster account override: `0x0c3146e78efc42bfb7d4cc2e06e3efd063c01c56`
- Skip allowlist update: `false`

## Stages

- V3 Smoke: `ok`
- V3 Plugin Matrix: `ok`
- V3 Paymaster Policy: `ok`
- V3 Paymaster Relay: `ok`

## Smoke Summary

- Address: `NhMYxG5ATmRjSy6ocnPxrA2DiYba6xhFqu`
- Core hash: `0x7502b8379b3e8c3e65788b840371522d6bab8528`
- Web3Auth verifier: `0x712230147d51e15e153c06c768ae61aa04009e26`
- Whitelist hook: `0x960c555f4b2306f814e5307edfe6be81e6d36c5c`
- Account ID: `0x6211dda3009fd99bce5e081541a4f5eea5ef9dad`
- Virtual address: `NQDZp82ebUkVmUBgbf9iC8CRopURsiCytr`

Transactions:

- registerAccount: `0x8002ff0dc438952efc0aa6c9e69532bdc58697813bdd9be64233ae9771b73654`
- nativeExecute: `0xc0b497ab58249021b3a8b1ffb9b716f91f1d1df455f2d6c602553ebcbc3ff244`
- hookExecute: `0xd75a408b411716e4d4a4fc1e68b33374e1cb170feaed6482ac2a9a542a8b5747`
- evmExecute: `0xbb290ab5e2b2168039e5ab45775d1145068827aecc14badd20f510ec672eeb16`

## Plugin Matrix Summary

- Report path: `sdk/docs/reports/v3-testnet-plugin-matrix.latest.json`
- Core hash: `0xd8906d8d5a0b172c9e57447ad318bb57235bce96`
- Mock target: `0x04cd3948fd1b3785e99dca0e7a40286e079c7747`

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

## Paymaster Policy Summary

- Report path: `sdk/docs/reports/v3-testnet-paymaster-policy.latest.json`
- Policy ID: `testnet-aa`
- Account ID: `0x0c3146e78efc42bfb7d4cc2e06e3efd063c01c56`
- Approval digest: `4e6f87401838f21de14798e50a6eee0182c5a0877fd8461a306cb686254c1d49`
- Attestation hash: `f7d5a111630f242c0826a93c69ca07285d3def37e7382ac79f98a876190d4781`

Denied cases:

- missingOperationHash
- wrongDappId
- wrongAccountId
- wrongTargetContract
- wrongMethod
- gasTooHigh
- wrongTargetChain

## Paymaster Relay Summary

- Relay txid: `0x7ad0d70e86f1cbaaaaba1c0c68e04587371c2e65bfe09da448802a8c35bd1b06`
- Account ID: `0x0c3146e78efc42bfb7d4cc2e06e3efd063c01c56`
- Policy ID: `testnet-aa`
- Approval digest: `6cfd2f4504fda5d5e93f73ab4a7431bb74c5def76f393973378c55c5975f3e7f`
- Attestation hash: `5537adb66ba861d5c664e3aeda3023e5f92546d801b7a97f7f2a8bc8d28749cb`
- CVM app id: `ddff154546fe22d15b65667156dd4b7c611e6093`
- VM state: `HALT`
