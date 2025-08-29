-- =====================================================
-- Enhanced Email Whitelist with Role & Store Assignment
-- =====================================================
-- This migration adds role and store assignment capabilities to the email whitelist
-- so administrators can pre-configure user access before they first login

-- Step 1: Add role and store assignment columns to email_whitelist
ALTER TABLE public.email_whitelist 
ADD COLUMN IF NOT EXISTS assigned_role character varying DEFAULT 'cashier',
ADD COLUMN IF NOT EXISTS assigned_store_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS added_by uuid,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add check constraint for valid roles
ALTER TABLE public.email_whitelist 
ADD CONSTRAINT email_whitelist_assigned_role_check 
CHECK (assigned_role::text = ANY (ARRAY['super_user'::character varying, 'accounts_incharge'::character varying, 'store_manager'::character varying, 'cashier'::character varying]::text[]));

-- Add foreign key for added_by
ALTER TABLE public.email_whitelist
ADD CONSTRAINT email_whitelist_added_by_fkey 
FOREIGN KEY (added_by) REFERENCES public.user_profiles(id);

-- Step 2: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_whitelist_updated_at
BEFORE UPDATE ON public.email_whitelist
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 3: Create function to handle user profile creation with pre-assigned role and stores
CREATE OR REPLACE FUNCTION handle_new_user_with_whitelist()
RETURNS TRIGGER AS $$
DECLARE
    whitelist_record RECORD;
    store_id uuid;
BEGIN
    -- Check if user's email is in whitelist
    SELECT * INTO whitelist_record
    FROM public.email_whitelist
    WHERE email = NEW.email AND is_active = true;
    
    IF FOUND THEN
        -- Create user profile with pre-assigned role
        INSERT INTO public.user_profiles (
            id, 
            email, 
            full_name, 
            role,
            default_store_id,
            is_active
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            whitelist_record.assigned_role,
            CASE 
                WHEN array_length(whitelist_record.assigned_store_ids, 1) = 1 
                THEN whitelist_record.assigned_store_ids[1]
                ELSE NULL
            END,
            true
        );
        
        -- Grant access to assigned stores
        IF array_length(whitelist_record.assigned_store_ids, 1) > 0 THEN
            FOREACH store_id IN ARRAY whitelist_record.assigned_store_ids
            LOOP
                INSERT INTO public.user_store_access (
                    user_id,
                    store_id,
                    can_view,
                    can_edit,
                    can_approve,
                    granted_by
                ) VALUES (
                    NEW.id,
                    store_id,
                    true,
                    -- Set edit permissions based on role
                    CASE 
                        WHEN whitelist_record.assigned_role IN ('super_user', 'accounts_incharge', 'store_manager') 
                        THEN true 
                        ELSE false 
                    END,
                    -- Set approve permissions based on role
                    CASE 
                        WHEN whitelist_record.assigned_role IN ('super_user', 'accounts_incharge') 
                        THEN true 
                        ELSE false 
                    END,
                    whitelist_record.added_by
                );
            END LOOP;
        END IF;
    ELSE
        -- User not in whitelist - don't create profile
        -- This enforces whitelist-only access
        RAISE EXCEPTION 'User email % is not authorized. Please contact your administrator.', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Replace existing trigger (if exists) with new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user_with_whitelist();

-- Step 5: Create view for easier whitelist management
CREATE OR REPLACE VIEW whitelist_with_details AS
SELECT 
    w.id,
    w.email,
    w.domain,
    w.assigned_role,
    w.assigned_store_ids,
    w.is_active,
    w.notes,
    w.created_at,
    w.updated_at,
    w.added_by,
    u.full_name as added_by_name,
    ARRAY(
        SELECT s.name 
        FROM stores s 
        WHERE s.id = ANY(w.assigned_store_ids)
    ) as store_names
FROM email_whitelist w
LEFT JOIN user_profiles u ON w.added_by = u.id;

-- Step 6: Update existing whitelist entries to have default role
-- (Only runs if there are existing entries without assigned_role)
UPDATE public.email_whitelist
SET assigned_role = 'cashier'
WHERE assigned_role IS NULL;

-- Step 7: Create function to update whitelist entry
CREATE OR REPLACE FUNCTION update_whitelist_entry(
    p_email varchar,
    p_role varchar,
    p_store_ids uuid[],
    p_notes text,
    p_updated_by uuid
)
RETURNS void AS $$
BEGIN
    UPDATE public.email_whitelist
    SET 
        assigned_role = p_role,
        assigned_store_ids = p_store_ids,
        notes = p_notes,
        added_by = p_updated_by,
        updated_at = now()
    WHERE email = p_email;
    
    -- If user already exists, update their profile and access
    UPDATE public.user_profiles
    SET 
        role = p_role,
        default_store_id = CASE 
            WHEN array_length(p_store_ids, 1) = 1 
            THEN p_store_ids[1]
            ELSE default_store_id
        END
    WHERE email = p_email;
    
    -- Update store access if user exists
    IF EXISTS (SELECT 1 FROM user_profiles WHERE email = p_email) THEN
        -- Remove existing access
        DELETE FROM user_store_access 
        WHERE user_id = (SELECT id FROM user_profiles WHERE email = p_email);
        
        -- Add new access
        INSERT INTO user_store_access (user_id, store_id, can_view, can_edit, can_approve)
        SELECT 
            (SELECT id FROM user_profiles WHERE email = p_email),
            unnest(p_store_ids),
            true,
            CASE WHEN p_role IN ('super_user', 'accounts_incharge', 'store_manager') THEN true ELSE false END,
            CASE WHEN p_role IN ('super_user', 'accounts_incharge') THEN true ELSE false END;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Add helpful comments
COMMENT ON COLUMN public.email_whitelist.assigned_role IS 'Pre-assigned role for when user first logs in';
COMMENT ON COLUMN public.email_whitelist.assigned_store_ids IS 'Array of store IDs user will have access to';
COMMENT ON COLUMN public.email_whitelist.notes IS 'Admin notes about this whitelist entry';
COMMENT ON COLUMN public.email_whitelist.added_by IS 'User who added this whitelist entry';
COMMENT ON FUNCTION update_whitelist_entry IS 'Updates whitelist entry and syncs with existing user if they already logged in';

-- Step 9: Sample data for testing (commented out - uncomment if needed)
/*
-- Add sample whitelist entries with roles and stores
INSERT INTO public.email_whitelist (email, assigned_role, assigned_store_ids, notes)
VALUES 
    ('manager@example.com', 'store_manager', ARRAY[(SELECT id FROM stores WHERE name = 'Main Store')], 'Store manager for main location'),
    ('cashier1@example.com', 'cashier', ARRAY[(SELECT id FROM stores WHERE name = 'Main Store')], 'Cashier staff'),
    ('accounts@example.com', 'accounts_incharge', ARRAY[(SELECT id FROM stores)], 'Accounts team - all stores access');
*/