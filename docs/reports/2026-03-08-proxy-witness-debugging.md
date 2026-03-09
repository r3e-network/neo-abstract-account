# March 8 Validation Notes

## Scope
- Follow-up live validation on Neo N3 testnet for the remaining proxy-witness blocker in AA wrapper executions that need the AA account itself to satisfy downstream token/account witness checks.

## Fresh Evidence
- Fresh validation deployment tx: `0xe6b65fb40f5f291ba8cb383428b2dd0bcde3ff0c1a0a62de3216fd748a88f364`
- Fresh diagnostic hash: `0x2dd3b3776ddccdd56c4969342a3f9b0c5516933c`
- Additional allow-all verification deployment tx: `0xc72c46a5609f9043c5d16ab8a84154e8c4e0f16ed421b9ed70b963d70d630140`
- Additional allow-all verification hash: `0x2459d982370b895bb3a78e7a25fa7423fac86b25`

## Confirmed Findings
- The contract-facing account creation path is sensitive to `ByteArray` byte order. The validator/SDK path must use raw accountId bytes on-chain when deriving the deterministic proxy address expected by the diagnostic build.
- The proxy signer must use the reversed script-hash form (`signerScriptHash`) as the cosigner account when a real proxy witness is attached.
- `executeByAddress(..., aaHash, getNonce, ...)` with the owner signer alone succeeds live after a valid account create/bind.
- The adapted custom-verifier validator now passes live on the validation deployment by proving the custom verifier through owner-only AA wrapper execution rather than the still-broken proxy-signed direct admin mutation path.
- The max-transfer validator now passes live on the validation deployment once the account is created with raw accountId bytes, the AA lookup uses the bound address hash, the proxy cosigner uses `signerScriptHash`, and the inner GAS `transfer` uses that same signer hash as the `from` account.
- The approve/allowance validator now passes live on the validation deployment under the same signer-hash model for the token owner.
- The full integration validator now passes live on the validation deployment after the same raw accountId + signerScriptHash fixes were propagated to the account-path meta helpers.
- The direct proxy-spend negative validator remains blocked live on the validation deployment, which is consistent with the hardened security goal.
- The concurrency validator now passes live on the validation deployment after adding bounded retries for transient RPC/TLS resets in the shared RPC and transaction helpers.

## Remaining Limits
- The direct proxy-signed external spend path is still rejected live, which is expected for the hardened policy but means it cannot be reused as a positive primitive for additional live coverage.

## Current Interpretation
- Wrapper logic, account creation, address binding, native/EVM authorization, dome/oracle recovery, custom verifiers, max-transfer enforcement, approve/allowance enforcement, the broad integration flow, and the bounded concurrency harness can all be validated live on the validation deployment.
- The remaining live negative-path constraint is the intentionally blocked direct proxy-signed external spend flow.
