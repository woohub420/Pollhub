// In-memory per-instance rate limit — resets on cold start and isn't shared
// across instances, so this is a soft speed bump, not a hard guarantee.
const ipRequests = {}
const IP_LIMIT = 10
const IP_WINDOW_MS = 60_000

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()
  const recent = (ipRequests[ip] ?? []).filter((t) => now - t < IP_WINDOW_MS)
  if (recent.length >= IP_LIMIT) {
    return res.status(429).json({ success: false, error: 'Too many requests' })
  }
  ipRequests[ip] = [...recent, now]

  const { token } = req.body ?? {}
  if (!token) {
    return res.status(400).json({ success: false, error: 'No token provided' })
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    })
    const data = await response.json()
    return res.status(200).json({ success: data.success === true })
  } catch (err) {
    console.error('Turnstile verify error:', err)
    return res.status(500).json({ success: false, error: 'Verification failed' })
  }
}
