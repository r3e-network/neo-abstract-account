# V3 Testnet Validation Suite Report

Date: 2026-03-14T01:14:38.985Z

## Environment

- RPC: `https://testnet1.neo.coz.io:443`
- Has TEST_WIF: `true`
- Has PHALA_API_TOKEN: `true`
- Paymaster app id: `28294e89d490924b79c85cdee057ce55723b3d56`
- Paymaster account override: `none`
- Skip allowlist update: `false`

## Stages

- V3 Smoke: `ok`
- V3 Plugin Matrix: `ok`
- V3 Paymaster Relay: `ok`

## Smoke Summary

- Address: `NTmHjwiadq4g3VHpJ5FQigQcD4fF5m8TyX`
- Core hash: `0xdbb8676915ce0c31671ada0b4c8d65ddf91227d1`
- Web3Auth verifier: `0x74a203b5a4b902e93561ea81034f72c8b696bde1`
- Whitelist hook: `0xd0708d060178d2ee4176aa9404353d32042d951f`
- Account ID: `0xee865cc352cd5a45185526c405833783a8824dfb`
- Virtual address: `NNLP7gZaBAe968oUYkz8PNsi76Qt7GAqqh`

Transactions:

- registerAccount: `0xa97aba06af3f68239a63c1d5501a88b3a51d29051fd741d79b93824e2768ec8b`
- nativeExecute: `0xc028e523fee2201d05939dcb9ced7e7e70ad4744e87f507a971dcb7db805c8cc`
- hookExecute: `0x594af829d2e93ad2f4288559f3690619d95c9bd6a5617712761a74b4e5c256d2`
- evmExecute: `0xcfd1f8a3a626f268bb172399ebe1c784ca36e22e21d1edb09a18eab454481ff0`

## Plugin Matrix Summary

- Report path: `sdk/docs/reports/2026-03-13-v3-testnet-plugin-matrix.1773452188046.json`
- Core hash: `0x8419cec64768faab33a38c362b9d3b7a92772339`
- Mock target: `0xbfaf76f1aa27ae32d5185b25a3b17f3003379cf8`

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

## Paymaster Relay Summary

- Relay txid: `0xd4c6ce734134f80192ef3cb9c6e8ef5f1c1b0febfbf35bc97ceb13a926060a71`
- Account ID: `0x4ea1c6f8fdece45ba113f3ebee783ee88d9e7e6f`
- Policy ID: `testnet-aa`
- Approval digest: `f389fe5a429e9d938da15c2a4e11194c3098f00bfe851d25d15f4dc7cf96699c`
- Attestation hash: `88d38bfc03654fd1daa9933695e7d998b67e46bf5bc8f900e2d1a5efb17550b7`
- CVM app id: `28294e89d490924b79c85cdee057ce55723b3d56`
- VM state: `HALT`

