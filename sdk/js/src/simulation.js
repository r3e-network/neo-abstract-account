/**
 * Simulation helpers for pre-flight validation of UserOperations.
 * Provides methods to check execution conditions before submission.
 */

const { EC, createError, mapRpcError } = require('./errors');
const { validateHash160, validateAccountId, sanitizeHex } = require('./validation');

/**
 * Result of a UserOperation simulation.
 * @typedef {Object} SimulationResult
 * @property {boolean} passed - Whether all checks passed
 * @property {Object} checks - Individual check results
 * @property {boolean} checks.deadlineValid - Deadline is in the future
 * @property {boolean} checks.nonceAcceptable - Nonce is valid and unused
 * @property {boolean} checks.hasVerifier - Verifier is configured
 * @property {string} checks.verifier - Verifier contract hash
 * @property {string} checks.hook - Hook contract hash
 * @property {Array} errors - List of error messages (if any)
 * @property {Array} warnings - List of warnings (if any)
 */

/**
 * Simulates a UserOperation before submission.
 * Calls getUserOpValidationPreview to check execution conditions.
 *
 * @param {AbstractAccountClient} client - The SDK client instance
 * @param {Object} options - Simulation options
 * @param {string} options.accountIdHash - Account ID hash
 * @param {string} options.accountAddress - Legacy account address (alternative)
 * @param {string} options.targetContract - Target contract hash
 * @param {string} options.method - Method name
 * @param {Array} options.args - Method arguments
 * @param {string|number} options.nonce - Nonce value
 * @param {string|number} options.deadline - Deadline timestamp
 * @returns {Promise<SimulationResult>} Simulation results
 *
 * @example
 * const result = await simulateUserOperation(client, {
 *   accountIdHash: 'f951...',
 *   targetContract: '49c0...',
 *   method: 'transfer',
 *   args: [],
 *   nonce: 0,
 *   deadline: Math.floor(Date.now() / 1000) + 3600,
 * });
 *
 * if (!result.passed) {
 *   console.error('Simulation failed:', result.errors);
 *   throw new Error(result.errors[0]);
 * }
 */
async function simulateUserOperation(client, options) {
  const {
    accountIdHash = '',
    accountAddress = '',
    targetContract,
    method,
    args = [],
    nonce,
    deadline,
  } = options || {};

  const errors = [];
  const warnings = [];

  // Basic validation
  if (!accountIdHash && !accountAddress) {
    return {
      passed: false,
      checks: {},
      errors: ['Account ID hash or address is required'],
      warnings,
    };
  }

  if (!targetContract) {
    return {
      passed: false,
      checks: {},
      errors: ['Target contract is required'],
      warnings,
    };
  }

  if (!method) {
    return {
      passed: false,
      checks: {},
      errors: ['Method name is required'],
      warnings,
    };
  }

  // Validate deadline is in the future
  const now = Math.floor(Date.now() / 1000);
  const deadlineNum = BigInt(deadline || 0);
  const isDeadlineValid = deadlineNum > BigInt(now);

  if (!isDeadlineValid) {
    errors.push(`Deadline has passed. Current: ${now}, Deadline: ${deadlineNum}`);
  } else if (deadlineNum > BigInt(now) + BigInt(86400 * 7)) {
    // Warn if deadline is more than 7 days in the future
    warnings.push(`Deadline is more than 7 days in the future (${Math.floor((deadlineNum - BigInt(now)) / 3600)} hours)`);
  }

  try {
    // Call the contract's previewUserOpValidation method
    const preview = await client.getUserOpValidationPreview({
      accountIdHash,
      accountAddress,
      targetContract,
      method,
      args,
      nonce: nonce || 0,
      deadline: deadline || 0,
    });

    const checks = {
      deadlineValid: isDeadlineValid && Boolean(preview.deadlineValid),
      nonceAcceptable: Boolean(preview.nonceAcceptable),
      hasVerifier: Boolean(preview.hasVerifier),
      verifier: preview.verifier || '',
      hook: preview.hook || '',
    };

    // Analyze results
    if (!checks.nonceAcceptable) {
      errors.push('Nonce is not acceptable. It may have already been used or is out of range.');
    }

    if (!checks.hasVerifier || !checks.verifier) {
      errors.push('No verifier configured. A verifier is required for signature validation.');
    }

    // Additional checks based on preview
    if (preview.hook && !isDeadlineValid) {
      warnings.push('Hook is configured but deadline validation may cause rejection');
    }

    return {
      passed: errors.length === 0,
      checks,
      errors,
      warnings,
    };
  } catch (error) {
    const mappedError = mapRpcError(error);
    if (mappedError) {
      errors.push(mappedError.message);
    } else {
      errors.push(error.message || 'Unknown simulation error');
    }
    return {
      passed: false,
      checks: {},
      errors,
      warnings,
    };
  }
}

/**
 * Checks if a verifier is valid for the account.
 * @param {AbstractAccountClient} client - The SDK client instance
 * @param {string} accountHashOrAddress - Account hash or address
 * @param {string} verifierHash - Verifier contract hash to check
 * @returns {Promise<Object>} Check result with valid flag and details
 */
async function checkVerifier(client, accountHashOrAddress, verifierHash) {
  try {
    const accountState = await client.getAccountState(accountHashOrAddress);
    const currentVerifier = accountState.verifier;

    return {
      valid: currentVerifier === sanitizeHex(verifierHash),
      currentVerifier,
      expectedVerifier: sanitizeHex(verifierHash),
      configured: Boolean(currentVerifier),
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Checks if a hook is valid for the account.
 * @param {AbstractAccountClient} client - The SDK client instance
 * @param {string} accountHashOrAddress - Account hash or address
 * @param {string} hookHash - Hook contract hash to check (optional)
 * @returns {Promise<Object>} Check result with valid flag and details
 */
async function checkHook(client, accountHashOrAddress, hookHash) {
  try {
    const accountState = await client.getAccountState(accountHashOrAddress);
    const currentHook = accountState.hook;

    if (!hookHash) {
      // Just check if any hook is configured
      return {
        valid: Boolean(currentHook),
        currentHook,
        configured: Boolean(currentHook),
      };
    }

    return {
      valid: currentHook === sanitizeHex(hookHash),
      currentHook,
      expectedHook: sanitizeHex(hookHash),
      configured: Boolean(currentHook),
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Checks if the account's escape hatch is active.
 * @param {AbstractAccountClient} client - The SDK client instance
 * @param {string} accountHashOrAddress - Account hash or address
 * @returns {Promise<Object>} Check result with escape status
 */
async function checkEscapeStatus(client, accountHashOrAddress) {
  try {
    const accountState = await client.getAccountState(accountHashOrAddress);

    return {
      active: Boolean(accountState.escapeActive),
      triggeredAt: accountState.escapeTriggeredAt,
      timelock: accountState.escapeTimelock,
      hasTimelockExpired: accountState.escapeActive &&
                          (Date.now() / 1000 > parseInt(accountState.escapeTriggeredAt, 10) +
                                                parseInt(accountState.escapeTimelock, 10)),
    };
  } catch (error) {
    return {
      active: false,
      error: error.message,
    };
  }
}

/**
 * Estimates gas for a UserOperation.
 * Note: This requires the contract to support gas estimation.
 * @param {AbstractAccountClient} client - The SDK client instance
 * @param {Object} userOp - The UserOperation to estimate
 * @returns {Promise<Object>} Gas estimate or error
 */
async function estimateGas(client, userOp) {
  // This is a placeholder - actual implementation depends on contract support
  // for gas estimation. In Neo N3, gas is determined by the VM during execution.
  return {
    supported: false,
    message: 'Gas estimation is not directly supported. Use simulation instead.',
  };
}

/**
 * Runs a comprehensive pre-flight check suite.
 * @param {AbstractAccountClient} client - The SDK client instance
 * @param {Object} options - Check options
 * @returns {Promise<Object>} Comprehensive check results
 */
async function preFlightCheck(client, options) {
  const {
    accountHashOrAddress,
    verifierHash,
    hookHash,
    userOp,
  } = options || {};

  const results = {
    passed: true,
    checks: {},
    errors: [],
    warnings: [],
  };

  // 1. Check account exists
  try {
    const accountState = await client.getAccountState(accountHashOrAddress);
    results.checks.accountExists = true;
    results.checks.accountState = accountState;
  } catch (error) {
    results.passed = false;
    results.checks.accountExists = false;
    results.errors.push('Account not found or not registered');
    return results;
  }

  // 2. Check escape status
  const escapeStatus = await checkEscapeStatus(client, accountHashOrAddress);
  results.checks.escape = escapeStatus;

  if (escapeStatus.active) {
    if (escapeStatus.hasTimelockExpired) {
      results.warnings.push('Escape hatch timelock has expired. Account may be in recovery mode.');
    } else {
      results.warnings.push('Escape hatch is active. Operations may be restricted.');
    }
  }

  // 3. Check verifier
  if (verifierHash) {
    const verifierCheck = await checkVerifier(client, accountHashOrAddress, verifierHash);
    results.checks.verifier = verifierCheck;

    if (!verifierCheck.valid) {
      results.passed = false;
      results.errors.push(`Verifier mismatch. Current: ${verifierCheck.currentVerifier}, Expected: ${verifierCheck.expectedVerifier}`);
    }
  }

  // 4. Check hook
  if (hookHash) {
    const hookCheck = await checkHook(client, accountHashOrAddress, hookHash);
    results.checks.hook = hookCheck;

    if (!hookCheck.valid) {
      results.passed = false;
      results.errors.push(`Hook mismatch. Current: ${hookCheck.currentHook}, Expected: ${hookCheck.expectedHook}`);
    }
  }

  // 5. Simulate UserOperation if provided
  if (userOp) {
    const simResult = await simulateUserOperation(client, userOp);
    results.checks.simulation = simResult;

    if (!simResult.passed) {
      results.passed = false;
      results.errors.push(...simResult.errors);
    }

    if (simResult.warnings.length > 0) {
      results.warnings.push(...simResult.warnings);
    }
  }

  return results;
}

module.exports = {
  simulateUserOperation,
  checkVerifier,
  checkHook,
  checkEscapeStatus,
  estimateGas,
  preFlightCheck,
};
