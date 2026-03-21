const WINDOW_MS = 60000;
const MAX_REQUESTS = 10;

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function rateLimitWithRedis(identifier) {
  const client = getRedisClient();
  if (!client) return null;

  const key = `ratelimit:${identifier}`;

  try {
    const response = await fetch(`${client.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${client.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['PTTL', key],
      ]),
    });
    if (!response.ok) return null;

    const result = await response.json();
    const count = Number(result?.[0]?.result || 0);
    let ttl = Number(result?.[1]?.result || -1);

    if (count <= 1 || ttl < 0) {
      await fetch(`${client.url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${client.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['PEXPIRE', key, String(WINDOW_MS)],
        ]),
      });
      ttl = WINDOW_MS;
    }

    if (count > MAX_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(Math.ceil(ttl / 1000), 1),
      };
    }

    return { allowed: true, remaining: Math.max(MAX_REQUESTS - count, 0) };
  } catch {
    return null;
  }
}

const inMemoryRequests = new Map();

function rateLimitInMemory(identifier) {
  const now = Date.now();
  const key = String(identifier);

  if (!inMemoryRequests.has(key)) {
    inMemoryRequests.set(key, [now]);
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  const timestamps = inMemoryRequests.get(key).filter(t => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000) };
  }

  timestamps.push(now);
  inMemoryRequests.set(key, timestamps);

  return { allowed: true, remaining: MAX_REQUESTS - timestamps.length };
}

export async function checkRateLimit(identifier) {
  const redisResult = await rateLimitWithRedis(identifier);
  if (redisResult !== null) return redisResult;
  return rateLimitInMemory(identifier);
}

export function sanitizeError(error) {
  const message = String(error?.message || error || 'Unknown error');

  if (message.includes('fault') || message.includes('FAULT')) {
    return 'Transaction simulation failed';
  }

  if (message.includes('Not Deployer') || message.includes('Unauthorized')) {
    return 'Unauthorized operation';
  }

  if (message.includes('nonce') || message.includes('Nonce')) {
    return 'Invalid transaction nonce';
  }

  if (message.includes('expired') || message.includes('deadline')) {
    return 'Transaction signature expired';
  }

  return 'Transaction failed';
}
