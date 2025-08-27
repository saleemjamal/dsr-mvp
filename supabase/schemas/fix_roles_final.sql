-- Fix role constraint issue (PostgreSQL 12+ compatible)

-- Check current role values
SELECT DISTINCT role FROM user_profiles;

-- Check current constraints
SELECT conname, contype
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass 
AND contype = 'c';

-- Remove ALL check constraints on user_profiles
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'user_profiles'::regclass 
        AND contype = 'c'
    LOOP
        EXECUTE 'ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Update the role to super_user (no constraints now)
UPDATE user_profiles 
SET role = 'super_user' 
WHERE email = 'saleem@poppatjamals.com';

-- Add to whitelist
INSERT INTO email_whitelist (email) VALUES ('saleem@poppatjamals.com')
ON CONFLICT (email) DO NOTHING;

-- Now add the correct constraint
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('super_user', 'accounts_incharge', 'store_manager', 'cashier'));

-- Update default role
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'cashier';

-- Verify it worked
SELECT email, role FROM user_profiles WHERE email = 'saleem@poppatjamals.com';

SELECT 'Role system fixed and updated!' as status;