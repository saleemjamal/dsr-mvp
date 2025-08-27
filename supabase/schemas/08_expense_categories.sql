-- Expense Categories Table
-- This file creates the expense_categories table for managing expense types

-- ==========================================
-- EXPENSE CATEGORIES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_expense_categories_order ON expense_categories(display_order, name);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

-- RLS disabled for now - will be enabled when auth is implemented
-- ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SEED DATA
-- ==========================================

INSERT INTO expense_categories (name, description, display_order) VALUES
  ('Fuel', 'Vehicle fuel and lubricants', 1),
  ('Transportation', 'Taxi, delivery, and transport costs', 2),
  ('Utilities', 'Electricity, water, internet, phone bills', 3),
  ('Office Supplies', 'Stationery, printing, and office materials', 4),
  ('Maintenance', 'Repairs and maintenance expenses', 5),
  ('Cleaning', 'Cleaning supplies and services', 6),
  ('Staff Welfare', 'Staff meals, refreshments, and welfare', 7),
  ('Marketing', 'Advertising and promotional expenses', 8),
  ('Rent', 'Store or office rent', 9),
  ('Miscellaneous', 'Other unspecified expenses', 10)
ON CONFLICT (name) DO NOTHING;