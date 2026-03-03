/**
 * Rate limiter por IP usando un Map en memoria.
 * Se resetea con cada deploy — aceptable para MVP sin auth.
 *
 * Límites por endpoint (SPEC sección 7):
 *   /api/analyze          → 5 req/min
 *   /api/analyze-template → 3 req/min
 *   /api/generate         → 5 req/min
 *   /api/templates        → 30 req/min
 */
const requests = new Map();

export function rateLimit(ip, { maxRequests = 10, windowMs = 60000 } = {}) {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!requests.has(ip)) {
    requests.set(ip, []);
  }

  const timestamps = requests.get(ip).filter(t => t > windowStart);

  if (timestamps.length >= maxRequests) {
    const retryAfterMs = timestamps[0] + windowMs - now;
    return { allowed: false, retryAfterMs };
  }

  timestamps.push(now);
  requests.set(ip, timestamps);
  return { allowed: true };
}

// Limpiar entradas viejas cada 5 minutos para evitar memory leaks
setInterval(() => {
  const cutoff = Date.now() - 300000;
  for (const [ip, times] of requests) {
    const filtered = times.filter(t => t > cutoff);
    if (filtered.length === 0) requests.delete(ip);
    else requests.set(ip, filtered);
  }
}, 300000);
