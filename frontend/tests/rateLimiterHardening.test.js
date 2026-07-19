import test from 'node:test';
import assert from 'node:assert/strict';

import { checkRateLimit, resolveRateLimitFailure } from '../api/rateLimiter.js';

// AA-07 regression coverage:
//  (a) the in-memory fallback store must be BOUNDED (LRU-style cap, oldest-first eviction) —
//      previously it grew forever per instance under hostile identifier churn;
//  (b) a configured-but-failing Redis backend must not silently fail OPEN: production fails
//      closed (clear 503 + loud log), non-production falls back to the in-memory limiter
//      with a warning.

const ENV_KEYS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NODE_ENV',
  'VERCEL_ENV',
  'AA_RATE_LIMIT_IN_MEMORY_MAX',
];

function snapshotEnv() {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

test('AA-07: in-memory fallback store is bounded and evicts the least-recently-used identifier first', async () => {
  const snapshot = snapshotEnv();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.AA_RATE_LIMIT_IN_MEMORY_MAX = '50';

  try {
    // Fill the victim's bucket (10 req/min) so it is rate limited.
    const victim = uniqueId('victim-old');
    for (let i = 0; i < 10; i += 1) {
      assert.equal((await checkRateLimit(victim)).allowed, true, `victim request ${i} allowed`);
    }
    assert.equal((await checkRateLimit(victim)).allowed, false, 'victim is rate limited at the cap');

    // Churn 50 fresh identifiers through a store capped at 50 entries. The victim's entry is
    // the least-recently-used, so the bounded store must evict it (previously it grew forever).
    const recent = uniqueId('churn-recent');
    let recentId = '';
    for (let i = 0; i < 50; i += 1) {
      recentId = i === 49 ? recent : uniqueId(`churn-${i}`);
      assert.equal((await checkRateLimit(recentId)).allowed, true, `churn request ${i} allowed`);
    }

    // The victim's stale bucket was evicted: it gets a fresh window instead of a 429.
    assert.equal((await checkRateLimit(victim)).allowed, true, 'evicted victim starts a fresh window');

    // Eviction was oldest-first, not a wholesale clear: the most recent identifier's bucket
    // survives and still enforces the per-identifier limit.
    for (let i = 1; i < 10; i += 1) {
      assert.equal((await checkRateLimit(recent)).allowed, true, `recent request ${i} allowed`);
    }
    assert.equal((await checkRateLimit(recent)).allowed, false, 'recent identifier is still rate limited');
  } finally {
    restoreEnv(snapshot);
  }
});

test('AA-07: Redis failure fails closed in production with a loud log and a clear 503', async () => {
  const snapshot = snapshotEnv();
  const originalFetch = global.fetch;
  const originalError = console.error;
  const originalWarn = console.warn;
  const errorLogs = [];
  const warnLogs = [];

  process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.invalid';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  process.env.NODE_ENV = 'production';
  global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  console.error = (...args) => errorLogs.push(args.join(' '));
  console.warn = (...args) => warnLogs.push(args.join(' '));

  try {
    const rate = await checkRateLimit(uniqueId('prod-client'));
    assert.equal(rate.allowed, false, 'production Redis outage rejects the request');
    assert.equal(rate.error, 'rate_limit_backend_unavailable');

    const failure = resolveRateLimitFailure(rate);
    assert.equal(failure.statusCode, 503, 'backend outage surfaces as a clear 5xx, not a client 429');
    assert.equal(failure.error, 'rate_limit_backend_unavailable');
    assert.ok(failure.retryAfter > 0, 'retryAfter hint present');

    assert.ok(
      errorLogs.some((line) => /production/i.test(line) && /fail/i.test(line)),
      'a loud error log marks the production fail-closed decision',
    );
  } finally {
    global.fetch = originalFetch;
    console.error = originalError;
    console.warn = originalWarn;
    restoreEnv(snapshot);
  }
});

test('AA-07: Redis failure fails open outside production (in-memory fallback) with a warning', async () => {
  const snapshot = snapshotEnv();
  const originalFetch = global.fetch;
  const originalError = console.error;
  const originalWarn = console.warn;
  const errorLogs = [];
  const warnLogs = [];

  process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.invalid';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  delete process.env.NODE_ENV;
  delete process.env.VERCEL_ENV;
  global.fetch = async () => { throw new Error('connect ECONNREFUSED'); };
  console.error = (...args) => errorLogs.push(args.join(' '));
  console.warn = (...args) => warnLogs.push(args.join(' '));

  try {
    const client = uniqueId('dev-client');
    const first = await checkRateLimit(client);
    assert.equal(first.allowed, true, 'non-production Redis outage allows the request');

    // The fallback is the in-memory limiter (best effort), not a blind allow: the per-client
    // window still decrements.
    assert.equal(first.remaining, 9, 'in-memory fallback still tracks the window');
    const second = await checkRateLimit(client);
    assert.equal(second.allowed, true);
    assert.equal(second.remaining, 8, 'in-memory window decrements across calls');

    assert.ok(
      warnLogs.some((line) => /in-memory/i.test(line) || /falling back/i.test(line)),
      'a warning log marks the non-production fail-open decision',
    );
    assert.equal(errorLogs.length, 0, 'no production alarm outside production');
  } finally {
    global.fetch = originalFetch;
    console.error = originalError;
    console.warn = originalWarn;
    restoreEnv(snapshot);
  }
});

test('AA-07: unconfigured Redis is not an outage — in-memory fallback stays silent even in production', async () => {
  const snapshot = snapshotEnv();
  const originalError = console.error;
  const originalWarn = console.warn;
  const errorLogs = [];
  const warnLogs = [];

  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.NODE_ENV = 'production';
  console.error = (...args) => errorLogs.push(args.join(' '));
  console.warn = (...args) => warnLogs.push(args.join(' '));

  try {
    const rate = await checkRateLimit(uniqueId('self-hosted-client'));
    assert.equal(rate.allowed, true, 'no Redis configured means the in-memory limiter answers');
    assert.equal(errorLogs.length, 0, 'unconfigured backend raises no production alarm');
    assert.equal(warnLogs.length, 0, 'unconfigured backend raises no warning either');
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
    restoreEnv(snapshot);
  }
});
