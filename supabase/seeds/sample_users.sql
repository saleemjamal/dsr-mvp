-- Sample user data for testing authentication
-- Note: These users should be created through Supabase Auth UI or signup process
-- This file is for reference and documentation

-- Sample user profiles (these will be created automatically via trigger when users sign up)
-- INSERT INTO user_profiles (id, email, full_name, role, default_store_id, is_active) 
-- VALUES 
--   ('admin-user-uuid', 'admin@dsr.com', 'System Administrator', 'admin', (SELECT id FROM stores WHERE store_code = 'MAIN'), true),
--   ('manager-user-uuid', 'manager@dsr.com', 'Store Manager', 'manager', (SELECT id FROM stores WHERE store_code = 'MAIN'), true),
--   ('staff-user-uuid', 'staff@dsr.com', 'Store Staff', 'staff', (SELECT id FROM stores WHERE store_code = 'MAIN'), true);

-- Sample user store access (grant access to main store for demo users)
-- This will be populated after users are created through auth

-- For testing purposes, you can create demo accounts using these credentials:
-- Email: admin@dsr.com, Password: admin123, Role: admin
-- Email: manager@dsr.com, Password: manager123, Role: manager  
-- Email: staff@dsr.com, Password: staff123, Role: staff

-- To create these users, use the signup process or Supabase Auth API
-- Then update their profiles with appropriate roles

-- Update demo user roles (run after users are created)
-- UPDATE user_profiles SET role = 'admin', full_name = 'System Administrator' WHERE email = 'admin@dsr.com';
-- UPDATE user_profiles SET role = 'manager', full_name = 'Store Manager' WHERE email = 'manager@dsr.com';
-- UPDATE user_profiles SET role = 'staff', full_name = 'Store Staff' WHERE email = 'staff@dsr.com';

-- Grant store access to demo users
-- INSERT INTO user_store_access (user_id, store_id, can_view, can_edit, can_approve)
-- SELECT 
--   up.id,
--   s.id,
--   true,
--   CASE WHEN up.role IN ('admin', 'manager') THEN true ELSE false END,
--   CASE WHEN up.role = 'admin' THEN true ELSE false END
-- FROM user_profiles up
-- CROSS JOIN stores s
-- WHERE up.email IN ('admin@dsr.com', 'manager@dsr.com', 'staff@dsr.com')
-- AND s.store_code = 'MAIN'
-- ON CONFLICT (user_id, store_id) DO NOTHING;