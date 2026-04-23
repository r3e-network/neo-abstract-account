/**
 * Event subscription helpers for the Neo Abstract Account SDK.
 * Provides utilities for listening to contract events.
 */

const { rpc } = require('./neonCompat');
const { EC, createError } = require('./errors');
const { validateHash160, sanitizeHex } = require('./validation');

// Export additional error codes for events
module.exports.EC = EC;

/**
 * Event names emitted by the Abstract Account contracts.
 */
const EVENT_NAMES = {
  // Module lifecycle events
  MODULE_INSTALLED: 'ModuleInstalled',
  MODULE_UPDATE_INITIATED: 'ModuleUpdateInitiated',
  MODULE_UPDATE_CONFIRMED: 'ModuleUpdateConfirmed',
  MODULE_UPDATE_CANCELLED: 'ModuleUpdateCancelled',
  MODULE_REMOVED: 'ModuleRemoved',

  // User operation events
  USER_OP_EXECUTED: 'UserOpExecuted',
  USER_OP_FAILED: 'UserOpFailed',

  // Verifier events
  VERIFIER_UPDATE_INITIATED: 'VerifierUpdateInitiated',
  VERIFIER_UPDATE_CONFIRMED: 'VerifierUpdateConfirmed',
  VERIFIER_UPDATE_CANCELLED: 'VerifierUpdateCancelled',

  // Hook events
  HOOK_UPDATE_INITIATED: 'HookUpdateInitiated',
  HOOK_UPDATE_CONFIRMED: 'HookUpdateConfirmed',
  HOOK_UPDATE_CANCELLED: 'HookUpdateCancelled',

  // Escape hatch events
  ESCAPE_TRIGGERED: 'EscapeTriggered',
  ESCAPE_COMPLETED: 'EscapeCompleted',
  ESCAPE_CANCELLED: 'EscapeCancelled',

  // Market escrow events
  MARKET_LISTING_CREATED: 'MarketListingCreated',
  MARKET_LISTING_FULFILLED: 'MarketListingFulfilled',
  MARKET_LISTING_CANCELLED: 'MarketListingCancelled',
};

/**
 * Event subscription class for monitoring contract events.
 */
class EventSubscription {
  constructor(rpcUrl, contractHash) {
    if (!rpcUrl) {
      throw createError(EC.VALIDATION_RPC_URL_REQUIRED);
    }
    if (!contractHash) {
      throw createError(EC.VALIDATION_CONTRACT_HASH_REQUIRED);
    }

    this.rpcUrl = rpcUrl;
    this.contractHash = sanitizeHex(contractHash);
    this.rpcClient = new rpc.RPCClient(rpcUrl);
    this.subscriptions = new Map();
    this.isClosed = false;
  }

  /**
   * Subscribes to an event by name.
   * Note: Neo N3 doesn't have native WebSocket event subscriptions.
   * This implementation polls for events at intervals.
   *
   * @param {string} eventName - The event name to listen for
   * @param {Function} callback - Callback function(event)
   * @param {Object} options - Subscription options
   * @param {number} options.pollInterval - Poll interval in ms (default: 5000)
   * @param {number} options.fromBlock - Start block height (default: current)
   * @returns {string} Subscription ID
   */
  async subscribe(eventName, callback, options = {}) {
    if (this.isClosed) {
      throw createError(EC.INTERNAL_SUBSCRIPTION_CLOSED);
    }

    const {
      pollInterval = 5000,
      fromBlock,
    } = options;

    // Validate event name
    if (!eventName || typeof eventName !== 'string') {
      throw createError(EC.INTERNAL_EVENT_NAME_REQUIRED);
    }

    const subscriptionId = `${eventName}_${Date.now()}`;
    let lastBlockHeight = fromBlock;

    if (!lastBlockHeight) {
      const blockCount = await this.rpcClient.getBlockCount();
      lastBlockHeight = blockCount;
    }

    const pollFn = async () => {
      if (this.isClosed) return;

      try {
        const currentBlock = await this.rpcClient.getBlockCount();
        if (currentBlock <= lastBlockHeight) {
          return;
        }

        // Get logs for the event
        const logs = await this.rpcClient.getApplicationLog(
          this.contractHash,
          lastBlockHeight,
          currentBlock
        );

        if (logs && Array.isArray(logs)) {
          for (const log of logs) {
            for (const notification of log.notifications || []) {
              const eventNameFromContract = notification.eventname;

              if (eventNameFromContract === eventName) {
                // Construct event object
                const event = {
                  contract: this.contractHash,
                  eventName: eventNameFromContract,
                  state: log.state,
                  txId: log.txid,
                  blockIndex: log.blockIndex,
                  timestamp: log.timestamp,
                  data: notification.state?.value || [],
                };

                try {
                  await callback(event);
                } catch (_callbackErr) {
                  // Swallow callback errors to avoid breaking the polling loop.
                  // Callers should handle errors within their own callback.
                }
              }
            }
          }
        }

        lastBlockHeight = currentBlock;
      } catch (_pollError) {
        // Polling failures are transient; the next interval will retry.
      }
    };

    // Start polling
    const intervalId = setInterval(pollFn, pollInterval);

    this.subscriptions.set(subscriptionId, {
      eventName,
      callback,
      intervalId,
      pollFn,
      lastBlockHeight,
      isActive: true,
    });

    return subscriptionId;
  }

  /**
   * Unsubscribes from an event.
   * @param {string} subscriptionId - The subscription ID
   */
  unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    if (subscription.intervalId) {
      clearInterval(subscription.intervalId);
    }

    subscription.isActive = false;
    this.subscriptions.delete(subscriptionId);
    return true;
  }

  /**
   * Unsubscribes from all events.
   */
  unsubscribeAll() {
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.intervalId) {
        clearInterval(subscription.intervalId);
      }
    }
    this.subscriptions.clear();
  }

  /**
   * Closes the subscription and cleans up resources.
   */
  close() {
    this.unsubscribeAll();
    this.isClosed = true;
  }

  /**
   * Gets past events for a specific event name.
   * @param {string} eventName - The event name
   * @param {Object} options - Query options
   * @param {number} options.fromBlock - Start block height
   * @param {number} options.toBlock - End block height (default: current)
   * @returns {Promise<Array>} Array of past events
   */
  async getPastEvents(eventName, options = {}) {
    const {
      fromBlock,
      toBlock,
    } = options;

    if (!fromBlock) {
      throw createError(EC.INTERNAL_FROM_BLOCK_REQUIRED);
    }

    const currentBlock = toBlock || await this.rpcClient.getBlockCount();
    const events = [];

    const logs = await this.rpcClient.getApplicationLog(
      this.contractHash,
      fromBlock,
      currentBlock
    );

    if (logs && Array.isArray(logs)) {
      for (const log of logs) {
        for (const notification of log.notifications || []) {
          if (notification.eventname === eventName) {
            events.push({
              contract: this.contractHash,
              eventName: notification.eventname,
              state: log.state,
              txId: log.txid,
              blockIndex: log.blockIndex,
              timestamp: log.timestamp,
              data: notification.state?.value || [],
            });
          }
        }
      }
    }

    return events;
  }

  /**
   * Gets a single past event by transaction ID.
   * @param {string} txId - The transaction ID
   * @param {string} eventName - The expected event name (optional)
   * @returns {Promise<Object|null>} The event object or null
   */
  async getEventByTxId(txId, eventName = null) {
    try {
      const appLog = await this.rpcClient.getApplicationLog(txId);

      if (!appLog || !appLog.notifications) {
        return null;
      }

      for (const notification of appLog.notifications) {
        if (!eventName || notification.eventname === eventName) {
          return {
            contract: this.contractHash,
            eventName: notification.eventname,
            state: appLog.state,
            txId: appLog.txid,
            blockIndex: appLog.blockIndex,
            timestamp: appLog.timestamp,
            data: notification.state?.value || [],
          };
        }
      }

      return null;
    } catch (error) {
      // Transaction may not exist or not yet finalized
      return null;
    }
  }

  /**
   * Waits for a specific event to occur.
   * @param {string} eventName - The event name to wait for
   * @param {Object} options - Wait options
   * @param {number} options.timeout - Timeout in ms (default: 60000)
   * @param {Function} options.filter - Optional filter function
   * @returns {Promise<Object>} The event object
   */
  async waitForEvent(eventName, options = {}) {
    const {
      timeout = 60000,
      filter,
    } = options;

    return new Promise((resolve, reject) => {
      let found = false;
      let timer = null;

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
        }
        const subId = Array.from(this.subscriptions.keys())
          .find(id => id.startsWith(eventName));
        if (subId) {
          this.unsubscribe(subId);
        }
      };

      const callback = async (event) => {
        if (filter && !filter(event)) {
          return;
        }
        found = true;
        cleanup();
        resolve(event);
      };

      const subscriptionId = this.subscribe(eventName, callback);

      timer = setTimeout(() => {
        if (found) return;
        cleanup();
        this.unsubscribe(subscriptionId);
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);
    });
  }
}

/**
 * Creates a new event subscription.
 * @param {string} rpcUrl - The RPC endpoint URL
 * @param {string} contractHash - The contract hash to monitor
 * @returns {EventSubscription} Event subscription instance
 */
function createEventSubscription(rpcUrl, contractHash) {
  return new EventSubscription(rpcUrl, contractHash);
}

/**
 * Helper function to listen for UserOperation execution.
 * @param {EventSubscription} subscription - The subscription instance
 * @param {Function} callback - Callback function
 * @param {Object} options - Subscription options
 * @returns {Promise<string>} Subscription ID
 */
async function listenForUserOpExecuted(subscription, callback, options = {}) {
  return subscription.subscribe(EVENT_NAMES.USER_OP_EXECUTED, callback, options);
}

/**
 * Helper function to listen for verifier updates.
 * @param {EventSubscription} subscription - The subscription instance
 * @param {Function} callback - Callback function
 * @param {Object} options - Subscription options
 * @returns {Promise<string>} Subscription ID
 */
async function listenForVerifierUpdates(subscription, callback, options = {}) {
  // Subscribe to all verifier-related events
  const subIds = [];

  const events = [
    EVENT_NAMES.VERIFIER_UPDATE_INITIATED,
    EVENT_NAMES.VERIFIER_UPDATE_CONFIRMED,
    EVENT_NAMES.VERIFIER_UPDATE_CANCELLED,
  ];

  for (const eventName of events) {
    const id = await subscription.subscribe(eventName, callback, options);
    subIds.push(id);
  }

  return subIds;
}

/**
 * Helper function to listen for hook updates.
 * @param {EventSubscription} subscription - The subscription instance
 * @param {Function} callback - Callback function
 * @param {Object} options - Subscription options
 * @returns {Promise<string>} Subscription IDs
 */
async function listenForHookUpdates(subscription, callback, options = {}) {
  const subIds = [];

  const events = [
    EVENT_NAMES.HOOK_UPDATE_INITIATED,
    EVENT_NAMES.HOOK_UPDATE_CONFIRMED,
    EVENT_NAMES.HOOK_UPDATE_CANCELLED,
  ];

  for (const eventName of events) {
    const id = await subscription.subscribe(eventName, callback, options);
    subIds.push(id);
  }

  return subIds;
}

/**
 * Helper function to listen for module lifecycle events.
 * @param {EventSubscription} subscription - The subscription instance
 * @param {Function} callback - Callback function
 * @param {Object} options - Subscription options
 * @returns {Promise<string>} Subscription IDs
 */
async function listenForModuleLifecycle(subscription, callback, options = {}) {
  const subIds = [];

  const events = [
    EVENT_NAMES.MODULE_INSTALLED,
    EVENT_NAMES.MODULE_UPDATE_INITIATED,
    EVENT_NAMES.MODULE_UPDATE_CONFIRMED,
    EVENT_NAMES.MODULE_UPDATE_CANCELLED,
    EVENT_NAMES.MODULE_REMOVED,
  ];

  for (const eventName of events) {
    const id = await subscription.subscribe(eventName, callback, options);
    subIds.push(id);
  }

  return subIds;
}

/**
 * Helper function to listen for escape hatch events.
 * @param {EventSubscription} subscription - The subscription instance
 * @param {Function} callback - Callback function
 * @param {Object} options - Subscription options
 * @returns {Promise<string>} Subscription IDs
 */
async function listenForEscapeHatch(subscription, callback, options = {}) {
  const subIds = [];

  const events = [
    EVENT_NAMES.ESCAPE_TRIGGERED,
    EVENT_NAMES.ESCAPE_COMPLETED,
    EVENT_NAMES.ESCAPE_CANCELLED,
  ];

  for (const eventName of events) {
    const id = await subscription.subscribe(eventName, callback, options);
    subIds.push(id);
  }

  return subIds;
}

/**
 * Helper function to listen for market escrow events.
 * @param {EventSubscription} subscription - The subscription instance
 * @param {Function} callback - Callback function
 * @param {Object} options - Subscription options
 * @returns {Promise<string>} Subscription IDs
 */
async function listenForMarketEvents(subscription, callback, options = {}) {
  const subIds = [];

  const events = [
    EVENT_NAMES.MARKET_LISTING_CREATED,
    EVENT_NAMES.MARKET_LISTING_FULFILLED,
    EVENT_NAMES.MARKET_LISTING_CANCELLED,
  ];

  for (const eventName of events) {
    const id = await subscription.subscribe(eventName, callback, options);
    subIds.push(id);
  }

  return subIds;
}

module.exports = {
  EVENT_NAMES,
  EventSubscription,
  createEventSubscription,
  listenForUserOpExecuted,
  listenForVerifierUpdates,
  listenForHookUpdates,
  listenForModuleLifecycle,
  listenForEscapeHatch,
  listenForMarketEvents,
};
