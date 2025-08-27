# Supabase Configuration Guide for DSR MVP

## 1. Authentication Settings

### Go to Supabase Dashboard > Authentication > Settings

**Site URL Configuration:**
- Site URL: `http://localhost:3000` (for development)
- Redirect URLs: Add these URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/login`
  - `http://localhost:3000`

**Email Auth Settings:**
- Enable email confirmations: `true`
- Confirm email change: `true` 
- Double confirm email change: `false`
- Enable email change: `true`

**Security Settings:**
- JWT expiry: `3600` seconds (1 hour)
- Refresh token rotation: `true`
- Reuse interval: `10` seconds

## 2. Database Migrations

### Run these SQL files in order in the Supabase SQL Editor:

1. `supabase/schemas/01_core_tables.sql` - Core business tables
2. `supabase/schemas/02_customer_management.sql` - Customer tables
3. `supabase/schemas/09_auth_users.sql` - Authentication tables
4. `supabase/seeds/sample_stores.sql` - Sample store data

### Execute this SQL to create the main store:

```sql
-- Ensure main store exists
INSERT INTO stores (store_code, store_name, address, phone, email, is_active) 
VALUES ('MAIN', 'Main Store', '123 Business Street, City', '+91 9876543210', 'main@store.com', true)
ON CONFLICT (store_code) DO NOTHING;
```

## 3. Demo User Setup

### Option A: Create via Supabase Dashboard
Go to Authentication > Users and manually create users with these emails:
- admin@dsr.com
- manager@dsr.com
- staff@dsr.com

### Option B: Use the signup page
Use your app's signup page to create these accounts, then run this SQL:

```sql
-- Update user roles after signup
UPDATE user_profiles SET 
  role = 'admin', 
  full_name = 'System Administrator',
  default_store_id = (SELECT id FROM stores WHERE store_code = 'MAIN')
WHERE email = 'admin@dsr.com';

UPDATE user_profiles SET 
  role = 'manager', 
  full_name = 'Store Manager',
  default_store_id = (SELECT id FROM stores WHERE store_code = 'MAIN')
WHERE email = 'manager@dsr.com';

UPDATE user_profiles SET 
  role = 'staff', 
  full_name = 'Store Staff',
  default_store_id = (SELECT id FROM stores WHERE store_code = 'MAIN')
WHERE email = 'staff@dsr.com';
```

## 4. Environment Variables

Make sure these are in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 5. Row Level Security (RLS) Policies

The auth schema includes RLS policies. Verify they're active:

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles', 'user_store_access', 'customers', 'sales', 'expenses');

-- Enable RLS if not already enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
```

## 6. Additional RLS Policies for Business Tables

Add these policies to secure your business data:

```sql
-- Customers - users can only see customers from their store
CREATE POLICY "Users can view customers from their store" ON customers
  FOR SELECT USING (
    origin_store_id IN (
      SELECT store_id FROM user_store_access 
      WHERE user_id = auth.uid() AND can_view = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Similar policies for other tables...
CREATE POLICY "Users can manage data from their store" ON sales
  FOR ALL USING (
    store_id IN (
      SELECT store_id FROM user_store_access 
      WHERE user_id = auth.uid() AND can_edit = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Apply similar pattern to other business tables
```

## 7. Email Configuration (Optional for Development)

For production, configure email in Authentication > Settings > SMTP:
- SMTP Host: your-email-provider
- Port: 587 (or appropriate)
- Username/Password: your-smtp-credentials

For development, you can use Supabase's built-in email service.

## 8. Test the Configuration

1. Start your Next.js app: `npm run dev`
2. Go to `/auth/signup` and create a test account
3. Check Supabase Dashboard > Authentication > Users
4. Verify user_profiles table has the new user
5. Test login with the demo account buttons

## Troubleshooting

### Common Issues:

1. **"Invalid login credentials"**
   - Check email/password
   - Verify user exists in Supabase dashboard
   - Check if email confirmation is required

2. **"User profile not found"**
   - Verify the trigger is working: `handle_new_user()`
   - Check user_profiles table
   - Run the user role update SQL

3. **"Permission denied"**
   - Check RLS policies
   - Verify user roles are set correctly
   - Check store access permissions

4. **Customer creation fails**
   - Verify main store exists
   - Check user's default_store_id
   - Review store-service integration