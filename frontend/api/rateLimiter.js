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
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    const response = await fetch(`${client.url}/zrangebyscore/${key}/${windowStart}/${now}`, {
      headers: { Authorization: `Bearer ${client.token}` },
    });
    const currentCount = response.ok ? parseInt(await response.text(), 10) : 0;

    if (currentCount >= MAX_REQUESTS) {
      const oldest = await fetch(`${client.url}/zrange/${key}/0/0`, {
        headers: { Authorization: `Bearer ${client.token}` },
      });
      const oldestTime = oldest.ok ? parseInt(await oldest.text(), 10) : now;
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((oldestTime + WINDOW_MS - now) / 1000),
      };
    }

    await fetch(`${client.url}/zadd/${key}/${now}/${now}:${Math.random()}`, {
      headers: { Authorization: `Bearer ${client.token}` },
    });
    await fetch(`${client.url}/expire/${key}/120`, {
      headers: { Authorization: `Bearer ${client.token}` },
    });

    return { allowed: true, remaining: MAX_REQUESTS - currentCount - 1 };
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
