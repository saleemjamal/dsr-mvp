-- Business Logic Functions
-- This file contains business logic functions for calculations and reporting

-- ==========================================
-- BUSINESS LOGIC FUNCTIONS
-- ==========================================

-- Function to calculate daily cash variance
CREATE OR REPLACE FUNCTION get_daily_cash_summary(target_date DATE DEFAULT CURRENT_DATE, target_store_id UUID DEFAULT NULL)
RETURNS TABLE (
    store_id UUID,
    store_name VARCHAR,
    cash_sales DECIMAL,
    cash_expenses DECIMAL,
    net_cash DECIMAL,
    transaction_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as store_id,
        s.store_name,
        COALESCE(sales_data.cash_sales, 0) as cash_sales,
        COALESCE(expense_data.cash_expenses, 0) as cash_expenses,
        COALESCE(sales_data.cash_sales, 0) - COALESCE(expense_data.cash_expenses, 0) as net_cash,
        COALESCE(sales_data.sales_count, 0) + COALESCE(expense_data.expense_count, 0) as transaction_count
    FROM stores s
    LEFT JOIN (
        SELECT 
            store_id,
            SUM(CASE WHEN tender_type = 'cash' THEN amount ELSE 0 END) as cash_sales,
            COUNT(*) as sales_count
        FROM sales 
        WHERE sale_date = target_date
        AND (target_store_id IS NULL OR store_id = target_store_id)
        GROUP BY store_id
    ) sales_data ON s.id = sales_data.store_id
    LEFT JOIN (
        SELECT 
            store_id,
            SUM(amount) as cash_expenses,
            COUNT(*) as expense_count
        FROM expenses 
        WHERE expense_date = target_date
        AND (target_store_id IS NULL OR store_id = target_store_id)
        GROUP BY store_id
    ) expense_data ON s.id = expense_data.store_id
    WHERE s.is_active = true
    AND (target_store_id IS NULL OR s.id = target_store_id);
END;
$$ LANGUAGE plpgsql;

-- Function to get store performance metrics
CREATE OR REPLACE FUNCTION get_store_metrics(target_store_id UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    total_sales DECIMAL,
    total_expenses DECIMAL,
    net_revenue DECIMAL,
    avg_daily_sales DECIMAL,
    transaction_count INTEGER,
    top_tender_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(s.amount), 0) as total_sales,
        COALESCE(SUM(e.amount), 0) as total_expenses,
        COALESCE(SUM(s.amount), 0) - COALESCE(SUM(e.amount), 0) as net_revenue,
        COALESCE(SUM(s.amount), 0) / days_back as avg_daily_sales,
        COUNT(s.id)::INTEGER as transaction_count,
        (
            SELECT tender_type 
            FROM sales 
            WHERE store_id = target_store_id 
            AND sale_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY tender_type 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ) as top_tender_type
    FROM sales s
    FULL OUTER JOIN expenses e ON s.store_id = e.store_id AND s.sale_date = e.expense_date
    WHERE (s.store_id = target_store_id OR e.store_id = target_store_id)
    AND (s.sale_date >= CURRENT_DATE - INTERVAL '30 days' OR e.expense_date >= CURRENT_DATE - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- Function to get gift voucher liability
CREATE OR REPLACE FUNCTION get_voucher_liability()
RETURNS TABLE (
    total_outstanding DECIMAL,
    active_vouchers INTEGER,
    expiring_soon INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'active' THEN balance ELSE 0 END), 0) as total_outstanding,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::INTEGER as active_vouchers,
        COUNT(CASE WHEN status = 'active' AND expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END)::INTEGER as expiring_soon
    FROM gift_vouchers;
END;
$$ LANGUAGE plpgsql;