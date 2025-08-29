-- =====================================================
-- Fix Cash Transfer Approval Permissions
-- =====================================================
-- This migration ensures only Super Users can approve cash transfers
-- Removes approval permissions from Accounts Incharge role

-- Step 1: Update the handle_new_user_with_whitelist function to only give approve permission to super_user
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
                    -- Set approve permissions - ONLY for super_user
                    CASE 
                        WHEN whitelist_record.assigned_role = 'super_user'
                        THEN true 
                        ELSE false 
                    END,
                    whitelist_record.added_by
                );
            END LOOP;
        END IF;
    ELSE
        -- User not in whitelist - don't create profile
        RAISE EXCEPTION 'User email % is not authorized. Please contact your administrator.', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update the update_whitelist_entry function to fix approve permissions
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
        
        -- Add new access with corrected permissions
        INSERT INTO user_store_access (user_id, store_id, can_view, can_edit, can_approve)
        SELECT 
            (SELECT id FROM user_profiles WHERE email = p_email),
            unnest(p_store_ids),
            true,
            CASE WHEN p_role IN ('super_user', 'accounts_incharge', 'store_manager') THEN true ELSE false END,
            CASE WHEN p_role = 'super_user' THEN true ELSE false END; -- Only super_user can approve
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Fix existing user_store_access records
-- Remove approve permission from all non-super_user accounts
UPDATE public.user_store_access
SET can_approve = false
WHERE user_id IN (
    SELECT id FROM user_profiles 
    WHERE role != 'super_user'
);

-- Ensure super_users have approve permission
UPDATE public.user_store_access
SET can_approve = true
WHERE user_id IN (
    SELECT id FROM user_profiles 
    WHERE role = 'super_user'
);

-- Step 4: Add RLS policy to enforce approval permissions at database level
-- Create policy for cash_transfers table to ensure only super_users can update
CREATE POLICY "Only super users can approve transfers" 
ON public.cash_transfers
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'super_user'
    )
)
WITH CHECK (
    -- Allow updates only if user is super_user
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'super_user'
    )
);

-- Step 5: Add helpful comment
COMMENT ON COLUMN public.user_store_access.can_approve IS 'Approval permission - reserved for super_user role only. Controls ability to approve cash transfers and other critical operations.';

-- Step 6: Create a view to easily see who has approval permissions
CREATE OR REPLACE VIEW users_with_approval_permission AS
SELECT 
    up.id,
    up.email,
    up.full_name,
    up.role,
    usa.store_id,
    s.store_name,
    s.store_code,
    usa.can_approve
FROM user_profiles up
JOIN user_store_access usa ON up.id = usa.user_id
JOIN stores s ON usa.store_id = s.id
WHERE usa.can_approve = true
ORDER BY up.role, up.full_name;

COMMENT ON VIEW users_with_approval_permission IS 'Shows all users who have approval permissions (should only be super_users)';