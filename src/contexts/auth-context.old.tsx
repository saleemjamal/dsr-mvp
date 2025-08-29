"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getUserProfile, UserProfile } from '@/lib/user-service'

export interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, userData?: { full_name?: string }) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      if (!mounted) return
      
      setLoading(true)
      try {
        // Try to refresh session first
        let session = null
        try {
          const { data, error } = await supabase.auth.refreshSession()
          if (error) {
            console.log('Session refresh error, getting current session:', error)
            // Fallback to getting current session
            const result = await supabase.auth.getSession()
            session = result.data?.session
          } else {
            session = data?.session
          }
        } catch (refreshError) {
          console.log('Session refresh failed, getting current session:', refreshError)
          // Fallback to getting current session
          const { data } = await supabase.auth.getSession()
          session = data?.session
        }
        
        if (!mounted) return
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadUserProfile(session.user.id)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    initializeAuth()
    
    return () => {
      mounted = false
    }
  }, [])
  
  useEffect(() => {
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await loadUserProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false) // Only set loading false when there's no user
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      const userProfile = await getUserProfile(userId)
      
      if (!userProfile) {
        console.log('No user profile found for user:', userId)
        // Create a default profile for new Google users
        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user?.email) {
          console.log('Creating default profile for:', userData.user.email)
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              email: userData.user.email,
              full_name: userData.user.user_metadata?.full_name || userData.user.email.split('@')[0],
              role: 'cashier', // Default role
              is_active: true
            })
            .select()
          
          if (createError) {
            console.error('Error creating profile:', createError)
            // Don't sign out - let admin create profile manually
            setProfile(null)
            setLoading(false)
            return
          } else if (newProfile && newProfile.length > 0) {
            setProfile(newProfile[0])
            setLoading(false)
            return
          }
        }
        setProfile(null)
        setLoading(false)
        return
      }
      
      // Check if user is active - if not, sign them out
      if (!userProfile.is_active) {
        console.log('User is inactive, signing out')
        await supabase.auth.signOut()
        setProfile(null)
        setUser(null)
        setSession(null)
        return
      }
      
      setProfile(userProfile)
    } catch (error) {
      console.error('Error loading user profile:', error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      return { error }
    } finally {
      // Always reset loading, OAuth redirect will handle the rest
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, userData?: { full_name?: string }) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setSession(null)
      // Force redirect to login after logout
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      // Always clear loading state
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) throw new Error('No user logged in')
    
    // Update profile in database via user service
    // This would be implemented in user-service.ts
    // const updatedProfile = await updateUserProfile(user.id, updates)
    // setProfile(updatedProfile)
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}