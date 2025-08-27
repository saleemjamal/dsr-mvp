-- Sample store data for testing
INSERT INTO stores (store_code, store_name, address, phone, email, is_active) 
VALUES 
  ('MAIN', 'Main Store', '123 Business Street, City', '+91 9876543210', 'main@store.com', true)
ON CONFLICT (store_code) DO NOTHING;

-- Create a sample cash balance record for today
INSERT INTO cash_balances (
  store_id, 
  balance_date, 
  sales_cash_opening, 
  petty_cash_opening,
  total_cash_sales,
  total_cash_advances,
  total_transfers_out,
  total_deposits,
  total_expenses
) 
SELECT 
  s.id,
  CURRENT_DATE,
  0, -- sales_cash_opening
  5000, -- petty_cash_opening
  12500, -- total_cash_sales
  2500, -- total_cash_advances (GV, HB, SO)
  1000, -- total_transfers_out (to petty)
  0, -- total_deposits
  800 -- total_expenses
FROM stores s 
WHERE s.store_code = 'MAIN'
ON CONFLICT (store_id, balance_date) DO NOTHING;