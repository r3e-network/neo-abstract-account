import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_OPERATIONS_PREFERENCES,
  createOperationsPreferences,
} from '../src/features/operations/preferences.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
}

test('operations preferences expose stable defaults', () => {
  assert.deepEqual(DEFAULT_OPERATIONS_PREFERENCES, {
    relayPayloadMode: {},
    activityFilter: {},
  });
});

test('relay payload mode persists by view key', () => {
  const storage = createMemoryStorage();
  const preferences = createOperationsPreferences({ storage });

  assert.equal(preferences.getRelayPayloadMode('home'), 'best');
  preferences.setRelayPayloadMode('home', 'meta');
  preferences.setRelayPayloadMode('shared-draft', 'raw');

  assert.equal(preferences.getRelayPayloadMode('home'), 'meta');
  assert.equal(preferences.getRelayPayloadMode('shared-draft'), 'raw');
});

test('activity filter persists by view key and falls back safely', () => {
  const storage = createMemoryStorage();
  const preferences = createOperationsPreferences({ storage });

  assert.equal(preferences.getActivityFilter('sidebar'), 'all');
  preferences.setActivityFilter('sidebar', 'relay');

  assert.equal(preferences.getActivityFilter('sidebar'), 'relay');
  assert.equal(preferences.getActivityFilter('shared'), 'all');
});
