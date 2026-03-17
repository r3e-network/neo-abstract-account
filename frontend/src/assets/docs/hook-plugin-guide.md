# Hook & Plugin Guide

This guide replaces the old "type a raw method name and paste JSON args" workflow as the primary mental model.

## Choose In Layers

Treat an AA policy stack as three layers:

1. **Verifier plugin**
   Use this to decide **who is allowed to authorize**.
   Examples:
   - `Web3AuthVerifier`
   - `SessionKeyVerifier`
   - `MultiSigVerifier`
   - `SubscriptionVerifier`
   - `TEEVerifier`

2. **Hook plugin**
   Use this to decide **what the account is allowed to do** after a verifier accepts the signature.
   Examples:
   - `WhitelistHook`
   - `DailyLimitHook`
   - `TokenRestrictedHook`
   - `NeoDIDCredentialHook`

3. **Backup / escape path**
   Use this to recover ownership or rotate the verifier when the primary path is compromised.

## Recommended Combinations

### Consumer Wallet

- Verifier: `Web3AuthVerifier`
- Hook: `DailyLimitHook`
- Backup: one cold owner address

Use this when you want a mainstream login flow with a hard spending ceiling.

### Trading / Automation Wallet

- Verifier: `SessionKeyVerifier`
- Hook: `WhitelistHook`
- Backup: `MultiSigVerifier` recovery path

Use this when a bot or operator should hit only approved contracts and methods.

### High-Value Treasury

- Verifier: `MultiSigVerifier`
- Hook: `TokenRestrictedHook` or `MultiHook`
- Backup: separate recovery owner

Use this when the account should protect a small approved asset set and require collective approvals.

### Membership / Recurring Billing

- Verifier: `SubscriptionVerifier`
- Hook: `DailyLimitHook`
- Backup: cold owner

Use this when the account is expected to authorize repeated recurring actions with bounded exposure.

## How To Configure

Do not start from raw calldata.

Start from:

1. pick the verifier intent
2. pick the policy hook intent
3. fill only the small number of fields that are specific to your account
4. let the app generate the low-level method + typed args

## Hook Presets

### WhitelistHook

Purpose:
only allow explicit target contracts.

Typical operations:

- `setWhitelist(accountId, target, true)`
- `setWhitelist(accountId, target, false)`

### DailyLimitHook

Purpose:
cap daily outflow for a token or target.

Typical operations:

- `setDailyLimit(accountId, token, dailyLimit)`

### TokenRestrictedHook

Purpose:
only allow a narrow asset universe.

Typical operations:

- `allowToken(accountId, token, true)`
- `allowToken(accountId, token, false)`

### NeoDIDCredentialHook

Purpose:
require a private credential before a call is allowed.

Typical operations:

- `requireCredentialForContract(accountId, target, credentialName)`

### MultiHook

Purpose:
compose multiple hooks behind one bound hook slot.

Typical operations:

- `setHooks(accountId, [hook1, hook2, ...])`

## Verifier Presets

### Web3AuthVerifier

Purpose:
consumer-facing social login.

Input shape:

- verifier contract hash
- verifier pubkey / provider config bytes

### SessionKeyVerifier

Purpose:
temporary delegated signing.

Input shape:

- session key pubkey
- target contract
- allowed method
- expiry

### MultiSigVerifier

Purpose:
N-of-M governance approvals.

Input shape:

- signer set
- threshold

### SubscriptionVerifier

Purpose:
recurring scheduled approvals.

Input shape:

- receiver / target
- cadence
- expiry / max usage

## Market Readiness

When listing an AA address in the market, publish at minimum:

- active verifier profile
- active hook profile
- backup owner / escape expectations
- whether transfer requires a verifier rotation after purchase

That lets buyers understand whether they are purchasing a clean shell or a heavily opinionated policy stack.

For trustless escrow sales, the market should transfer only the AA shell. Existing verifier and hook bindings are cleared during settlement, and the buyer should configure fresh plugins in the app workspace after purchase.
