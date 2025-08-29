"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/user-service'
import { signOut } from '@/lib/auth-helpers'

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        // Get profile by user ID
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .then(({ data }) => {
            if (data && data.length > 0) {
              setProfile(data[0] as UserProfile)
            }
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })
  }, [])

  const signInWithGoogle = async () => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    })
  }

  const signUp = async (email: string, password: string, userData?: { full_name?: string }) => {
    return supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: userData
      }
    })
  }

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  return { user, profile, loading, signOut, signInWithGoogle, signUp, signIn }
}