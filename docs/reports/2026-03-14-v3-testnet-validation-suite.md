# V3 Testnet Validation Suite Report

Date: 2026-03-17T14:59:53.705Z

## Environment

- RPC: `https://testnet1.neo.coz.io:443`
- Has TEST_WIF: `true`
- Has PHALA_API_TOKEN: `true`
- Paymaster app id: `28294e89d490924b79c85cdee057ce55723b3d56`
- Paymaster account override: `0x0c3146e78efc42bfb7d4cc2e06e3efd063c01c56`
- Skip allowlist update: `false`

## Stages

- V3 Smoke: `ok`
- V3 Plugin Matrix: `ok`
- V3 Paymaster Policy: `ok`
- V3 Paymaster Relay: `ok`

## Smoke Summary

- Address: `NTmHjwiadq4g3VHpJ5FQigQcD4fF5m8TyX`
- Core hash: `0x9dea21b70f9b26b9e1e121a8a7d0a5d8e531fa32`
- Web3Auth verifier: `0xda11e67c71ff7c3cf107f1d53b5d8c3132480f3c`
- Whitelist hook: `0x569519499ebf9a620bc3a907b2c074f4a25f1252`
- Account ID: `0x9792e1be4c5fcee54421e63268fe6b2481165f84`
- Virtual address: `NPHCKBEVHET6uGUxLsZL6yvebX7cJdh9qs`

Transactions:

- registerAccount: `0x0a0da79651849fdfd81e94ed22d9378eb77f083f8d40ee05fab564706d28a1d1`
- nativeExecute: `0xb7f69521e55a5e41540f29c4e2a7f44b0d58aae58b0eea85b4f383aa7f341a59`
- hookExecute: `0xb8234523eea22b995dff6813ebfd45186b279920c9ecb18b972e87d3a69efe4f`
- evmExecute: `0x663c489eabb5422e5f08c2d70de0def4288bc24f4c578c2276e2a751b6a3e118`

## Plugin Matrix Summary

- Report path: `sdk/docs/reports/2026-03-13-v3-testnet-plugin-matrix.1773760991823.json`
- Core hash: `0x1e3767bde710932db1e66ffbebf452e24e664584`
- Mock target: `0xdb161689a758489bb848079e428fc6ffaa73a633`

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

- Report path: `sdk/docs/reports/2026-03-14-v3-testnet-paymaster-policy.1773761210768.json`
- Policy ID: `testnet-aa`
- Account ID: `0x0c3146e78efc42bfb7d4cc2e06e3efd063c01c56`
- Approval digest: `4e6f87401838f21de14798e50a6eee0182c5a0877fd8461a306cb686254c1d49`
- Attestation hash: `edfb69425055f7201d3c471c1c2b908ddaeec9f41c13f9ec5b4a9ebe4fe72a5f`

Denied cases:

- missingOperationHash
- wrongDappId
- wrongAccountId
- wrongTargetContract
- wrongMethod
- gasTooHigh
- wrongTargetChain

## Paymaster Relay Summary

- Relay txid: `0xa04a52e2cc2c1ded62902e3766768b14c610c5cd4e56b333c89e1fc6a31b85c4`
- Account ID: `0x0c3146e78efc42bfb7d4cc2e06e3efd063c01c56`
- Policy ID: `testnet-aa`
- Approval digest: `1f2f0ffe978ababa1488a3b329fb7331aa14b8c87a12c4277977a8c160e29276`
- Attestation hash: `f7ab98517618ab5cb9acf2e3455dc4236cb6186e077159051cb10b32199bc090`
- CVM app id: `28294e89d490924b79c85cdee057ce55723b3d56`
- VM state: `HALT`

