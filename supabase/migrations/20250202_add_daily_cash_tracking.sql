-- ==========================================
-- DAILY CASH TRACKING SYSTEM
-- ==========================================

-- Create daily_cash_positions table
CREATE TABLE IF NOT EXISTS public.daily_cash_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  business_date DATE NOT NULL,
  
  -- Opening balance (carried from previous day)
  opening_balance DECIMAL(12,2) DEFAULT 0,
  
  -- Daily inflows
  cash_sales DECIMAL(12,2) DEFAULT 0,
  so_advances DECIMAL(12,2) DEFAULT 0,
  gift_voucher_sales DECIMAL(12,2) DEFAULT 0,
  hand_bill_collections DECIMAL(12,2) DEFAULT 0,
  petty_transfers_in DECIMAL(12,2) DEFAULT 0,
  other_receipts DECIMAL(12,2) DEFAULT 0,
  
  -- Daily outflows  
  cash_returns DECIMAL(12,2) DEFAULT 0,
  cash_refunds DECIMAL(12,2) DEFAULT 0,
  petty_transfers_out DECIMAL(12,2) DEFAULT 0,
  cash_deposits DECIMAL(12,2) DEFAULT 0,
  
  -- Calculated closing (using GENERATED column)
  closing_balance DECIMAL(12,2) GENERATED ALWAYS AS (
    opening_balance 
    + cash_sales + so_advances + gift_voucher_sales 
    + hand_bill_collections + petty_transfers_in + other_receipts
    - cash_returns - cash_refunds - petty_transfers_out - cash_deposits
  ) STORED,
  
  -- Deposit tracking
  deposit_status VARCHAR(20) DEFAULT 'pending' CHECK (
    deposit_status IN ('pending', 'deposited', 'partial', 'carried_forward')
  ),
  deposit_id UUID REFERENCES public.cash_deposits(id),
  deposited_amount DECIMAL(12,2),
  deposited_at TIMESTAMPTZ,
  
  -- Counting & reconciliation
  count_id UUID REFERENCES public.cash_counts(id),
  counted_amount DECIMAL(12,2),
  count_variance DECIMAL(12,2),
  variance_reason TEXT,
  variance_resolved BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  is_bank_holiday BOOLEAN DEFAULT FALSE,
  holiday_name VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(store_id, business_date)
);

-- Create indexes for performance
CREATE INDEX idx_daily_cash_store_date ON public.daily_cash_positions(store_id, business_date DESC);
CREATE INDEX idx_daily_cash_deposit_status ON public.daily_cash_positions(deposit_status) 
  WHERE deposit_status = 'pending';
CREATE INDEX idx_daily_cash_variance ON public.daily_cash_positions(store_id, variance_resolved) 
  WHERE variance_resolved = FALSE;

-- ==========================================
-- DEPOSIT DAY MAPPINGS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.deposit_day_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES public.cash_deposits(id) ON DELETE CASCADE,
  daily_position_id UUID NOT NULL REFERENCES public.daily_cash_positions(id),
  business_date DATE NOT NULL,
  amount_included DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(deposit_id, daily_position_id)
);

CREATE INDEX idx_deposit_mappings_deposit ON public.deposit_day_mappings(deposit_id);
CREATE INDEX idx_deposit_mappings_date ON public.deposit_day_mappings(business_date);

-- ==========================================
-- UPDATE CASH DEPOSITS TABLE
-- ==========================================

ALTER TABLE public.cash_deposits 
  ADD COLUMN IF NOT EXISTS from_date DATE,
  ADD COLUMN IF NOT EXISTS to_date DATE,
  ADD COLUMN IF NOT EXISTS days_included INTEGER,
  ADD COLUMN IF NOT EXISTS accumulated_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS pre_deposit_balance DECIMAL(12,2);

-- ==========================================
-- SUPPORTING VIEWS
-- ==========================================

-- Pending deposits summary
CREATE OR REPLACE VIEW public.pending_deposits_summary AS
SELECT 
  dcp.store_id,
  s.store_name,
  s.store_code,
  MIN(dcp.business_date) as oldest_pending_date,
  MAX(dcp.business_date) as latest_pending_date,
  COUNT(*) as days_pending,
  SUM(dcp.closing_balance) as total_pending_amount,
  MAX(CURRENT_DATE - dcp.business_date) as oldest_days_ago,
  ARRAY_AGG(
    json_build_object(
      'date', dcp.business_date,
      'amount', dcp.closing_balance,
      'is_holiday', dcp.is_bank_holiday
    ) ORDER BY dcp.business_date
  ) as daily_breakdown
FROM public.daily_cash_positions dcp
JOIN public.stores s ON s.id = dcp.store_id
WHERE dcp.deposit_status = 'pending'
  AND dcp.closing_balance > 0
GROUP BY dcp.store_id, s.store_name, s.store_code;

-- Daily cash flow view
CREATE OR REPLACE VIEW public.daily_cash_flow AS
SELECT 
  dcp.*,
  COALESCE(dcp.counted_amount, dcp.closing_balance) as effective_balance,
  CASE 
    WHEN dcp.deposit_status = 'pending' AND (CURRENT_DATE - dcp.business_date) > 3 
    THEN 'overdue'
    WHEN dcp.deposit_status = 'pending' AND (CURRENT_DATE - dcp.business_date) = 3 
    THEN 'due_today'
    WHEN dcp.deposit_status = 'pending' 
    THEN 'accumulating'
    ELSE dcp.deposit_status
  END as deposit_urgency,
  s.store_name,
  s.store_code
FROM public.daily_cash_positions dcp
JOIN public.stores s ON s.id = dcp.store_id;

-- ==========================================
-- AUTO-UPDATE TRIGGER FROM CASH MOVEMENTS
-- ==========================================

CREATE OR REPLACE FUNCTION update_daily_position_from_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process sales_cash movements
  IF NEW.account_type != 'sales_cash' THEN
    RETURN NEW;
  END IF;

  -- Get or create daily position for the movement date
  INSERT INTO public.daily_cash_positions (store_id, business_date, opening_balance)
  VALUES (NEW.store_id, NEW.movement_date::date, 0)
  ON CONFLICT (store_id, business_date) DO NOTHING;
  
  -- Update the appropriate column based on movement type
  UPDATE public.daily_cash_positions
  SET 
    cash_sales = CASE 
      WHEN NEW.movement_type = 'sale'
      THEN COALESCE(cash_sales, 0) + NEW.amount
      ELSE cash_sales
    END,
    so_advances = CASE
      WHEN NEW.movement_type = 'advance' 
      THEN COALESCE(so_advances, 0) + NEW.amount  
      ELSE so_advances
    END,
    petty_transfers_out = CASE
      WHEN NEW.movement_type = 'transfer_out'
      THEN COALESCE(petty_transfers_out, 0) + NEW.amount
      ELSE petty_transfers_out
    END,
    petty_transfers_in = CASE
      WHEN NEW.movement_type = 'transfer_in'
      THEN COALESCE(petty_transfers_in, 0) + NEW.amount
      ELSE petty_transfers_in
    END,
    cash_deposits = CASE
      WHEN NEW.movement_type = 'deposit'
      THEN COALESCE(cash_deposits, 0) + ABS(NEW.amount) -- deposits are negative in movements
      ELSE cash_deposits
    END,
    updated_at = NOW()
  WHERE store_id = NEW.store_id 
    AND business_date = NEW.movement_date::date;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_daily_position ON public.cash_movements;
CREATE TRIGGER trigger_update_daily_position
AFTER INSERT ON public.cash_movements
FOR EACH ROW
EXECUTE FUNCTION update_daily_position_from_movement();

-- ==========================================
-- CARRY FORWARD BALANCE FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION carry_forward_daily_balance()
RETURNS void AS $$
DECLARE
  store RECORD;
  yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  today DATE := CURRENT_DATE;
BEGIN
  -- For each active store
  FOR store IN SELECT id FROM public.stores WHERE is_active = true LOOP
    -- Insert today's position with yesterday's closing as opening
    INSERT INTO public.daily_cash_positions (
      store_id, 
      business_date, 
      opening_balance
    )
    SELECT 
      store.id,
      today,
      COALESCE(closing_balance, 0)
    FROM public.daily_cash_positions
    WHERE store_id = store.id
      AND business_date = yesterday
    ON CONFLICT (store_id, business_date) 
    DO UPDATE SET
      opening_balance = EXCLUDED.opening_balance
    WHERE public.daily_cash_positions.opening_balance = 0;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Get pending positions for a store
CREATE OR REPLACE FUNCTION get_pending_cash_positions(
  p_store_id UUID,
  p_max_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  business_date DATE,
  opening_balance DECIMAL,
  closing_balance DECIMAL,
  cash_sales DECIMAL,
  so_advances DECIMAL,
  days_old INTEGER,
  is_bank_holiday BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dcp.id,
    dcp.business_date,
    dcp.opening_balance,
    dcp.closing_balance,
    dcp.cash_sales,
    dcp.so_advances,
    (CURRENT_DATE - dcp.business_date)::INTEGER as days_old,
    dcp.is_bank_holiday
  FROM public.daily_cash_positions dcp
  WHERE dcp.store_id = p_store_id
    AND dcp.deposit_status = 'pending'
    AND dcp.closing_balance > 0
  ORDER BY dcp.business_date ASC
  LIMIT p_max_days;
END;
$$;

-- Mark positions as deposited
CREATE OR REPLACE FUNCTION mark_positions_as_deposited(
  p_position_ids UUID[],
  p_deposit_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.daily_cash_positions
  SET 
    deposit_status = 'deposited',
    deposit_id = p_deposit_id,
    deposited_at = NOW(),
    updated_at = NOW()
  WHERE id = ANY(p_position_ids);
END;
$$;

-- ==========================================
-- MIGRATE HISTORICAL DATA
-- ==========================================

-- Populate historical daily positions from existing cash_movements
INSERT INTO public.daily_cash_positions (
  store_id,
  business_date,
  cash_sales,
  so_advances,
  petty_transfers_out,
  cash_deposits,
  deposit_status
)
SELECT 
  cm.store_id,
  cm.movement_date::date as business_date,
  SUM(CASE WHEN cm.movement_type = 'sale' THEN cm.amount ELSE 0 END) as cash_sales,
  SUM(CASE WHEN cm.movement_type = 'advance' THEN cm.amount ELSE 0 END) as so_advances,
  SUM(CASE WHEN cm.movement_type = 'transfer_out' THEN cm.amount ELSE 0 END) as petty_transfers_out,
  SUM(CASE WHEN cm.movement_type = 'deposit' THEN ABS(cm.amount) ELSE 0 END) as cash_deposits,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.cash_deposits cd 
      WHERE cd.store_id = cm.store_id 
      AND cd.deposit_date = cm.movement_date::date
    ) THEN 'deposited'
    ELSE 'pending'
  END as deposit_status
FROM public.cash_movements cm
WHERE cm.account_type = 'sales_cash'
  AND cm.movement_date >= CURRENT_DATE - INTERVAL '30 days' -- Last 30 days only for initial migration
GROUP BY cm.store_id, cm.movement_date::date
ON CONFLICT (store_id, business_date) DO NOTHING;

-- Update opening balances for historical data
WITH ordered_positions AS (
  SELECT 
    id,
    store_id,
    business_date,
    closing_balance,
    LAG(closing_balance, 1, 0) OVER (
      PARTITION BY store_id 
      ORDER BY business_date
    ) as prev_closing
  FROM public.daily_cash_positions
)
UPDATE public.daily_cash_positions dcp
SET opening_balance = op.prev_closing
FROM ordered_positions op
WHERE dcp.id = op.id
  AND dcp.opening_balance = 0;