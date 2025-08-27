-- Fix existing user role issue and create super user

-- First, let's see what roles currently exist
SELECT email, role FROM user_profiles WHERE email = 'saleem@poppatjamals.com';

-- Option 1: Update existing user to super_user role
UPDATE user_profiles 
SET role = 'super_user' 
WHERE email = 'saleem@poppatjamals.com';

-- Option 2: If you prefer to delete and recreate (uncomment below)
-- DELETE FROM user_profiles WHERE email = 'saleem@poppatjamals.com';
-- DELETE FROM auth.users WHERE email = 'saleem@poppatjamals.com';

-- Add to whitelist to ensure they can sign up again
INSERT INTO email_whitelist (email) VALUES ('saleem@poppatjamals.com')
ON CONFLICT (email) DO NOTHING;

-- Now we can safely apply the role constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('super_user', 'accounts_incharge', 'store_manager', 'cashier'));

-- Update default role to cashier (lowest privilege)
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'cashier';

-- Verify the fix worked
SELECT email, role FROM user_profiles WHERE email = 'saleem@poppatjamals.com';

SELECT 'User role updated successfully!' as status;