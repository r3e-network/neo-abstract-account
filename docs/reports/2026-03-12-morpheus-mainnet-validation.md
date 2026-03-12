# Morpheus Mainnet Validation 2026-03-12

## Scope

This report records the Neo N3 mainnet validation state for the Morpheus-integrated Abstract Account stack and the existing production Morpheus Oracle entrypoint.

Validated on 2026-03-12:

- production Oracle: `0x017520f068fd602082fe5572596185e62a4ad991` (`oracle.morpheus.neo`)
- production Callback Consumer: `0xe1226268f2fe08bea67fb29e1c8fda0d7c8e9844`
- production Datafeed: `0x03013f49c42a14546c8bbe58f9d434c3517fccab` (`pricefeed.morpheus.neo`)
- mainnet AA: `0x0466fa7e8fe548480d7978d2652625d4a22589a6`
- mainnet MorpheusSocialRecoveryVerifier: `0x975483c2d0928c1ed6da568190b5137463431422`
- public NeoDID service DID: `did:morpheus:neo_n3:service:neodid`
- public resolver route: `/api/neodid/resolve?did=did:morpheus:neo_n3:service:neodid`

## Deployment State

The Oracle, Callback Consumer, Datafeed, AA core, and MorpheusSocialRecoveryVerifier already matched the latest local compiled artifacts at validation time.

No further redeploy or upgrade was required on 2026-03-12 because on-chain NEF checksums matched the local build outputs exactly.

Checksum matches confirmed:

- `MorpheusOracle`: local `4221237044`, chain `4221237044`
- `OracleCallbackConsumer`: local `1435370910`, chain `1435370910`
- `MorpheusDataFeed`: local `250860605`, chain `250860605`
- `UnifiedSmartWalletV2`: local `1702064541`, chain `1702064541`
- `MorpheusSocialRecoveryVerifier`: local `4086032926`, chain `4086032926`

## Oracle Entry Point

The existing production Oracle entry point remained the live entry point:

- NeoNS: `oracle.morpheus.neo`
- contract hash: `0x017520f068fd602082fe5572596185e62a4ad991`
- in-place Oracle upgrade tx recorded previously: `0xf09e2aec3b0908e384993f1f040c54d55277f7862b01c9884b7eb0e848a7c2ab`

Read validation on 2026-03-12 confirmed:

- admin matches deployer/updater authority
- updater matches expected relayer authority
- callback consumer remains allowlisted
- callback consumer still points back to the production Oracle
- encryption public key is present on-chain
- verification public key is present on-chain and matches the live worker signer

## AA / NeoDID Mainnet State

Validated account:

- account id: `bdbb3b1de6b2046b37e7502796b7cb04`
- account address script hash: `0x34b7387a4e08913133aa58f4b1ea013cf2ad333d`

Verifier state confirmed on-chain:

- bound verifier on AA address path resolves to `0x975483c2d0928c1ed6da568190b5137463431422`
- `getPendingRecovery(accountId)` is empty
- `getActiveSession(accountId)` is empty
- `getRecoveryNonce(accountId) = 2`
- `getSessionNonce(accountId) = 1`
- `getThreshold(accountId) = 1`
- current recovered owner script hash is `0x3bd16df91943cd2e8e6e6ee45f30fa342d9eac30`

Mainnet event proofs on the existing Oracle path:

- `ActionSessionActivated`: `0x1b60e56eaba76102d159e63ed45007ea03fcee1543d9eaff09f9eba5a3de323f`
- `RecoveryFinalized`: `0x2c9b76c4b811d8d98ec5721030773dfc54d5e90659418969642313231fa4d01c`

The recovered owner and cleared pending state prove that the existing Oracle entry point, the deployed AA core, and the deployed MorpheusSocialRecoveryVerifier work together on Neo N3 mainnet.

## Live Mainnet Oracle Requests

Fresh live mainnet example-consumer requests were executed on 2026-03-12 against the production Oracle:

- builtin privacy-oracle request tx: `0x5c4ad84968df0612d9db29d5a7dc48ce4f7cdb90d7f2314b2cba0cc51367b2bc`
- builtin compute request tx: `0x623e7fd51042e598877cb7285fc42277800be397de180b42fa70fc201d60a68a`
- sponsored-fee provider request tx: `0xae07bf2a6e3b82a8196d69ec8423d4dcd2f8c469c31133a5fdf8c2930dcfd60e`
- custom URL oracle request tx: `0x21e06eb688508745c78537999cf666cac69cb299ffec63201b9f600d62c6f490`

Oracle request ids from that run:

- provider: `122`
- compute: `123`
- sponsored provider: `124`
- custom URL: `125`

Result summary:

- builtin privacy-oracle returned a live NEO/USD value with a valid attestation payload
- builtin compute returned `math.modexp = 4` with a valid attestation payload
- sponsored request deducted fee credit from the consumer contract, not the requester EOA
- custom URL request returned `neo-morpheus` and completed normally

The generated machine- and human-readable artifacts for that run are recorded in the Oracle repo:

- `examples/deployments/n3-examples-validation.mainnet.2026-03-12.json`
- `examples/deployments/n3-examples-validation.mainnet.latest.json`
- `docs/N3_EXAMPLES_VALIDATION_MAINNET_2026-03-12.md`

## Datafeed Activity

Recent production Datafeed writes observed on-chain during this validation window:

- `0x77ee3f6c39c10fce118992d65004b79f6d36d7cdbe76a2f46d6eb8a6c05b7bd3` updated `TWELVEDATA:GAS-USD`
- `0x1d645453620c91071affe75c2ca1b75f57c5b93c9591959a4434b8248876a814` batched `TWELVEDATA:WTI-USD`, `TWELVEDATA:BRENT-USD`, `TWELVEDATA:NATGAS-USD`, and `TWELVEDATA:CORN-USD`
- `0x46bf7f0545ee85654a5df1980a37569c2372614ca14a40a58734a32727108042` batched `TWELVEDATA:SOL-USD`, `TWELVEDATA:WTI-USD`, `TWELVEDATA:BRENT-USD`, and `TWELVEDATA:NATGAS-USD`

On-chain feed read validation from the same live example run returned:

- pair: `TWELVEDATA:NEO-USD`
- integer price: `2551000`
- display price: `2.551000`
- source set id: `1`

## Commands Executed

Local verification performed on 2026-03-12:

- `bash contracts/compile_abstract_account.sh`
- `bash contracts/recovery/compile_recovery_contracts.sh`
- `npm --prefix sdk/js test`
- `dotnet test tests/AbstractAccount.Contracts.Tests/AbstractAccount.Contracts.Tests.csproj`
- `npm --prefix frontend test`
- `npm --prefix frontend run build`

Live Oracle verification performed from the Oracle repo:

- `MORPHEUS_NETWORK=mainnet node scripts/verify-morpheus-n3.mjs`
- `MORPHEUS_NETWORK=mainnet node examples/scripts/test-n3-examples.mjs`

## Conclusion

As of 2026-03-12, the requested production entrypoint model is satisfied:

- the existing `oracle.morpheus.neo` contract remains the production Oracle entry point
- the production Oracle, Callback Consumer, and Datafeed all match the latest local artifacts
- the Morpheus-integrated AA core and MorpheusSocialRecoveryVerifier are deployed on Neo N3 mainnet and match the latest local artifacts
- fresh mainnet Oracle requests succeeded end-to-end
- AA action-session and recovery flows succeeded on the production Oracle path
- recent Datafeed updates prove the synchronized price-feed path is also live
