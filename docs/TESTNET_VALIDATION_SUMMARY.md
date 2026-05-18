# V3 Testnet Validation Suite Report

Date: 2026-05-18T03:00:51.453Z

## Environment

- RPC: `null`
- Has TEST_WIF: `true`
- Has Morpheus runtime token: `false`
- Paymaster app id: `ddff154546fe22d15b65667156dd4b7c611e6093`
- Paymaster account override: `none`
- Skip allowlist update: `false`
- Has phala CLI: `true`

## Stages

- V3 Smoke: `ok`
- V3 Plugin Matrix: `ok`
- V3 Market Escrow: `ok`
- V3 Paymaster On-Chain: `ok`

## Smoke Summary

- Address: `NTmHjwiadq4g3VHpJ5FQigQcD4fF5m8TyX`
- Core hash: `0x8bf2ee127a1574891c12950128c18de0ec80caae`
- Web3Auth verifier: `0xe70103a57f319b6b839cb17693b8d2ceb7b494f4`
- Whitelist hook: `0xc136a16a5cfa21ba24b3ed91656f5fd9ca4e215b`
- Account ID: `n/a`
- Virtual address: `n/a`

Transactions:

- registerAccount: `0x13d2dd0607c158fcee6b326385e7dafdad493ba19f0e74a082cf243e2784f44e`
- nativeExecute: `0x112f0a01c648d090cb744a62de6baed82fc6ee5f190c4c81d1bf2f206495dc2e`
- hookConfigRequest: `0xbec9a5c7415ec429e16a4e0734372f953ad885365a171f5477c235d9ec3c1788`
- verifierConfigRequest: `0xaf2960e67a2907fddafe9431e322e3dc081db688db2ced6d5515a30ac9209a4f`
- evmExecute: `0x651dd8ee088e4abcdba50366abd039c5ed35d873fcafbe1158be907eb962b787`

## Plugin Matrix Summary

- Report path: `sdk/docs/reports/v3-testnet-plugin-matrix.latest.json`
- Core hash: `0x106376030596fbf3db8dc00f367ab3c3a729841a`
- Mock target: `0xf56d3e684f3c5afd55d0e90f95f32d67945dcf46`

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

- Core hash: `0xc6c01eacaf4c29f0e4279df8a935d9e0f446d03f`
- Market hash: `0x70bed7713b4204c0dbf26f9dafb1a4dd6ec7ea08`
- TEE verifier: `0xe6647c8c55c19c7085448f1fc6674d74456cb1eb`
- Whitelist hook: `0xafd1a2c2195202483a921cabe48f9ebaff11d9bf`
- Listing ID: `1`
- Account ID: `0x6411f2b8b99c7cf286b72007dad301f89e81890e`
- Buyer recorded: `0xdd1596d1799ff9e8b4d391e5a7109b084abce96f`
- Backup owner after sale: `0xdd1596d1799ff9e8b4d391e5a7109b084abce96f`
- Listing status: `2`

## Paymaster On-Chain Summary

- Core hash: `0x33691f18043cabacbd15998fd1223685fcbd2109`
- Verifier hash: `0x5a3606e30b46125f4da73e4819ad95c797af76af`
- Paymaster hash: `0x114de364270977214d61a3ad32bf77c71d80b8bb`
- Account ID: `0xd4a808c9855f43e981305205817615d3c1e77b3c`
- Sponsored txid: `0x36d42e73dedbdb20f27d2a66c491ae5df4c1e8546cfcaf9fe311788c94135d13`
- Sponsored result: `GAS`
- Deposit before: `200000000`
- Deposit after: `190000000`
- Reimbursement: `10000000`
- Over-limit rejected: `true`
- Revoked rejected: `true`
- Withdraw success: `true`

## Skipped Stages

- V3 Paymaster Policy: skipped because MORPHEUS_RUNTIME_TOKEN | PHALA_API_TOKEN | PHALA_SHARED_SECRET is missing
- V3 Paymaster Relay: skipped because MORPHEUS_RUNTIME_TOKEN | PHALA_API_TOKEN | PHALA_SHARED_SECRET is missing

