// Simple in-memory rate limiter
const requests = new Map();
const WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS = 10;

export function checkRateLimit(identifier) {
  const now = Date.now();
  const key = String(identifier);
  
  if (!requests.has(key)) {
    requests.set(key, [now]);
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }
  
  const timestamps = requests.get(key).filter(t => now - t < WINDOW_MS);
  
  if (timestamps.length >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000) };
  }
  
  timestamps.push(now);
  requests.set(key, timestamps);
  
  return { allowed: true, remaining: MAX_REQUESTS - timestamps.length };
}

export function sanitizeError(error) {
  const message = String(error?.message || error || 'Unknown error');
  
  // Remove sensitive VM stack traces and internal details
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
  
  // Generic fallback
  return 'Transaction failed';
}
