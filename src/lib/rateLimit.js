// Client-side spam-prevention only — this in-memory store resets on page
// reload and is trivially bypassable, so it is not a security boundary.
// Real enforcement (Turnstile bot check, DB constraints, RLS) happens
// elsewhere; this just keeps a normal user from accidentally spamming.
const timestamps = {}

export function checkRateLimit(key, maxCount, windowMs) {
  const now = Date.now()
  if (!timestamps[key]) timestamps[key] = []

  timestamps[key] = timestamps[key].filter((t) => now - t < windowMs)

  if (timestamps[key].length >= maxCount) {
    const waitMs = windowMs - (now - timestamps[key][0])
    const waitSec = Math.ceil(waitMs / 1000)
    throw new Error(`Too many requests. Please wait ${waitSec} seconds.`)
  }

  timestamps[key].push(now)
  return true
}

export const LIMITS = {
  CREATE_POLL: { max: 5, window: 60_000 },
  CREATE_COMMENT: { max: 10, window: 60_000 },
  CREATE_REPLY: { max: 10, window: 60_000 },
  VOTE: { max: 20, window: 60_000 },
  LIKE: { max: 30, window: 60_000 },
  SEARCH: { max: 20, window: 60_000 },
  FOLLOW: { max: 15, window: 60_000 },
}
