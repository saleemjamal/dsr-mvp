-- Email Whitelist for Google SSO
-- Only allow specific emails or domains to register

-- Create whitelist table
CREATE TABLE IF NOT EXISTS email_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  domain VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add your allowed emails/domains
INSERT INTO email_whitelist (email) VALUES 
('admin@dsr.com'),
('manager@dsr.com'),
('staff@dsr.com');

-- Add your company domain (optional)
-- INSERT INTO email_whitelist (domain) VALUES ('yourcompany.com');

-- Updated user creation function with whitelist check
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT := 'staff';
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
  
  -- Auto-assign roles based on email
  IF new.email IN ('admin@dsr.com') THEN
    user_role := 'admin';
  ELSIF new.email LIKE '%manager%' OR new.email IN ('manager@dsr.com') THEN
    user_role := 'manager';
  ELSE
    user_role := 'staff';
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

-- Update the trigger (already exists, just updating the function)