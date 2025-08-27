-- Update Role System to match existing definitions
-- Super User, Accounts Incharge, Store Manager, Cashier

-- Update user_profiles table role constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('super_user', 'accounts_incharge', 'store_manager', 'cashier'));

-- Update default role to cashier (lowest privilege)
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'cashier';

-- Add role hierarchy helper function
CREATE OR REPLACE FUNCTION get_role_level(role_name TEXT) 
RETURNS INTEGER AS $$
BEGIN
  CASE role_name
    WHEN 'super_user' THEN RETURN 4;
    WHEN 'accounts_incharge' THEN RETURN 3;
    WHEN 'store_manager' THEN RETURN 2;
    WHEN 'cashier' THEN RETURN 1;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Add permissions table for granular control
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  allowed BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, module, action)
);

-- Insert base permissions for each role
INSERT INTO role_permissions (role, module, action, allowed) VALUES
-- Super User - Full access
('super_user', 'users', 'create', true),
('super_user', 'users', 'edit', true),
('super_user', 'users', 'delete', true),
('super_user', 'users', 'view_all', true),
('super_user', 'stores', 'create', true),
('super_user', 'stores', 'edit', true),
('super_user', 'stores', 'delete', true),
('super_user', 'stores', 'view_all', true),
('super_user', 'sales', 'create', true),
('super_user', 'sales', 'edit', true),
('super_user', 'sales', 'delete', true),
('super_user', 'sales', 'view_all', true),
('super_user', 'expenses', 'create', true),
('super_user', 'expenses', 'approve', true),
('super_user', 'cash', 'transfer', true),
('super_user', 'cash', 'approve', true),
('super_user', 'reports', 'view_all', true),
('super_user', 'reports', 'export', true),

-- Accounts Incharge - Financial oversight
('accounts_incharge', 'sales', 'view_all', true),
('accounts_incharge', 'expenses', 'view_all', true),
('accounts_incharge', 'expenses', 'approve', true),
('accounts_incharge', 'cash', 'approve', true),
('accounts_incharge', 'reports', 'view_all', true),
('accounts_incharge', 'reports', 'export', true),
('accounts_incharge', 'users', 'view_store', true),

-- Store Manager - Store operations
('store_manager', 'users', 'create_cashier', true),
('store_manager', 'users', 'edit_cashier', true),
('store_manager', 'sales', 'create', true),
('store_manager', 'sales', 'edit_same_day', true),
('store_manager', 'sales', 'view_store', true),
('store_manager', 'expenses', 'create', true),
('store_manager', 'expenses', 'approve_small', true),
('store_manager', 'cash', 'count', true),
('store_manager', 'cash', 'request_transfer', true),
('store_manager', 'customers', 'create', true),
('store_manager', 'customers', 'edit', true),
('store_manager', 'reports', 'view_store', true),

-- Cashier - Basic operations
('cashier', 'sales', 'create', true),
('cashier', 'sales', 'view_7days', true),
('cashier', 'customers', 'create', true),
('cashier', 'customers', 'view', true),
('cashier', 'cash', 'count', true),
('cashier', 'vouchers', 'create', true),
('cashier', 'vouchers', 'redeem', true)
ON CONFLICT (role, module, action) DO NOTHING;

-- Update the user creation function to use new roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT := 'cashier'; -- Default to lowest privilege
  user_name TEXT;
  email_domain TEXT;
BEGIN
  -- Extract domain from email
  email_domain := split_part(new.email, '@', 2);
  
  -- Check if email is whitelisted (exact match or domain match)
  IF NOT EXISTS (
    SELECT 1 FROM email_whitelist 
    WHERE (email = new.email OR domain = email_domain) 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Email % is not authorized to access this system', new.email;
  END IF;
  
  -- Extract name from metadata
  user_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  
  -- Auto-assign roles based on email patterns
  IF new.email IN ('super@dsr.com', 'owner@dsr.com') THEN
    user_role := 'super_user';
  ELSIF new.email LIKE '%accounts%@dsr.com' OR new.email LIKE '%finance%@dsr.com' THEN
    user_role := 'accounts_incharge';
  ELSIF new.email LIKE '%manager%@dsr.com' OR new.email LIKE '%mgr%@dsr.com' THEN
    user_role := 'store_manager';
  ELSE
    user_role := 'cashier';
  END IF;
  
  -- Create user profile
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

-- Update existing users to new role system (optional - comment out if not needed)
-- UPDATE user_profiles SET role = 'super_user' WHERE role = 'admin';
-- UPDATE user_profiles SET role = 'store_manager' WHERE role = 'manager';
-- UPDATE user_profiles SET role = 'cashier' WHERE role = 'staff';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON role_permissions(module);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_store ON user_profiles(role, default_store_id);

SELECT 'Role system updated successfully!' as status;