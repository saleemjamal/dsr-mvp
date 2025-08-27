-- Row Level Security Policies for Business Tables
-- This file creates RLS policies to secure data access based on user roles and store access

-- ==========================================
-- ENABLE RLS ON ALL BUSINESS TABLES
-- ==========================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- HELPER FUNCTIONS FOR RLS
-- ==========================================

-- Function to check if user can access a store
CREATE OR REPLACE FUNCTION user_can_access_store(store_id UUID, permission_type TEXT DEFAULT 'view')
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins can access all stores
  IF EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check specific store access
  CASE permission_type
    WHEN 'view' THEN
      RETURN EXISTS (
        SELECT 1 FROM user_store_access usa
        WHERE usa.user_id = auth.uid() 
          AND usa.store_id = user_can_access_store.store_id
          AND usa.can_view = true
      );
    WHEN 'edit' THEN
      RETURN EXISTS (
        SELECT 1 FROM user_store_access usa
        WHERE usa.user_id = auth.uid() 
          AND usa.store_id = user_can_access_store.store_id
          AND usa.can_edit = true
      );
    WHEN 'approve' THEN
      RETURN EXISTS (
        SELECT 1 FROM user_store_access usa
        WHERE usa.user_id = auth.uid() 
          AND usa.store_id = user_can_access_store.store_id
          AND usa.can_approve = true
      );
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STORES POLICIES
-- ==========================================

-- Users can view stores they have access to
CREATE POLICY "Users can view accessible stores" ON stores
  FOR SELECT USING (
    user_can_access_store(id, 'view')
  );

-- Only admins can modify stores
CREATE POLICY "Only admins can modify stores" ON stores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- CUSTOMERS POLICIES
-- ==========================================

-- Users can view customers from stores they have access to
CREATE POLICY "Users can view customers from accessible stores" ON customers
  FOR SELECT USING (
    origin_store_id IS NULL OR user_can_access_store(origin_store_id, 'view')
  );

-- Users can create customers if they have edit access to at least one store
CREATE POLICY "Users can create customers" ON customers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_store_access usa
      WHERE usa.user_id = auth.uid() AND usa.can_edit = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Users can update customers from stores they have edit access to
CREATE POLICY "Users can update customers from accessible stores" ON customers
  FOR UPDATE USING (
    origin_store_id IS NULL OR user_can_access_store(origin_store_id, 'edit')
  );

-- ==========================================
-- SALES POLICIES
-- ==========================================

-- Users can view sales from stores they have access to
CREATE POLICY "Users can view sales from accessible stores" ON sales
  FOR SELECT USING (
    user_can_access_store(store_id, 'view')
  );

-- Users can create sales for stores they have edit access to
CREATE POLICY "Users can create sales" ON sales
  FOR INSERT WITH CHECK (
    user_can_access_store(store_id, 'edit')
  );

-- Users can update sales from stores they have edit access to
CREATE POLICY "Users can update sales" ON sales
  FOR UPDATE USING (
    user_can_access_store(store_id, 'edit')
  );

-- Only managers/admins can delete sales
CREATE POLICY "Managers can delete sales" ON sales
  FOR DELETE USING (
    user_can_access_store(store_id, 'edit') AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ==========================================
-- EXPENSES POLICIES
-- ==========================================

-- Users can view expenses from stores they have access to
CREATE POLICY "Users can view expenses from accessible stores" ON expenses
  FOR SELECT USING (
    user_can_access_store(store_id, 'view')
  );

-- Users can create expenses for stores they have edit access to
CREATE POLICY "Users can create expenses" ON expenses
  FOR INSERT WITH CHECK (
    user_can_access_store(store_id, 'edit')
  );

-- Users can update expenses from stores they have edit access to
CREATE POLICY "Users can update expenses" ON expenses
  FOR UPDATE USING (
    user_can_access_store(store_id, 'edit')
  );

-- Only managers/admins can delete expenses
CREATE POLICY "Managers can delete expenses" ON expenses
  FOR DELETE USING (
    user_can_access_store(store_id, 'edit') AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ==========================================
-- RETURNS POLICIES
-- ==========================================

-- Users can view returns from stores they have access to
CREATE POLICY "Users can view returns from accessible stores" ON returns
  FOR SELECT USING (
    user_can_access_store(store_id, 'view')
  );

-- Users can create returns for stores they have edit access to
CREATE POLICY "Users can create returns" ON returns
  FOR INSERT WITH CHECK (
    user_can_access_store(store_id, 'edit')
  );

-- Users can update returns from stores they have edit access to
CREATE POLICY "Users can update returns" ON returns
  FOR UPDATE USING (
    user_can_access_store(store_id, 'edit')
  );

-- ==========================================
-- HAND BILLS POLICIES
-- ==========================================

-- Users can view hand bills from stores they have access to
CREATE POLICY "Users can view hand bills from accessible stores" ON hand_bills
  FOR SELECT USING (
    user_can_access_store(store_id, 'view')
  );

-- Users can create hand bills for stores they have edit access to
CREATE POLICY "Users can create hand bills" ON hand_bills
  FOR INSERT WITH CHECK (
    user_can_access_store(store_id, 'edit')
  );

-- Users can update hand bills from stores they have edit access to
CREATE POLICY "Users can update hand bills" ON hand_bills
  FOR UPDATE USING (
    user_can_access_store(store_id, 'edit')
  );

-- ==========================================
-- GIFT VOUCHERS POLICIES
-- ==========================================

-- Users can view gift vouchers (no store restriction for vouchers)
CREATE POLICY "Users can view gift vouchers" ON gift_vouchers
  FOR SELECT USING (true);

-- Users can create gift vouchers if they have edit access to any store
CREATE POLICY "Users can create gift vouchers" ON gift_vouchers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_store_access usa
      WHERE usa.user_id = auth.uid() AND usa.can_edit = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Users can update gift vouchers if they have edit access
CREATE POLICY "Users can update gift vouchers" ON gift_vouchers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_store_access usa
      WHERE usa.user_id = auth.uid() AND usa.can_edit = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ==========================================
-- SALES ORDERS POLICIES
-- ==========================================

-- Users can view sales orders from stores they have access to
CREATE POLICY "Users can view sales orders from accessible stores" ON sales_orders
  FOR SELECT USING (
    user_can_access_store(store_id, 'view')
  );

-- Users can create sales orders for stores they have edit access to
CREATE POLICY "Users can create sales orders" ON sales_orders
  FOR INSERT WITH CHECK (
    user_can_access_store(store_id, 'edit')
  );

-- Users can update sales orders from stores they have edit access to
CREATE POLICY "Users can update sales orders" ON sales_orders
  FOR UPDATE USING (
    user_can_access_store(store_id, 'edit')
  );

-- ==========================================
-- CASH MANAGEMENT POLICIES (if exists)
-- ==========================================

-- Enable RLS on cash management tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_balances') THEN
    EXECUTE 'ALTER TABLE cash_balances ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'CREATE POLICY "Users can view cash balances from accessible stores" ON cash_balances
      FOR SELECT USING (
        user_can_access_store(store_id, ''view'')
      )';
    
    EXECUTE 'CREATE POLICY "Users can manage cash balances" ON cash_balances
      FOR ALL USING (
        user_can_access_store(store_id, ''edit'')
      )';
  END IF;
END $$;

-- ==========================================
-- GRANT ACCESS TO MAIN STORE FOR ALL USERS
-- ==========================================

-- Function to grant main store access to new users
CREATE OR REPLACE FUNCTION grant_main_store_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Grant access to main store for new users
  INSERT INTO user_store_access (user_id, store_id, can_view, can_edit, can_approve)
  SELECT 
    NEW.id,
    s.id,
    true,
    CASE WHEN NEW.role IN ('admin', 'manager') THEN true ELSE false END,
    CASE WHEN NEW.role = 'admin' THEN true ELSE false END
  FROM stores s
  WHERE s.store_code = 'MAIN'
  ON CONFLICT (user_id, store_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to grant store access when user profile is created
DROP TRIGGER IF EXISTS grant_main_store_access_trigger ON user_profiles;
CREATE TRIGGER grant_main_store_access_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION grant_main_store_access();