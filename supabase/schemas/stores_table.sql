-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code VARCHAR(10) UNIQUE NOT NULL,
  store_name VARCHAR(100) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_code ON stores(store_code);
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_name ON stores(store_name);

-- Add RLS policies
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read stores
CREATE POLICY "Users can view stores" ON stores
  FOR SELECT TO authenticated
  USING (true);

-- Allow super users and store managers to manage stores
CREATE POLICY "Super users can manage stores" ON stores
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_user', 'store_manager')
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_stores_updated_at();

-- Insert default main store if it doesn't exist
INSERT INTO stores (store_code, store_name, address, phone, email, is_active) 
VALUES ('MAIN', 'Main Store', '123 Business Street, City', '+91 9876543210', 'main@store.com', true)
ON CONFLICT (store_code) DO NOTHING;