-- Add reconciliation system fields to all transaction tables
-- Based on the reconciliation system documentation

-- Add reconciliation fields to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES user_profiles(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reconciliation_source VARCHAR;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS external_reference VARCHAR;

-- Add reconciliation fields to expenses table  
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES user_profiles(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reconciliation_source VARCHAR;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS external_reference VARCHAR;

-- Add reconciliation fields to returns table
ALTER TABLE returns ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending';
ALTER TABLE returns ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES user_profiles(id);
ALTER TABLE returns ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS reconciliation_source VARCHAR;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS external_reference VARCHAR;

-- Add reconciliation fields to hand_bills table
ALTER TABLE hand_bills ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending';
ALTER TABLE hand_bills ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES user_profiles(id);
ALTER TABLE hand_bills ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE hand_bills ADD COLUMN IF NOT EXISTS reconciliation_source VARCHAR;
ALTER TABLE hand_bills ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;
ALTER TABLE hand_bills ADD COLUMN IF NOT EXISTS external_reference VARCHAR;

-- Gift vouchers already have a status system, just add reconciliation fields
ALTER TABLE gift_vouchers ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES user_profiles(id);
ALTER TABLE gift_vouchers ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE gift_vouchers ADD COLUMN IF NOT EXISTS reconciliation_source VARCHAR;
ALTER TABLE gift_vouchers ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;
ALTER TABLE gift_vouchers ADD COLUMN IF NOT EXISTS external_reference VARCHAR;

-- Sales orders already have status system, add reconciliation fields for advance payments
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES user_profiles(id);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS reconciliation_source VARCHAR;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS external_reference VARCHAR;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_reconciled_at ON sales(reconciled_at);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_reconciled_at ON expenses(reconciled_at);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_reconciled_at ON returns(reconciled_at);
CREATE INDEX IF NOT EXISTS idx_hand_bills_status ON hand_bills(status);
CREATE INDEX IF NOT EXISTS idx_hand_bills_reconciled_at ON hand_bills(reconciled_at);

-- Create function to prevent editing of reconciled transactions
CREATE OR REPLACE FUNCTION check_transaction_editable()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow updates to reconciliation fields by AIC users
  IF TG_OP = 'UPDATE' AND OLD.status IN ('reconciled', 'completed') THEN
    -- Check if only reconciliation fields are being updated
    IF (NEW.reconciled_by IS DISTINCT FROM OLD.reconciled_by OR
        NEW.reconciled_at IS DISTINCT FROM OLD.reconciled_at OR
        NEW.reconciliation_source IS DISTINCT FROM OLD.reconciliation_source OR
        NEW.reconciliation_notes IS DISTINCT FROM OLD.reconciliation_notes OR
        NEW.external_reference IS DISTINCT FROM OLD.external_reference OR
        NEW.status IS DISTINCT FROM OLD.status) THEN
      -- Allow reconciliation updates
      RETURN NEW;
    ELSE
      -- Prevent other field updates on reconciled transactions
      RAISE EXCEPTION 'Cannot modify reconciled or completed transactions';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to prevent editing reconciled transactions
DROP TRIGGER IF EXISTS prevent_edit_reconciled_sales ON sales;
CREATE TRIGGER prevent_edit_reconciled_sales
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION check_transaction_editable();

DROP TRIGGER IF EXISTS prevent_edit_reconciled_expenses ON expenses;
CREATE TRIGGER prevent_edit_reconciled_expenses
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION check_transaction_editable();

DROP TRIGGER IF EXISTS prevent_edit_reconciled_returns ON returns;
CREATE TRIGGER prevent_edit_reconciled_returns
  BEFORE UPDATE ON returns
  FOR EACH ROW EXECUTE FUNCTION check_transaction_editable();

DROP TRIGGER IF EXISTS prevent_edit_reconciled_hand_bills ON hand_bills;
CREATE TRIGGER prevent_edit_reconciled_hand_bills
  BEFORE UPDATE ON hand_bills
  FOR EACH ROW EXECUTE FUNCTION check_transaction_editable();

-- Add comments for documentation
COMMENT ON COLUMN sales.status IS 'Transaction status: pending, reconciled, completed';
COMMENT ON COLUMN sales.reconciled_by IS 'User ID who performed reconciliation';
COMMENT ON COLUMN sales.reconciled_at IS 'Timestamp when reconciliation was performed';
COMMENT ON COLUMN sales.reconciliation_source IS 'Source used for reconciliation: bank, erp, cash, voucher';
COMMENT ON COLUMN sales.reconciliation_notes IS 'Notes about discrepancies or reconciliation process';
COMMENT ON COLUMN sales.external_reference IS 'External reference number (bank txn ID, ERP ref, etc.)';

-- Similar comments for other tables
COMMENT ON COLUMN expenses.status IS 'Transaction status: pending, reconciled, completed';
COMMENT ON COLUMN returns.status IS 'Transaction status: pending, reconciled, completed';
COMMENT ON COLUMN hand_bills.status IS 'Transaction status: pending, reconciled, completed';