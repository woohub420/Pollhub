export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

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
