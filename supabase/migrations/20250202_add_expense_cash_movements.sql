-- ==========================================
-- Add cash movement creation for Expenses (reduce petty cash)
-- ==========================================

-- 1. RPC function for Expense cash movements (reduces petty cash)
CREATE OR REPLACE FUNCTION create_expense_cash_movement(
  p_store_id UUID,
  p_amount DECIMAL,
  p_reference_id UUID,
  p_category VARCHAR,
  p_description TEXT
) RETURNS UUID AS $$
DECLARE
  v_movement_id UUID;
BEGIN
  -- Expenses are paid from petty cash (negative amount reduces balance)
  INSERT INTO public.cash_movements (
    store_id,
    movement_date,
    movement_type,
    amount,
    account_type,
    reference_type,
    reference_id,
    description,
    created_by
  ) VALUES (
    p_store_id,
    CURRENT_DATE,
    'expense',
    -p_amount, -- Negative because cash is going out
    'petty_cash', -- Expenses come from petty cash, not sales cash
    'expense',
    p_reference_id,
    COALESCE(p_description, '') || ' [' || p_category || ']',
    'System'
  ) RETURNING id INTO v_movement_id;
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Update daily position trigger to handle petty cash expenses
CREATE OR REPLACE FUNCTION update_daily_position_from_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle sales_cash movements
  IF NEW.account_type = 'sales_cash' THEN
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
      gift_voucher_sales = CASE
        WHEN NEW.movement_type = 'gift_voucher_sale'
        THEN COALESCE(gift_voucher_sales, 0) + NEW.amount
        ELSE gift_voucher_sales
      END,
      hand_bill_collections = CASE
        WHEN NEW.movement_type = 'hand_bill_collection'
        THEN COALESCE(hand_bill_collections, 0) + NEW.amount
        ELSE hand_bill_collections
      END,
      cash_returns = CASE
        WHEN NEW.movement_type = 'refund'
        THEN COALESCE(cash_returns, 0) + ABS(NEW.amount)
        ELSE cash_returns
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
        THEN COALESCE(cash_deposits, 0) + ABS(NEW.amount)
        ELSE cash_deposits
      END,
      updated_at = NOW()
    WHERE store_id = NEW.store_id 
      AND business_date = NEW.movement_date::date;
  END IF;
  
  -- Handle petty_cash movements (expenses)
  IF NEW.account_type = 'petty_cash' THEN
    -- For now, petty cash is tracked separately
    -- In future, could add petty_cash_expenses column to daily_cash_positions
    -- Or maintain a separate petty_cash_positions table
    
    -- Log the expense movement for audit
    RAISE NOTICE 'Petty cash expense recorded: Store %, Amount %, Date %', 
      NEW.store_id, NEW.amount, NEW.movement_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create missing cash movements for historical Expenses
DO $$
DECLARE
  v_exp RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_exp IN 
    SELECT e.*
    FROM public.expenses e
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cash_movements cm
      WHERE cm.reference_type = 'expense'
        AND cm.reference_id = e.id
    )
  LOOP
    INSERT INTO public.cash_movements (
      store_id,
      movement_date,
      movement_type,
      amount,
      account_type,
      reference_type,
      reference_id,
      description,
      created_by
    ) VALUES (
      v_exp.store_id,
      v_exp.expense_date::date,
      'expense',
      -v_exp.amount, -- Negative for expenses
      'petty_cash',
      'expense',
      v_exp.id,
      COALESCE(v_exp.description, '') || ' [' || v_exp.category || '] (Historical)',
      'Migration'
    );
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Created % cash movements for historical Expenses', v_count;
END $$;

-- 4. Add petty_cash_expenses column to daily_cash_positions if needed
ALTER TABLE public.daily_cash_positions
ADD COLUMN IF NOT EXISTS petty_cash_expenses DECIMAL(12,2) DEFAULT 0;

-- 5. Update the generated closing_balance column to include petty expenses
ALTER TABLE public.daily_cash_positions
DROP COLUMN IF EXISTS closing_balance;

ALTER TABLE public.daily_cash_positions
ADD COLUMN closing_balance DECIMAL(12,2) GENERATED ALWAYS AS (
  opening_balance 
  + COALESCE(cash_sales, 0) 
  + COALESCE(so_advances, 0) 
  + COALESCE(gift_voucher_sales, 0)
  + COALESCE(hand_bill_collections, 0) 
  + COALESCE(petty_transfers_in, 0) 
  + COALESCE(other_receipts, 0)
  - COALESCE(cash_returns, 0) 
  - COALESCE(cash_refunds, 0) 
  - COALESCE(petty_transfers_out, 0) 
  - COALESCE(cash_deposits, 0)
) STORED;

-- 6. Create petty_cash_positions table for tracking petty cash separately
CREATE TABLE IF NOT EXISTS public.petty_cash_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  business_date DATE NOT NULL,
  
  -- Balances
  opening_balance DECIMAL(12,2) DEFAULT 0,
  
  -- Movements
  transfers_in DECIMAL(12,2) DEFAULT 0, -- From sales cash
  expenses DECIMAL(12,2) DEFAULT 0, -- Total expenses paid
  
  -- Calculated closing balance
  closing_balance DECIMAL(12,2) GENERATED ALWAYS AS (
    opening_balance + transfers_in - expenses
  ) STORED,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(store_id, business_date)
);

-- 7. Trigger to update petty cash positions
CREATE OR REPLACE FUNCTION update_petty_position_from_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process petty_cash movements
  IF NEW.account_type != 'petty_cash' THEN
    RETURN NEW;
  END IF;

  -- Get or create petty position for the movement date
  INSERT INTO public.petty_cash_positions (store_id, business_date, opening_balance)
  VALUES (NEW.store_id, NEW.movement_date::date, 0)
  ON CONFLICT (store_id, business_date) DO NOTHING;
  
  -- Update based on movement type
  UPDATE public.petty_cash_positions
  SET 
    transfers_in = CASE
      WHEN NEW.movement_type = 'transfer_in'
      THEN COALESCE(transfers_in, 0) + NEW.amount
      ELSE transfers_in
    END,
    expenses = CASE
      WHEN NEW.movement_type = 'expense'
      THEN COALESCE(expenses, 0) + ABS(NEW.amount) -- Store as positive
      ELSE expenses
    END,
    updated_at = NOW()
  WHERE store_id = NEW.store_id 
    AND business_date = NEW.movement_date::date;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for petty cash updates
DROP TRIGGER IF EXISTS trigger_update_petty_position ON public.cash_movements;
CREATE TRIGGER trigger_update_petty_position
AFTER INSERT ON public.cash_movements
FOR EACH ROW
EXECUTE FUNCTION update_petty_position_from_movement();

-- 8. Populate historical petty cash positions
INSERT INTO public.petty_cash_positions (store_id, business_date, transfers_in, expenses)
SELECT 
  store_id,
  movement_date::date as business_date,
  SUM(CASE WHEN movement_type = 'transfer_in' THEN amount ELSE 0 END) as transfers_in,
  SUM(CASE WHEN movement_type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses
FROM public.cash_movements
WHERE account_type = 'petty_cash'
GROUP BY store_id, movement_date::date
ON CONFLICT (store_id, business_date) 
DO UPDATE SET
  transfers_in = EXCLUDED.transfers_in,
  expenses = EXCLUDED.expenses;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_expense_cash_movement TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.petty_cash_positions TO authenticated;

-- Add comments
COMMENT ON FUNCTION create_expense_cash_movement IS 'Creates cash movement for expenses paid from petty cash';
COMMENT ON TABLE petty_cash_positions IS 'Tracks daily petty cash positions separate from sales cash';
COMMENT ON FUNCTION update_petty_position_from_movement IS 'Updates petty cash position when movements are created';