-- Core Business Tables
-- This file contains the main business entities for DSR Simplified

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- CORE BUSINESS TABLES
-- ==========================================

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code VARCHAR(10) NOT NULL UNIQUE,
  store_name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tender_type VARCHAR(20) NOT NULL CHECK (tender_type IN ('cash', 'credit_card', 'upi', 'gift_voucher', 'bank_transfer')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  transaction_reference VARCHAR(100),
  customer_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table  
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  voucher_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gift vouchers table
CREATE TABLE IF NOT EXISTS gift_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number VARCHAR(50) NOT NULL UNIQUE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  balance DECIMAL(12,2) NOT NULL CHECK (balance >= 0),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'cancelled', 'expired')),
  issued_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);