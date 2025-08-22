-- Database Views for Easy Querying
-- This file contains views for simplified data access

-- ==========================================
-- VIEWS FOR EASY QUERYING
-- ==========================================

-- Sales with store information
CREATE OR REPLACE VIEW sales_with_store AS
SELECT 
    s.*,
    st.store_code,
    st.store_name
FROM sales s
JOIN stores st ON s.store_id = st.id;

-- Expenses with store information  
CREATE OR REPLACE VIEW expenses_with_store AS
SELECT 
    e.*,
    st.store_code,
    st.store_name
FROM expenses e
JOIN stores st ON e.store_id = st.id;

-- Daily summary view
CREATE OR REPLACE VIEW daily_summary AS
SELECT 
    store_id,
    sale_date as summary_date,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    STRING_AGG(DISTINCT tender_type, ', ') as tender_types_used
FROM sales
GROUP BY store_id, sale_date
ORDER BY sale_date DESC, store_id;

-- Cash reconciliation view
CREATE OR REPLACE VIEW daily_cash_reconciliation AS
SELECT 
    s.store_id,
    st.store_name,
    s.sale_date,
    COALESCE(sales_cash.cash_sales, 0) as cash_sales,
    COALESCE(expense_cash.cash_expenses, 0) as cash_expenses,
    COALESCE(sales_cash.cash_sales, 0) - COALESCE(expense_cash.cash_expenses, 0) as net_cash_flow
FROM (
    SELECT DISTINCT store_id, sale_date FROM sales
    UNION
    SELECT DISTINCT store_id, expense_date as sale_date FROM expenses
) s
JOIN stores st ON s.store_id = st.id
LEFT JOIN (
    SELECT 
        store_id, 
        sale_date,
        SUM(CASE WHEN tender_type = 'cash' THEN amount ELSE 0 END) as cash_sales
    FROM sales 
    GROUP BY store_id, sale_date
) sales_cash ON s.store_id = sales_cash.store_id AND s.sale_date = sales_cash.sale_date
LEFT JOIN (
    SELECT 
        store_id, 
        expense_date,
        SUM(amount) as cash_expenses
    FROM expenses 
    GROUP BY store_id, expense_date
) expense_cash ON s.store_id = expense_cash.store_id AND s.sale_date = expense_cash.expense_date
ORDER BY s.sale_date DESC, st.store_name;

-- Monthly performance view
CREATE OR REPLACE VIEW monthly_performance AS
SELECT 
    st.store_id,
    st.store_name,
    DATE_TRUNC('month', s.sale_date) as month,
    COUNT(s.id) as total_transactions,
    SUM(s.amount) as total_sales,
    AVG(s.amount) as avg_transaction,
    COUNT(CASE WHEN s.tender_type = 'cash' THEN 1 END) as cash_transactions,
    COUNT(CASE WHEN s.tender_type = 'upi' THEN 1 END) as upi_transactions,
    COUNT(CASE WHEN s.tender_type = 'credit_card' THEN 1 END) as card_transactions
FROM sales s
JOIN stores st ON s.store_id = st.id
GROUP BY st.store_id, st.store_name, DATE_TRUNC('month', s.sale_date)
ORDER BY month DESC, st.store_name;