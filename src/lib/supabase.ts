import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use the standard client for server-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Use auth-helpers client for components (handles SSR/SSG properly)
export const createSupabaseClient = () => createClientComponentClient()

// For server-side operations (if needed)
// Only create admin client if service role key is available
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey)
  : null