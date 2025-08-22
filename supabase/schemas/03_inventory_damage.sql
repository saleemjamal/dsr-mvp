-- Inventory and Damage Management
-- This file contains tables for damage reports and inventory tracking

-- Damage reports table
CREATE TABLE IF NOT EXISTS damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_name VARCHAR(255),
  item_code VARCHAR(100),
  item_brand VARCHAR(255),
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  estimated_value DECIMAL(12,2),
  action_taken TEXT,
  credit_note_reference VARCHAR(100),
  status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'resolved', 'closed')),
  images_urls TEXT[], -- Array of image URLs
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);