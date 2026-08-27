/**
 * Lightweight Sanitization Utility
 * 
 * NOTE: JSDOM and DOMPurify are too heavy for many serverless environments (Vercel)
 * and can cause 500 errors during module initialization.
 * We use a robust regex-based approach for server-side sanitization.
 */

// Sanitize text — removes HTML tags, XSS attempts
export function sanitizeText(input) {
  if (!input || typeof input !== 'string') return ''
  
  // 1. Remove script tags and their contents
  let clean = input.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
  
  // 2. Remove style tags and their contents
  clean = clean.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
  
  // 3. Remove all other HTML tags
  clean = clean.replace(/<[^>]*>?/gm, "")
  
  // 4. Decode common HTML entities (minimal)
  clean = clean
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")

  return clean.trim()
}
 
// Sanitize URL — ensure it's a valid http/https URL 
export function sanitizeURL(url) { 
  if (!url || typeof url !== 'string') return '' 
  try { 
    const parsed = new URL(url) 
    if (!['http:', 'https:'].includes(parsed.protocol)) return '' 
    return parsed.href 
  } catch { 
    return '' 
  } 
} 
 
// Sanitize username — alphanumeric + underscore only 
export function sanitizeUsername(username) { 
  if (!username) return '' 
  return username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) 
} 

// Strip MongoDB operators from user input and escape regex metacharacters so
// the value is safe to interpolate into a MongoDB `$regex` (prevents ReDoS and
// injection via attacker-controlled patterns).
export function sanitizeMongoInput(obj) { 
  if (typeof obj === 'string') { 
    // Remove $ prefix which MongoDB uses for operators, then escape regex
    // metacharacters so the string is treated literally inside $regex.
    return obj
      .replace(/^\$/, '')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  } 
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeMongoInput(item))
  }
  if (typeof obj === 'object' && obj !== null) { 
    const clean = {} 
    for (const [key, value] of Object.entries(obj)) { 
      // Skip keys starting with $ (MongoDB operators) 
      if (!key.startsWith('$')) { 
        clean[key] = sanitizeMongoInput(value) 
      } 
    } 
    return clean 
  } 
  return obj 
} 

const SENSITIVE_USER_FIELDS = [ 
  'password', 'blockedUsers', 'blockedBy', 
  'founderData', '__v', 'bookmarks', 'email' 
] 
 
export function sanitizeUser(userDoc) { 
  if (!userDoc) return null 
  const obj = typeof userDoc.toObject === 'function' 
    ? userDoc.toObject() 
    : { ...userDoc } 
 
  SENSITIVE_USER_FIELDS.forEach(field => delete obj[field]) 
  return obj 
} 
