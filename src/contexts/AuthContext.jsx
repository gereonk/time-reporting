import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single()

    if (error) {
      logError('AuthContext.fetchProfile', 'Failed to fetch user profile', error.message)
      console.error('Error fetching profile:', error)
      return null
    }
    return data
  }

  useEffect(() => {
    let cancelled = false

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session?.user) {
        setUser(session.user)
        const prof = await fetchProfile(session.user.id)
        if (!cancelled) setProfile(prof)
      }
      if (!cancelled) setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return
        if (session?.user) {
          setUser(session.user)
          const prof = await fetchProfile(session.user.id)
          if (!cancelled) setProfile(prof)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      logError('AuthContext.signIn', 'Sign in failed', error.message)
      throw error
    }
    return data
  }

  const signUp = async (email, password) => {
    if (!email.endsWith('svt.se')) {
      throw new Error('Only svt.se email addresses are allowed to register.')
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      logError('AuthContext.signOut', 'Sign out failed', error.message)
      throw error
    }
    setUser(null)
    setProfile(null)
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
