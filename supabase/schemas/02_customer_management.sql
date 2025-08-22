-- Customer Management Tables
-- This file contains tables for customer data and related features

-- Customers table (for future use)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  address TEXT,
  origin_store_id UUID REFERENCES stores(id),
  credit_limit DECIMAL(12,2) DEFAULT 0,
  outstanding_balance DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hand bills table (for POS failure backup)
CREATE TABLE IF NOT EXISTS hand_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bill_number VARCHAR(50),
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  tender_type VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255),
  items_description TEXT,
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'cancelled')),
  converted_sale_id UUID REFERENCES sales(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales orders table  
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_number VARCHAR(50) UNIQUE,
  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  items_description TEXT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  advance_amount DECIMAL(12,2) DEFAULT 0,
  balance_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - advance_amount) STORED,
  delivery_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Returns table (RRN - Returns without exchange)
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  original_bill_reference VARCHAR(100),
  return_amount DECIMAL(12,2) NOT NULL CHECK (return_amount > 0),
  refund_method VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);