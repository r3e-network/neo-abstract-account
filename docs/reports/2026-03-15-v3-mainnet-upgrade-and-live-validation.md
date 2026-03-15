# V3 Mainnet Upgrade And Live Validation

Date: 2026-03-15

## Scope

This report records the Neo N3 mainnet AA core upgrade from the legacy V2-era runtime to the current V3 runtime at the same published AA hash, together with fresh live validation against the production Morpheus Oracle path.

## Canonical Mainnet Anchors

- AA core: `0x0466fa7e8fe548480d7978d2652625d4a22589a6`
- AA domain: `aa.morpheus.neo`
- AA Web3AuthVerifier: `0x4696e7a68d5d6c6cf9c19c38cd0fdc9c0bcc3e0a`
- MorpheusSocialRecoveryVerifier: `0x975483c2d0928c1ed6da568190b5137463431422`
- MorpheusOracle: `0x017520f068fd602082fe5572596185e62a4ad991`
- MorpheusDataFeed: `0x03013f49c42a14546c8bbe58f9d434c3517fccab`
- NeoDIDRegistry: `0x6a51671fd45d61b9536791390f275eb31d07954a`
- example consumer: `0x89b05cac00804648c666b47ecb1c57bc185821b7`

## Mainnet Transactions

- AA core in-place update tx: `0xb0e163734ffd0641b44c6091f373f0b09acdde03c693f465c97e6659f2dda035`
- AA Web3AuthVerifier deploy tx: `0x8a47340c5127fcf3d53cdfdce5a6b4555734c8db206ce5a5dfddd56199cfc3d3`
- Oracle update tx: `0xed5fcf25c036cd2e0aff5c447f2ba1cba100b37102f8123adce407b07589f624`
- DataFeed update tx: `0x7a0fc672247077985ddea52fdd0ccf2b62725d4cbd21127b3791406a2d3cbcdf`
- NeoDIDRegistry deploy tx: `0x2dd001477b853fdbd5464a4b4d5eb2ac20b7bc780351369fa8c4fabae8d95f0c`

## Current Runtime State

- The published AA hash stayed unchanged at `0x0466fa7e8fe548480d7978d2652625d4a22589a6`.
- `updateCounter` increased from `0` to `1`.
- The current runtime ABI exposes the V3 entrypoints `registerAccount`, `updateVerifier`, `executeUserOp`, and `executeUserOps`.
- The raw on-chain manifest name remains `UnifiedSmartWalletV2-1773294968429` because Neo N3 contract update rules do not allow changing the manifest name during an in-place update.
- The canonical product/runtime name remains `UnifiedSmartWalletV3`. The preserved manifest string is an update-compatibility detail, not the user-facing runtime label.

## Live Validation Matrix

### A. Native fallback AA path -> Oracle

Fresh disposable V3 account:

- account id: `0xf71a70baf582db5e89bcaf8fa064dbd12423e3d8`
- `registerAccount` tx: `0xe705fc6f618aa6f3a0fb3caa546e69df75af0ca9e235eaaecf68cf54e2b34367`
- `getBackupOwner(accountId)` resolved to the production owner `0x3837f413063874e5c10cc9b19d4691ddf656066d`
- verifier and hook both remained zero as expected for native fallback mode

Execution proofs:

- native `executeUserOp -> GAS.symbol()` tx: `0xd2bdca0be28c9418ad93602b39262c1b2ee41992eb37fdf9cd6dfd24cce5c893`
- native `executeUserOp -> example consumer -> requestBuiltinProviderPrice` tx: `0xf9c02609f93e6cc46ece77a296340a1fcedd66a90b95b9b7ab43a939739ee0ce`
- returned request id: `231`

Oracle callback result:

- request type: `privacy_oracle`
- callback success: `true`
- extracted price/result: `2.96`
- callback payload included the expected Morpheus verification envelope and TEE attestation fields

### B. Web3Auth verifier AA path -> Oracle

Fresh disposable V3 account:

- account id: `0x463f786bc02dc95083d7c101b5b2d6aaa21d7aae`
- `registerAccount` tx: `0x67521c0ea861114b44a56728a559e85ad21bf992a7431854f6efb316c118b75a`
- `updateVerifier(accountId, Web3AuthVerifier, pubkey)` tx: `0xa98641df8179ac8cc1652998983da41e9284a6017df1de94660c0a60b948f523`
- `Web3AuthVerifier.getPublicKey(accountId)` returned the configured secp256k1 public key

Execution proofs:

- Web3Auth `executeUserOp -> GAS.symbol()` tx: `0x3bbd3e0fb0eb349bac21d179e852de3156f916967999b9e0eed8231fa403f3fd`
- Web3Auth `executeUserOp -> example consumer -> requestBuiltinProviderPrice` tx: `0x284e6c9b7ba01aaf3e51f788987c3aa3e09a9e8b5569c9da61ef8ffaaa49e892`
- returned request id: `232`
- channel-0 nonce advanced to `2`, proving both signed `UserOperation`s were accepted and consumed

Oracle callback result:

- request type: `privacy_oracle`
- callback success: `true`
- extracted price/result: `3.019`
- callback payload again included the expected Morpheus verification envelope and TEE attestation fields

### C. Example consumer fee-credit path

- The example consumer remained allowlisted on the production Oracle.
- The Oracle request fee stayed at `1000000` (`0.01 GAS`).
- The native fallback request left `1000000` fee credit on the example consumer.
- The Web3Auth request then consumed the remaining fee credit and reduced the example consumer credit to `0`.

## Conclusion

The mainnet AA core is now aligned with the current V3 runtime at the published production hash.

Fresh live proofs now exist for both of the practical production execution paths that matter most:

- backup-owner native fallback execution
- Web3Auth verifier plugin execution

Both paths executed live `executeUserOp` calls against the production Morpheus Oracle example consumer and received valid production Oracle callbacks on Neo N3 mainnet.
