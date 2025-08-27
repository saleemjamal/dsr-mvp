# Google SSO Setup Guide for DSR MVP

## 🔧 Step 1: Google Cloud Console Setup

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it something like "DSR Management System"

### 1.2 Enable Google+ API
1. Go to **APIs & Services > Library**
2. Search for "Google+ API" or "People API"
3. Click **Enable**

### 1.3 Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Configure the consent screen first if prompted:
   - Application type: **Web application**
   - Application name: **DSR Management System**
   - Add your domain to authorized domains
4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: **DSR MVP Web Client**
   - Authorized JavaScript origins:
     - `http://localhost:3000` (development)
     - `https://your-domain.com` (production)
   - Authorized redirect URIs:
     - `https://your-supabase-project.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (if needed)

### 1.4 Copy Credentials
- Copy the **Client ID** and **Client Secret**
- You'll need these for Supabase configuration

## 🔧 Step 2: Supabase Configuration

### 2.1 Enable Google Provider
1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Providers**
3. Find **Google** and toggle it **ON**
4. Enter your Google OAuth credentials:
   - **Client ID**: (from Google Cloud Console)
   - **Client Secret**: (from Google Cloud Console)
5. Click **Save**

### 2.2 Update Redirect URLs
1. Go to **Authentication > Settings**
2. Update **Site URL**: `http://localhost:3000`
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000`
   - `https://your-domain.com` (for production)

## 🔧 Step 3: Update Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 🔧 Step 4: Test the Setup

1. Start your app: `npm run dev`
2. Go to `/auth/login`
3. Click "Sign in with Google"
4. Complete OAuth flow
5. Check Supabase Dashboard > Authentication > Users
6. Verify user profile was created in `user_profiles` table

## 🔧 Step 5: Role Assignment

After users sign up via Google, you'll need to assign roles:

### Option A: Manual Assignment (Supabase Dashboard)
1. Go to Authentication > Users
2. Find the user
3. Go to your SQL Editor and run:

```sql
UPDATE user_profiles 
SET role = 'admin', full_name = 'Admin User'
WHERE email = 'admin@yourcompany.com';
```

### Option B: Automatic Role Assignment (Recommended)
Update the `handle_new_user()` function to auto-assign roles based on email domain:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT := 'staff';
  user_name TEXT;
BEGIN
  -- Extract name from Google metadata
  user_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  
  -- Auto-assign roles based on email or domain
  IF new.email IN ('admin@yourcompany.com', 'owner@yourcompany.com') THEN
    user_role := 'admin';
  ELSIF new.email LIKE '%manager%' OR new.email LIKE '%@yourcompany.com' THEN
    user_role := 'manager';
  ELSE
    user_role := 'staff';
  END IF;
  
  INSERT INTO public.user_profiles (id, email, full_name, role, default_store_id)
  VALUES (
    new.id, 
    new.email, 
    user_name,
    user_role,
    (SELECT id FROM stores WHERE store_code = 'MAIN' LIMIT 1)
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🔧 Step 6: Production Considerations

### Domain Verification
- Add your production domain to Google Cloud Console
- Update Supabase redirect URLs
- Ensure HTTPS is enabled in production

### Security
- Restrict OAuth to specific domains if needed
- Set up proper CORS policies
- Consider adding email domain restrictions

## 🔧 Troubleshooting

### Common Issues:

**1. "redirect_uri_mismatch" error**
- Check your Google Cloud Console redirect URIs match exactly
- Ensure you're using the correct Supabase callback URL

**2. "invalid_client" error**
- Verify Client ID and Secret in Supabase
- Check Google Cloud Console credentials

**3. User profile not created**
- Check if `handle_new_user` trigger is working
- Verify the function has correct permissions
- Check Supabase logs for errors

**4. Role not assigned**
- Update the trigger function with your email patterns
- Manually assign roles through SQL for testing

## 🎯 Benefits of This Setup

✅ **No password fatigue** - Users use their Google account
✅ **Better security** - Google handles 2FA, security alerts
✅ **Faster onboarding** - One-click registration
✅ **Professional UX** - Users trust Google authentication
✅ **Email verification** - Automatic via Google
✅ **Profile data** - Get name, avatar from Google automatically