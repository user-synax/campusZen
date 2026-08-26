// Founder username from env 
export const FOUNDER_USERNAME = process.env.NEXT_PUBLIC_FOUNDER_USERNAME || '' 

// Server-side check (use in API routes) 
export function isFounder(username) { 
  if (!username || !FOUNDER_USERNAME) return false 
  return username.toLowerCase() === FOUNDER_USERNAME.toLowerCase() 
} 

// Founder badge config — all badges the founder gets 
export const FOUNDER_BADGES = [ 
  { id: 'founder', label: 'Founder', emoji: '⚡', color: '#f59e0b', tooltip: 'Built CampusZ en from scratch' }, 
  { id: 'developer', label: 'Developer', emoji: '🛠️', color: '#3b82f6', tooltip: 'Full-stack developer of CampusZen' }, 
  { id: 'admin', label: 'Admin', emoji: '👑', color: '#8b5cf6', tooltip: 'Platform administrator' }, 
] 

// XP multiplier for founder (display only — no actual XP inflation) 
export const FOUNDER_LEVEL_TITLE = 'Creator' 

// Launch date for "Day X" display 
export const LAUNCH_DATE = new Date(process.env.NEXT_PUBLIC_APP_LAUNCH_DATE || Date.now()) 

export function getDaysSinceLaunch() { 
  const diff = Date.now() - LAUNCH_DATE.getTime() 
  if (diff < 0) return 1
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1 
} 
