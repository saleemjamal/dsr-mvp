-- Debug role constraint issue

-- Check current constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass 
AND contype = 'c';

-- Check current role values
SELECT DISTINCT role FROM user_profiles;

-- Check constraint definition
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'role';

-- First remove the constraint completely
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Update the role to super_user without constraint
UPDATE user_profiles 
SET role = 'super_user' 
WHERE email = 'saleem@poppatjamals.com';

-- Now add the correct constraint
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('super_user', 'accounts_incharge', 'store_manager', 'cashier'));

-- Verify it worked
SELECT email, role FROM user_profiles WHERE email = 'saleem@poppatjamals.com';

SELECT 'Role constraint fixed!' as status;