# Mixed Multi-Sig (N3 + EVM)

A single Abstract Account can aggregate native Neo witnesses and EVM EIP-712 signatures toward the same threshold.

## Verified Mixed Flow

On the hardened verified testnet deployment `0x711c1899a3b7fa0e055ae0d17c9acfcd1bef6423`, the live validator proved a mixed Neo-relayer + EVM-signer path where:

- the EVM signer authorizes an AA wrapper action with EIP-712 typed data
- the Neo account relays and pays GAS for the transaction
- the contract increments nonces correctly and still enforces whitelist mode and related restrictions

## Execution Model

Mixed signing does **not** bypass hardening. The combined authorization still has to execute through Abstract Account entrypoints such as `executeMetaTx` or `executeMetaTxByAddress`. Direct proxy-signed external calls remain invalid.

## Practical Example

- **Signer A:** Ethereum wallet signs typed data for `setWhitelistByAddress` or another AA-managed action
- **Signer B:** Neo wallet submits the outer transaction and attaches the native witness
- **Contract:** counts valid authorization across both ecosystems, then enforces whitelist / blacklist / transfer policies before the target call
