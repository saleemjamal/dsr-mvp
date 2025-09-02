-- ==========================================
-- CASH DEPOSITS TABLE
-- ==========================================

-- Create cash_deposits table to track bank deposits
CREATE TABLE IF NOT EXISTS public.cash_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  deposit_slip_number VARCHAR(50) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  deposited_by VARCHAR(255) NOT NULL,
  deposited_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  cash_count_id UUID REFERENCES public.cash_counts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_cash_deposits_store_id ON public.cash_deposits(store_id);
CREATE INDEX idx_cash_deposits_deposit_date ON public.cash_deposits(deposit_date);
CREATE INDEX idx_cash_deposits_cash_count_id ON public.cash_deposits(cash_count_id);

-- Note: cash_movements.movement_type is VARCHAR with CHECK constraint
-- 'deposit' value is already supported in the CHECK constraint based on current schema

-- Function to get deposit summary for a store
CREATE OR REPLACE FUNCTION get_deposit_summary(
  p_store_id UUID,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_deposits DECIMAL,
  deposit_count INTEGER,
  last_deposit_date DATE,
  last_deposit_amount DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount), 0) as total_deposits,
    COUNT(*)::INTEGER as deposit_count,
    MAX(deposit_date) as last_deposit_date,
    (SELECT amount FROM cash_deposits 
     WHERE store_id = p_store_id 
     AND (p_from_date IS NULL OR deposit_date >= p_from_date)
     AND (p_to_date IS NULL OR deposit_date <= p_to_date)
     ORDER BY deposit_date DESC LIMIT 1) as last_deposit_amount
  FROM cash_deposits
  WHERE store_id = p_store_id
  AND (p_from_date IS NULL OR deposit_date >= p_from_date)
  AND (p_to_date IS NULL OR deposit_date <= p_to_date);
END;
$$;