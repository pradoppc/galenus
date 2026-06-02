interface RateLimitEntry {
  count:     number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

export function checkRateLimit(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now   = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.resetTime) {
    store.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

// Purge stale entries every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of store) {
      if (now > val.resetTime) store.delete(key)
    }
  }, 600_000)
}
