import { NextResponse } from 'next/server'

const requests = new Map()

export function rateLimit(key, limit, windowMs) {
  const now = Date.now()
  const windowStart = now - windowMs

  // Get or create entry 
  if (!requests.has(key)) {
    requests.set(key, [])
  }

  // Clean old requests outside window 
  const timestamps = requests.get(key).filter(t => t > windowStart)
  requests.set(key, timestamps)

  if (timestamps.length >= limit) {
    // Calculate retry-after 
    const oldestInWindow = timestamps[0]
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000)
    return {
      allowed: false,
      retryAfter,
      remaining: 0
    }
  }

  // Add current request 
  timestamps.push(now)
  return {
    allowed: true,
    remaining: limit - timestamps.length
  }
}

// Get client IP from request (works behind proxies like Vercel) 
export function getClientIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

// Helper: apply rate limit and return error response if exceeded 
export function applyRateLimit(request, key, limit, windowMs) {
  const ip = getClientIP(request)
  const result = rateLimit(`${key}_${ip}`, limit, windowMs)

  if (!result.allowed) {
    return {
      blocked: true,
      response: NextResponse.json(
        { error: `Too many requests. Try again in ${result.retryAfter} seconds.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfter),
            'X-RateLimit-Remaining': '0'
          }
        }
      )
    }
  }
  return { blocked: false }
} 
