import { createContext, useContext, useEffect, useState } from 'react'
import posthog from 'posthog-js'
import { supabase } from './supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      setUser(session?.user ?? null)
      if (session?.user) await loadProfile(session.user.id, session.user)
      setLoading(false)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      if (session?.user) {
        if (event === 'SIGNED_IN') await ensureProfile(session.user)
        await loadProfile(session.user.id, session.user)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId, authUser) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_admin, created_at, theme')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data ?? null)

    if (data?.theme) {
      document.documentElement.setAttribute('data-theme', data.theme)
    }

    if (data && import.meta.env.VITE_POSTHOG_KEY) {
      posthog.identify(userId, {
        username: data.username,
        email: authUser?.email,
        created_at: data.created_at,
      })
    }
  }

  async function ensureProfile(user) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', user.id)
      .maybeSingle()

    if (!existing) {
      // Insert profile with NULL username — CompleteProfileModal will prompt them to choose
      await supabase
        .from('profiles')
        .upsert({ id: user.id, username: null }, { onConflict: 'id' })
    }
  }

  async function signUp(email, password, username) {
    const cleanUsername = username.toLowerCase().trim()
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle()
    if (existing) throw new Error('That username is already taken.')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: cleanUsername } },
    })
    if (error) throw error
    if (data.user) {
      await supabase
        .from('profiles')
        .upsert({ id: data.user.id, username: cleanUsername }, { onConflict: 'id' })
      await loadProfile(data.user.id)
    }
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    document.documentElement.removeAttribute('data-theme')
    if (import.meta.env.VITE_POSTHOG_KEY) posthog.reset()
  }

  const value = { user, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
