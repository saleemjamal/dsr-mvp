-- ==========================================
-- Add cash movement creation for GV, HB, and Returns
-- ==========================================

-- 1. RPC function for Gift Voucher cash movements
CREATE OR REPLACE FUNCTION create_gv_cash_movement(
  p_store_id UUID,
  p_amount DECIMAL,
  p_reference_id UUID,
  p_voucher_number VARCHAR
) RETURNS UUID AS $$
DECLARE
  v_movement_id UUID;
BEGIN
  -- Only create movement for cash purchases (function should only be called for cash)
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
    'gift_voucher_sale',
    p_amount,
    'sales_cash',
    'gift_voucher',
    p_reference_id,
    'Cash received for Gift Voucher ' || p_voucher_number,
    'System'
  ) RETURNING id INTO v_movement_id;
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- 2. RPC function for Hand Bill cash movements
CREATE OR REPLACE FUNCTION create_hb_cash_movement(
  p_store_id UUID,
  p_amount DECIMAL,
  p_reference_id UUID,
  p_bill_number VARCHAR
) RETURNS UUID AS $$
DECLARE
  v_movement_id UUID;
BEGIN
  -- Only create movement for cash hand bills (function should only be called for cash)
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
    'hand_bill_collection',
    p_amount,
    'sales_cash',
    'hand_bill',
    p_reference_id,
    'Cash collected for Hand Bill ' || COALESCE(p_bill_number, ''),
    'System'
  ) RETURNING id INTO v_movement_id;
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- 3. RPC function for Return cash movements (refunds are negative)
CREATE OR REPLACE FUNCTION create_return_cash_movement(
  p_store_id UUID,
  p_amount DECIMAL,
  p_reference_id UUID,
  p_bill_reference VARCHAR
) RETURNS UUID AS $$
DECLARE
  v_movement_id UUID;
BEGIN
  -- Only create movement for cash refunds (function should only be called for cash)
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
    'refund',
    -p_amount, -- Negative for refunds (cash going out)
    'sales_cash',
    'return',
    p_reference_id,
    'Cash refund for return of ' || p_bill_reference,
    'System'
  ) RETURNING id INTO v_movement_id;
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Update daily position trigger to handle new movement types
CREATE OR REPLACE FUNCTION update_daily_position_from_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process sales_cash movements (petty cash handled separately)
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
      THEN COALESCE(cash_returns, 0) + ABS(NEW.amount) -- Store as positive for clarity
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
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Extend validation function to check new types
CREATE OR REPLACE FUNCTION validate_cash_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- For sales movements, verify tender type is cash
  IF NEW.movement_type = 'sale' AND NEW.reference_type = 'sale' THEN
    PERFORM 1 FROM public.sales 
    WHERE id = NEW.reference_id 
    AND LOWER(tender_type) = 'cash';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot create cash movement for non-cash sale';
    END IF;
  END IF;
  
  -- For advance movements, verify tender type is cash
  IF NEW.movement_type = 'advance' AND NEW.reference_type = 'sales_order' THEN
    PERFORM 1 FROM public.sales_orders 
    WHERE id = NEW.reference_id 
    AND LOWER(tender_type) = 'cash';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot create cash movement for non-cash advance';
    END IF;
  END IF;
  
  -- For gift voucher movements, verify tender type is cash
  IF NEW.movement_type = 'gift_voucher_sale' AND NEW.reference_type = 'gift_voucher' THEN
    PERFORM 1 FROM public.gift_vouchers 
    WHERE id = NEW.reference_id 
    AND LOWER(tender_type) = 'cash';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot create cash movement for non-cash gift voucher';
    END IF;
  END IF;
  
  -- For hand bill movements, verify tender type is cash
  IF NEW.movement_type = 'hand_bill_collection' AND NEW.reference_type = 'hand_bill' THEN
    PERFORM 1 FROM public.hand_bills 
    WHERE id = NEW.reference_id 
    AND LOWER(tender_type) = 'cash';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot create cash movement for non-cash hand bill';
    END IF;
  END IF;
  
  -- For return movements, verify refund method is cash
  IF NEW.movement_type = 'refund' AND NEW.reference_type = 'return' THEN
    PERFORM 1 FROM public.returns 
    WHERE id = NEW.reference_id 
    AND LOWER(refund_method) = 'cash';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot create cash movement for non-cash return';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create missing cash movements for historical Gift Vouchers
DO $$
DECLARE
  v_gv RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_gv IN 
    SELECT gv.*, s.store_id, s.store_name
    FROM public.gift_vouchers gv
    JOIN public.stores s ON s.id = gv.store_id
    WHERE LOWER(gv.tender_type) = 'cash'
      AND NOT EXISTS (
        SELECT 1 FROM public.cash_movements cm
        WHERE cm.reference_type = 'gift_voucher'
          AND cm.reference_id = gv.id
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
      v_gv.store_id,
      v_gv.issued_date::date,
      'gift_voucher_sale',
      v_gv.amount,
      'sales_cash',
      'gift_voucher',
      v_gv.id,
      'Cash received for Gift Voucher ' || v_gv.voucher_number || ' (Historical)',
      'Migration'
    );
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Created % cash movements for historical Gift Vouchers', v_count;
END $$;

-- 7. Create missing cash movements for historical Hand Bills
DO $$
DECLARE
  v_hb RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_hb IN 
    SELECT hb.*
    FROM public.hand_bills hb
    WHERE LOWER(hb.tender_type) = 'cash'
      AND NOT EXISTS (
        SELECT 1 FROM public.cash_movements cm
        WHERE cm.reference_type = 'hand_bill'
          AND cm.reference_id = hb.id
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
      v_hb.store_id,
      v_hb.bill_date::date,
      'hand_bill_collection',
      v_hb.total_amount,
      'sales_cash',
      'hand_bill',
      v_hb.id,
      'Cash collected for Hand Bill ' || COALESCE(v_hb.bill_number, '') || ' (Historical)',
      'Migration'
    );
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Created % cash movements for historical Hand Bills', v_count;
END $$;

-- 8. Create missing cash movements for historical Returns
DO $$
DECLARE
  v_ret RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_ret IN 
    SELECT r.*
    FROM public.returns r
    WHERE LOWER(r.refund_method) = 'cash'
      AND NOT EXISTS (
        SELECT 1 FROM public.cash_movements cm
        WHERE cm.reference_type = 'return'
          AND cm.reference_id = r.id
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
      v_ret.store_id,
      v_ret.return_date::date,
      'refund',
      -v_ret.return_amount, -- Negative for refunds
      'sales_cash',
      'return',
      v_ret.id,
      'Cash refund for return of ' || v_ret.original_bill_reference || ' (Historical)',
      'Migration'
    );
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Created % cash movements for historical Returns', v_count;
END $$;

-- 9. Recalculate daily positions to include new movements
UPDATE public.daily_cash_positions dcp
SET 
  gift_voucher_sales = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.cash_movements cm
    WHERE cm.store_id = dcp.store_id
      AND cm.movement_date::date = dcp.business_date
      AND cm.movement_type = 'gift_voucher_sale'
      AND cm.account_type = 'sales_cash'
  ),
  hand_bill_collections = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.cash_movements cm
    WHERE cm.store_id = dcp.store_id
      AND cm.movement_date::date = dcp.business_date
      AND cm.movement_type = 'hand_bill_collection'
      AND cm.account_type = 'sales_cash'
  ),
  cash_returns = (
    SELECT COALESCE(SUM(ABS(amount)), 0) -- Store as positive
    FROM public.cash_movements cm
    WHERE cm.store_id = dcp.store_id
      AND cm.movement_date::date = dcp.business_date
      AND cm.movement_type = 'refund'
      AND cm.account_type = 'sales_cash'
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM public.cash_movements cm
  WHERE cm.store_id = dcp.store_id
    AND cm.movement_date::date = dcp.business_date
    AND cm.movement_type IN ('gift_voucher_sale', 'hand_bill_collection', 'refund')
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_gv_cash_movement TO authenticated;
GRANT EXECUTE ON FUNCTION create_hb_cash_movement TO authenticated;
GRANT EXECUTE ON FUNCTION create_return_cash_movement TO authenticated;

-- Add comments
COMMENT ON FUNCTION create_gv_cash_movement IS 'Creates cash movement for Gift Voucher cash purchases';
COMMENT ON FUNCTION create_hb_cash_movement IS 'Creates cash movement for Hand Bill cash collections';
COMMENT ON FUNCTION create_return_cash_movement IS 'Creates cash movement for cash refunds on returns';