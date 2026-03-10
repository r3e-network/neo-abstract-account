# Post-Deploy Smoke Test

Use this checklist immediately after deploying a new frontend build.

## Goal

Confirm that the latest deployed frontend is actually live, not stale, and that the critical wallet, studio, docs, and operations flows still work.

## 1. Version and cache checks

- Confirm the deployed revision is the intended commit.
- Confirm the CDN / hosting cache has been refreshed.
- Hard refresh the browser once after deployment.
- If a stale bundle still appears, clear site data and reload.

## 2. Browser console checks

Open the site with DevTools enabled and verify:

- no `t is not a function` errors
- no `No supported Neo wallet provider detected in browser.` error when NEOLine is installed
- no unexpected Vue render errors on first page load

## 3. Wallet Detection

With NEOLine installed, verify the frontend can detect module-style providers such as:

- `window.NEOLineN3.N3`
- `window.NEOLine.NEO`

Then:

- click the Neo wallet connect action
- confirm a wallet prompt or account response appears
- confirm the UI reflects the connected wallet state

## 4. Studio checks

Open each studio panel and confirm it renders without exceptions:

- Create Account
- Studio Sidebar
- Manage Governance
- Permissions & Limits

Expected result:

- panel titles and labels render normally
- no `t is not a function` console error appears

## 5. Operations checks

Verify the primary frontend flows still render:

- Home operations workspace loads
- Load Account panel renders
- Compose / signature / broadcast sections render
- Docs page opens
- Transaction info page renders if a draft or tx route is available

## 6. Relay and submission checks

If relay is enabled in the environment:

- verify relay preflight UI still renders
- verify operator actions do not fail immediately on load
- verify no new 5xx or malformed error messages appear in the UI

## 7. Pass criteria

The deployment passes this smoke test if:

- the intended build is live
- no runtime exceptions appear in console for core pages
- wallet detection works for supported providers
- studio panels render correctly
- operations pages remain usable

## 8. If the smoke test fails

Capture and report:

- deployed commit SHA
- loaded asset filenames from DevTools network panel
- exact console error text
- browser + extension version
- hosting platform or CDN details
