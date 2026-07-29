import { createClient } from '@supabase/supabase-js'

// Deletes the auth.users row for the calling user. profiles.id references
// auth.users on delete cascade, and every user-owned table (polls, votes,
// comments, likes, follows, notifications, poll_views, ...) references
// profiles(id) on delete cascade — so this one call removes everything.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authenticated' })
  }

  const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Never trust a client-provided user id — resolve it from the verified token.
  const {
    data: { user },
    error: userErr,
  } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' })
  }

  try {
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteErr) throw deleteErr
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Delete account error:', err)
    return res.status(500).json({ success: false, error: 'Could not delete account' })
  }
}
