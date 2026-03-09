# Security & Production Readiness Improvements - 2026-03-09

This note summarizes the currently implemented hardening slice and the verification that was actually run for it.

## Implemented Changes

### 1. Smart contract input validation
- **File**: `contracts/AbstractAccount.MetaTx.cs`
- **Change**: added explicit 65-byte uncompressed pubkey length validation before signature verification
- **Why**: rejects malformed pubkey payloads earlier in the meta-tx flow

### 2. Project isolation for repo-wide C# builds
- **File**: `contracts/AbstractAccount.csproj`
- **Change**: disabled default compile globbing and explicitly included the intended contract sources
- **Why**: prevents `contracts/recovery/obj` intermediates from polluting the main contract build

### 3. Relay and operator API rate limiting
- **Files**: `frontend/api/rateLimiter.js`, `frontend/api/relay-transaction.js`, `frontend/api/draft-operator.js`
- **Change**: added a simple in-memory request limiter and `Retry-After` responses on 429s
- **Why**: reduces abuse risk for relay/operator endpoints and gives clients a usable retry signal

### 4. Relay error sanitization
- **File**: `frontend/api/relay-transaction.js`
- **Change**: normalizes exposed error messages for common VM / auth / nonce / expiry failures
- **Why**: avoids leaking raw internal exception details back to clients

### 5. Frontend security headers
- **File**: `frontend/vercel.json`
- **Change**: adds `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, and `Permissions-Policy`
- **Why**: improves browser-side baseline protections for the deployed frontend

### 6. Draft query indexes
- **File**: `supabase/migrations/20260309_add_performance_indexes.sql`
- **Change**: adds indexes for `share_slug`, `operator_slug`, `collaboration_slug`, `status`, and descending `created_at`
- **Why**: improves common draft lookup/query paths

## Verification Actually Run

```bash
cd frontend && npm test -- tests/apiSecurity.test.js
cd frontend && npm run build
dotnet test neo-abstract-account.sln -c Release --nologo
node --test sdk/js/tests/projectIsolation.unit.test.js
```

## Notes

- This file is a factual implementation summary, not a formal third-party audit.
- Additional hardening work can still be done later, such as stricter persistence-backed rate limiting or a full CSP review.
