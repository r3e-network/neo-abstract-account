# Dome Social Recovery Network

The "Dome" is a built-in social recovery network designed to restore access if primary Admin keys are lost or compromised. 

Instead of relying on a centralized custodian, users define a list of trusted **Dome Accounts** (friends, secondary hardware wallets, legal entities). To prevent these actors from arbitrarily assuming control, the protocol enforces strict temporal constraints.

## Recovery Lifecycle

1. **Inactivity Timeout:** Admins configure a `Timeout` value in seconds. The Dome network is completely locked out of the contract while the account is active.
2. **Time Decay:** Every time an Admin or Manager executes a valid transaction, the inactivity timer resets.
3. **Activation:** If the timeout period elapses with zero activity, the Dome threshold criteria becomes valid. This allows the trusted actors to issue an emergency operation to reset the Admin keys or execute payloads on behalf of the account.
4. **Oracle Integration (Optional):** Admins can specify a web endpoint (`DomeOracleUrl`). Upon timeout, the Dome network must also receive a cryptographic signature from this external Oracle confirming that external real-world conditions (e.g., KYC verifications or legal proceedings) have been met before unlocking the proxy. This serves as a secondary 2FA layer to the recovery process.