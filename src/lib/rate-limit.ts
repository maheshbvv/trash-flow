const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 30

export function rateLimit(ip: string): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS })
    return { success: true, remaining: MAX_REQUESTS - 1, resetTime: now + WINDOW_MS }
  }

  if (record.count >= MAX_REQUESTS) {
    return { success: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count++
  return { success: true, remaining: MAX_REQUESTS - record.count, resetTime: record.resetTime }
}

setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60 * 1000)
