-- Cash Management Tables (Simplified Version)
-- This file contains tables for cash counting, transfers, and balance management

-- ==========================================
-- CASH MANAGEMENT TABLES
-- ==========================================

-- Cash counts table - Daily denomination counts
CREATE TABLE IF NOT EXISTS cash_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count_type VARCHAR(20) NOT NULL CHECK (count_type IN ('sales_drawer', 'petty_cash')),
  
  -- Denomination breakdown stored as JSONB
  denominations JSONB NOT NULL DEFAULT '{}',
  
  -- Calculated amounts
  total_counted DECIMAL(12,2) NOT NULL CHECK (total_counted >= 0),
  expected_amount DECIMAL(12,2),
  variance DECIMAL(12,2) GENERATED ALWAYS AS (total_counted - COALESCE(expected_amount, 0)) STORED,
  
  -- Audit fields (simplified - using text instead of UUID references)
  counted_by TEXT NOT NULL DEFAULT 'temp-user-id',
  counted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one count per type per day per store
  UNIQUE(store_id, count_date, count_type)
);

-- Cash transfers table - Transfer requests and approvals
CREATE TABLE IF NOT EXISTS cash_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Transfer details
  requested_amount DECIMAL(12,2) NOT NULL CHECK (requested_amount > 0),
  approved_amount DECIMAL(12,2) CHECK (approved_amount >= 0),
  
  -- Request information
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Request tracking (simplified)
  requested_by TEXT NOT NULL DEFAULT 'temp-user-id',
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Approval tracking (simplified)
  approved_by TEXT,
  approval_date TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  -- Execution tracking
  executed_at TIMESTAMP WITH TIME ZONE,
  executed_by TEXT,
  
  -- Balance snapshots at time of request
  sales_cash_balance DECIMAL(12,2),
  petty_cash_balance DECIMAL(12,2),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cash balances table - Daily cash balance tracking
CREATE TABLE IF NOT EXISTS cash_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Opening balances
  sales_cash_opening DECIMAL(12,2) NOT NULL DEFAULT 0,
  petty_cash_opening DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Closing balances (calculated or manually set)
  sales_cash_closing DECIMAL(12,2),
  petty_cash_closing DECIMAL(12,2),
  
  -- Daily movements
  total_cash_sales DECIMAL(12,2) DEFAULT 0,
  total_cash_advances DECIMAL(12,2) DEFAULT 0, -- GV, HB, SO advances
  total_transfers_out DECIMAL(12,2) DEFAULT 0, -- To petty cash
  total_deposits DECIMAL(12,2) DEFAULT 0, -- Bank deposits
  total_expenses DECIMAL(12,2) DEFAULT 0, -- From petty cash
  
  -- Variances
  sales_cash_variance DECIMAL(12,2),
  petty_cash_variance DECIMAL(12,2),
  
  -- Reconciliation status
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_by TEXT,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One balance record per day per store
  UNIQUE(store_id, balance_date)
);

-- Cash movements table - Detailed transaction log
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Movement details
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN (
    'sale', 'advance', 'transfer_in', 'transfer_out', 'deposit', 'expense', 'adjustment'
  )),
  
  -- Amount and direction
  amount DECIMAL(12,2) NOT NULL CHECK (amount != 0),
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('sales_cash', 'petty_cash')),
  
  -- Reference to source transaction
  reference_type VARCHAR(20), -- 'sale', 'voucher', 'hand_bill', 'order', 'expense', 'transfer'
  reference_id UUID,
  
  -- Additional context
  description TEXT,
  tender_type VARCHAR(20),
  
  -- Audit fields (simplified)
  created_by TEXT NOT NULL DEFAULT 'temp-user-id',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Cash counts indexes
CREATE INDEX IF NOT EXISTS idx_cash_counts_store_date ON cash_counts(store_id, count_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_counts_type ON cash_counts(count_type);
CREATE INDEX IF NOT EXISTS idx_cash_counts_counted_by ON cash_counts(counted_by);

-- Cash transfers indexes
CREATE INDEX IF NOT EXISTS idx_cash_transfers_store ON cash_transfers(store_id);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_status ON cash_transfers(status);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_requested_by ON cash_transfers(requested_by);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_approved_by ON cash_transfers(approved_by);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_request_date ON cash_transfers(request_date DESC);

-- Cash balances indexes
CREATE INDEX IF NOT EXISTS idx_cash_balances_store_date ON cash_balances(store_id, balance_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_balances_reconciled ON cash_balances(is_reconciled);

-- Cash movements indexes
CREATE INDEX IF NOT EXISTS idx_cash_movements_store_date ON cash_movements(store_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_account ON cash_movements(account_type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_reference ON cash_movements(reference_type, reference_id);

-- ==========================================
-- TRIGGERS FOR AUTOMATION
-- ==========================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cash_counts_updated_at BEFORE UPDATE ON cash_counts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_transfers_updated_at BEFORE UPDATE ON cash_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_balances_updated_at BEFORE UPDATE ON cash_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to get current cash balance for a store
CREATE OR REPLACE FUNCTION get_current_cash_balance(
  p_store_id UUID,
  p_account_type VARCHAR(20) DEFAULT 'sales_cash'
)
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance DECIMAL(12,2) := 0;
BEGIN
  -- Get latest balance from cash_balances or calculate from movements
  SELECT 
    CASE 
      WHEN p_account_type = 'sales_cash' THEN COALESCE(sales_cash_closing, sales_cash_opening)
      WHEN p_account_type = 'petty_cash' THEN COALESCE(petty_cash_closing, petty_cash_opening)
      ELSE 0
    END INTO current_balance
  FROM cash_balances 
  WHERE store_id = p_store_id 
    AND balance_date = CURRENT_DATE;
  
  -- If no balance record for today, calculate from movements
  IF current_balance IS NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO current_balance
    FROM cash_movements
    WHERE store_id = p_store_id
      AND account_type = p_account_type
      AND movement_date = CURRENT_DATE;
  END IF;
  
  RETURN COALESCE(current_balance, 0);
END;
$$;

-- Function to create cash movement record
CREATE OR REPLACE FUNCTION create_cash_movement(
  p_store_id UUID,
  p_movement_type VARCHAR(30),
  p_amount DECIMAL(12,2),
  p_account_type VARCHAR(20),
  p_reference_type VARCHAR(20) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_tender_type VARCHAR(20) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  movement_id UUID;
BEGIN
  INSERT INTO cash_movements (
    store_id, movement_type, amount, account_type,
    reference_type, reference_id, description, tender_type,
    created_by
  ) VALUES (
    p_store_id, p_movement_type, p_amount, p_account_type,
    p_reference_type, p_reference_id, p_description, p_tender_type,
    'temp-user-id'
  ) RETURNING id INTO movement_id;
  
  RETURN movement_id;
END;
$$;