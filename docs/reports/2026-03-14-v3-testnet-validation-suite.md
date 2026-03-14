# V3 Testnet Validation Suite Report

Date: 2026-03-14T01:48:40.049Z

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
- V3 Paymaster Policy: `ok`
- V3 Paymaster Relay: `ok`

## Smoke Summary

- Address: `NTmHjwiadq4g3VHpJ5FQigQcD4fF5m8TyX`
- Core hash: `0x911e205fed6efff4ce95b8bbff259846be1fede8`
- Web3Auth verifier: `0xdd09c7b9f01054b6e930e054f35bc13015c98733`
- Whitelist hook: `0xf0152384aa2577e353ab67db31f4edf647048374`
- Account ID: `0x4b3e568501f5eab60e8089b7138739c8ca19b712`
- Virtual address: `NWuVZB5bWAZ3THo5H9i4qntybTPPnfunrK`

Transactions:

- registerAccount: `0xa041c2c3ac501dd07030f707df4fac8f96d34ede49701958f6953cf7d3503475`
- nativeExecute: `0xb06a3776504a169077a8968e42a3a42a739549d29c8e0b3ce3e36d9d0e0681c9`
- hookExecute: `0x359fc9e212b0f0efd80ef8ae81bd00f042966ed0059e67408a8f8b70d6730c52`
- evmExecute: `0xe731e7fbd9b691a2b8c851f34ceb55b2b298820e51f945e163abe1f63b72d150`

## Plugin Matrix Summary

- Report path: `sdk/docs/reports/2026-03-13-v3-testnet-plugin-matrix.1773454185382.json`
- Core hash: `0xdf10f6605eb076395ec579538ba8e8594e6b31f1`
- Mock target: `0x1fb4b4ed39354baf2ae45b198ef6bed037e27592`

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

- Report path: `sdk/docs/reports/2026-03-14-v3-testnet-paymaster-policy.1773454365197.json`
- Policy ID: `testnet-aa`
- Account ID: `0x1111222233334444555566667777888899990000`
- Approval digest: `d50eceff250a5a909a290dcfbf8fd794e6139276a63cb117922719c8c3fd6769`
- Attestation hash: `f0e3b0ac78e0d27f3d93d21652fe62a50ddd5df0a1dfb3cb409988fa83c330fb`

Denied cases:

- missingOperationHash
- wrongDappId
- wrongAccountId
- wrongTargetContract
- wrongMethod
- gasTooHigh
- wrongTargetChain

## Paymaster Relay Summary

- Relay txid: `0xb55e8c4c02243cc3769074c89d2b0dfc16ffa6c7dfbec1a62da9cb89df86c856`
- Account ID: `0x5d65b8721cfa293d869abdeb474b0f33736f2e8f`
- Policy ID: `testnet-aa`
- Approval digest: `775bf2ff09499b96c33546317416f1ba052a777f0bda9ed6e8a99b1df06a62cb`
- Attestation hash: `b697e13b497201bbefbeb933269d878997e0c7cc274176ad5656e62372f61bbe`
- CVM app id: `28294e89d490924b79c85cdee057ce55723b3d56`
- VM state: `HALT`

