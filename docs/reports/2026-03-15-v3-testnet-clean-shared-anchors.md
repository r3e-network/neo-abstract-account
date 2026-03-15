# V3 Testnet Clean Shared Anchors

Date: 2026-03-15

## Scope

This report records the replacement of the older timestamp-suffixed shared testnet AA core with a clean, stable shared testnet deployment name and the paired shared `Web3AuthVerifier` anchor.

## Shared Testnet Anchors

- AA core: `0xe24d2980d17d2580ff4ee8dc5dddaa20e3caec38`
- AA runtime label: `UnifiedSmartWalletV3`
- on-chain testnet manifest name: `UnifiedSmartWalletV3Testnet`
- Web3AuthVerifier: `0xf2560a0db44bbb32d0a6919cf90a3d0643ad8e3d`
- on-chain verifier manifest name: `Web3AuthVerifierTestnet`
- Morpheus Oracle: `0x4b882e94ed766807c4fd728768f972e13008ad52`
- example consumer: `0x8c506f224d82e67200f20d9d5361f767f0756e3b`

## Deployment Transactions

- AA core deploy tx: `0xbcee817781bb57e66d7373c25c1b951bbe7bce9ebc355fb38f7d23b21cc515c0`
- Web3AuthVerifier deploy tx: `0xfacf85fa95105da2e3d0dac1ae9723754289142a8249cf94a0b15fcf066ed2a5`

## Live Smoke

The clean shared testnet anchors were validated live against the production-style testnet Oracle path:

- fee-credit deposit tx: `0xcb74330666cc6b0ccf5a0aea0faaa514aa0ac1defa734b6ad835a65591547931`
- `registerAccount` tx: `0xb254823cadf8d04a4582df7d1a675eaae018cead0a27d73f27aa16199ed40d27`
- `updateVerifier` tx: `0xf29d1408a7867899afa8681f21e250ab9bfcb1ac64688980a563ecdbf25da393`
- `executeUserOp -> requestBuiltinProviderPrice` tx: `0x6bb27d2541514d04e1b0a6844ec45243c4b961b70e30a5eee4c8210bfc2ba509`
- callback request id: `3851`

Returned callback summary:

- request type: `privacy_oracle`
- callback success: `true`
- extracted value/result: `3.143`

## Outcome

The canonical shared testnet AA anchor no longer uses the old timestamp-heavy manifest name.

Current defaults, runtime configs, and active validation scripts should now target:

- `0xe24d2980d17d2580ff4ee8dc5dddaa20e3caec38` for the shared testnet AA core
- `0xf2560a0db44bbb32d0a6919cf90a3d0643ad8e3d` for the shared testnet `Web3AuthVerifier`
