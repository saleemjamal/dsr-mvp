import { supabase } from './supabase'
import { UserProfile } from './user-service'

export async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { user: null, profile: null }
  }

  // Get user profile by ID
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
  
  if (error || !profile || profile.length === 0) {
    console.error('User profile not found:', session.user.email)
    return { user: session.user, profile: null }
  }

  const userProfile = profile[0] as UserProfile

  // Check if user is active
  if (!userProfile.is_active) {
    await supabase.auth.signOut()
    return { user: null, profile: null }
  }

  return { user: session.user, profile: userProfile }
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  })
}

export async function signOut() {
  await supabase.auth.signOut()
  window.location.href = '/auth/login'
}