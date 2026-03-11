# Recovery Verifier Testnet Validation — 2026-03-09

## Deployer

- Address: `NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu`
- Network: Neo N3 testnet (`https://testnet1.neo.coz.io:443`)

## Deployment Results

### ArgentRecoveryVerifier
- Deployment txid: `0x8ae760b6ee69dd76b28f73560d0093c0c86cc7924cbc7e6b1241be6bbf3ec4e1`
- Contract hash: `0xaa25d77353fbc4cceb372f91ebccf5fb726ed10f`
- Deploy VM state: `HALT`

### SafeRecoveryVerifier
- Deployment txid: `0xbb0e23d7afe37cce7f8b09090c5284afc1ab2f60c2ffe966d8bb0ad21d3d0c4a`
- Contract hash: `0xfcd8c4601dfa29910d9fec0bf724ce39fc734a74`
- Deploy VM state: `HALT`

### LoopringRecoveryVerifier
- Deployment txid: `0xe8f2e21aecd260c972ea9f451085cb1d27aa2e57c4fd40499752b2a3e419e133`
- Contract hash: `0x5bc837e96b83f5080e722883398c8188177694ea`
- Deploy VM state: `HALT`

## Local Verification Completed Before Deployment

- `dotnet build contracts/recovery/ArgentRecoveryVerifier.csproj -c Release -nologo`
- `dotnet build contracts/recovery/SafeRecoveryVerifier.csproj -c Release -nologo`
- `dotnet build contracts/recovery/LoopringRecoveryVerifier.csproj -c Release -nologo`
- `bash contracts/recovery/compile_recovery_contracts.sh`
- `node --test sdk/js/tests/recoveryReadiness.unit.test.js`
- `node sdk/js/tests/recovery_verifier_logic_test.js`

## Testnet Validation Completed

### Official package-script validation
- Argent command: `cd sdk/js && npm run testnet:validate:recovery`
- Argent target hash: `0xaa25d77353fbc4cceb372f91ebccf5fb726ed10f`
- Argent result: `PASS`
- Argent validation txid: `0xc6c058f5a0a6c7339a4ddc80db595daa472030497ff46277e9a9de04e8ec758c`
- Safe command: `cd sdk/js && npm run testnet:validate:recovery:safe`
- Safe target hash: `0xfcd8c4601dfa29910d9fec0bf724ce39fc734a74`
- Safe result: `PASS`
- Safe validation txid: `0xfb96dc8cfcf9c740a20133e9b1749527071893bd04dbef8ac6cb8b1315873f32`
- Loopring command: `cd sdk/js && npm run testnet:validate:recovery:loopring`
- Loopring target hash: `0x5bc837e96b83f5080e722883398c8188177694ea`
- Loopring result: `PASS`
- Loopring validation txid: `0x1c8d5a8cdc26b110fa30dcbc06653187f4d17a5859f58a3481d4bf1326b4b204`

### Manual live validation across all three contracts
A live validator executed these checks for Argent, Safe, and Loopring:
- `version()` returned `1.1.0`
- `setupRecovery(...)` executed successfully on-chain
- `getOwner(...)` returned the expected owner hash value
- `getNonce(...)` returned `0` immediately after setup

Manual validation txids:
- Argent `setupRecovery`: `0x7f01a13cf2ede1549275905109504dbb81256a86f3590bf276a286c7063e643e`
- Safe `setupRecovery`: `0x9a5c131b5553fb13e2f1f0b332bd5f84b9099502d54c11d8bea1eb5db72858b4`
- Loopring `setupRecovery`: `0x7614bca6863b2b29a54dc55193934cb214f5c3aaf779716a0d0d4c93ae33b292`

## Notes

- The checked-in recovery validators now cover Argent, Safe, and Loopring package-script flows. Argent uses `Hash160` account IDs and all three validators match the deployed contract ABIs.
- The recovery build path now compiles only the `*.Fixed.cs` sources and uses isolated `nccs` builds to avoid sibling-source collisions.
- Plaintext WIF references were removed from recovery deployment docs and scripts; use `TEST_WIF` from the shell instead.
