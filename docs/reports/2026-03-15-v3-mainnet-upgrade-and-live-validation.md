# V3 Mainnet Upgrade And Live Validation

Date: 2026-03-15

## Scope

This report records the Neo N3 mainnet AA migration into the current clean-name V3 anchor set, together with fresh live validation against the production Morpheus Oracle path.

## Canonical Mainnet Anchors

- AA core: `0x9742b4ed62a84a886f404d36149da6147528ee33`
- AA domain: `smartwallet.neo`
- AA Web3AuthVerifier: `0xb4107cb2cb4bace0ebe15bc4842890734abe133a`
- SocialRecoveryVerifier: `0x51ef9639deb29284cc8577a7fa3fdfbc92ada7c3`
- MorpheusOracle: `0x017520f068fd602082fe5572596185e62a4ad991`
- MorpheusDataFeed: `0x03013f49c42a14546c8bbe58f9d434c3517fccab`
- NeoDIDRegistry: `0xb81f31ea81e279793b30411b82c2e82078b63105`
- example consumer: `0x89b05cac00804648c666b47ecb1c57bc185821b7`

## Mainnet Transactions

- AA core clean deploy tx: `0x94d7a6d45196ed59a0eeb604450b305949e31650d1077ba2a824a90591644b3b`
- AA Web3AuthVerifier clean deploy tx: `0xa96407df4ffc8496a5cd5f129b9f9881164b28c843265467d5f886e3435af6a4`
- SocialRecoveryVerifier clean deploy tx: `0xadfc405bf40d21ab2d56bacc9ced028de1f5ccbc00803f122f93676ad3388855`
- smartwallet domain register tx: `0x7a452ddf727fb8155b0a736b5b3bdfd1e7b8a244c8d1e56ac8393e209617cae8`
- smartwallet domain setAdmin tx: `0xff5535aab82de9b1bdd998449eb019cb3fb230de68cff9fbf202f5bb42d6bc95`
- smartwallet domain setRecord tx: `0x3755360a7a304be613abb735d3d798234e93fc5482d55f1792a7f05f7c869e17`
- Oracle update tx: `0xed5fcf25c036cd2e0aff5c447f2ba1cba100b37102f8123adce407b07589f624`
- DataFeed update tx: `0x7a0fc672247077985ddea52fdd0ccf2b62725d4cbd21127b3791406a2d3cbcdf`
- NeoDIDRegistry deploy tx: `0x2dd001477b853fdbd5464a4b4d5eb2ac20b7bc780351369fa8c4fabae8d95f0c`

## Current Runtime State

- The canonical AA hash is now `0x9742b4ed62a84a886f404d36149da6147528ee33`.
- The canonical runtime ABI exposes the V3 entrypoints `registerAccount`, `updateVerifier`, `executeUserOp`, and `executeUserOps`.
- `smartwallet.neo` now resolves to the clean canonical AA address `NQeYx3qhVboVNU4Yk2NZPXQtudTeCNmjFq`.
- The older hash `0x0466fa7e8fe548480d7978d2652625d4a22589a6` remains as a legacy V3-compatible deployment whose manifest name cannot be cleaned in place.
- The canonical product/runtime name remains `UnifiedSmartWalletV3`.

## Live Validation Matrix

### A. Legacy compatibility AA path -> Oracle

Fresh disposable V3 account on the legacy compatibility AA hash:

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

### B. Legacy compatibility Web3Auth AA path -> Oracle

Fresh disposable V3 account on the legacy compatibility AA hash:

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

The mainnet AA stack now has a clean canonical anchor set:

- `smartwallet.neo` -> `0x9742b4ed62a84a886f404d36149da6147528ee33`
- `web3auth.smartwallet.neo` -> `0xb4107cb2cb4bace0ebe15bc4842890734abe133a`
- `recovery.smartwallet.neo` -> `0x51ef9639deb29284cc8577a7fa3fdfbc92ada7c3`

Fresh live proofs now exist for both of the practical production execution paths that matter most:

- backup-owner native fallback execution
- Web3Auth verifier plugin execution

Both paths executed live `executeUserOp` calls against the production Morpheus Oracle example consumer and received valid production Oracle callbacks on Neo N3 mainnet.
