-- Sample Data for Testing
-- This file contains sample data to populate the database for testing

-- ==========================================
-- SAMPLE DATA
-- ==========================================

-- Insert sample stores
INSERT INTO stores (store_code, store_name, address, phone, email) VALUES 
('CBD', 'CBD Store', 'Central Business District, Mumbai', '+91 98765 43210', 'cbd@poppat.com'),
('FSN', 'Fashion Store', 'Fashion Street, Mumbai', '+91 98765 43211', 'fashion@poppat.com'),
('HOME', 'Home Store', 'Home Decor District, Mumbai', '+91 98765 43212', 'home@poppat.com'),
('ELEC', 'Electronics Store', 'Electronics Market, Mumbai', '+91 98765 43213', 'electronics@poppat.com')
ON CONFLICT (store_code) DO NOTHING;

-- Insert sample customers
INSERT INTO customers (customer_name, phone, email, origin_store_id) 
SELECT 
    'Sample Customer ' || generate_series(1, 5),
    '+91 9876543' || LPAD(generate_series(1, 5)::text, 3, '0'),
    'customer' || generate_series(1, 5) || '@example.com',
    (SELECT id FROM stores ORDER BY RANDOM() LIMIT 1)
ON CONFLICT (phone) DO NOTHING;

-- Insert sample sales data (last 7 days)
INSERT INTO sales (store_id, sale_date, tender_type, amount, notes)
SELECT 
    (SELECT id FROM stores ORDER BY RANDOM() LIMIT 1),
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 6),
    (ARRAY['cash', 'credit_card', 'upi', 'gift_voucher'])[floor(random() * 4 + 1)],
    (random() * 5000 + 500)::decimal(10,2),
    'Sample sale transaction'
FROM generate_series(1, 20);

-- Insert sample expenses data
INSERT INTO expenses (store_id, expense_date, category, amount, description)
SELECT 
    (SELECT id FROM stores ORDER BY RANDOM() LIMIT 1),
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 6),
    (ARRAY['Staff Welfare', 'Logistics', 'Utilities', 'Office Supplies', 'Maintenance', 'Miscellaneous'])[floor(random() * 6 + 1)],
    (random() * 2000 + 100)::decimal(10,2),
    'Sample expense transaction for ' || (ARRAY['office supplies', 'staff refreshments', 'electricity bill', 'courier charges', 'cleaning services', 'miscellaneous items'])[floor(random() * 6 + 1)]
FROM generate_series(1, 15);

-- Insert sample gift vouchers
INSERT INTO gift_vouchers (voucher_number, amount, balance, status, customer_name, customer_phone, expiry_date) VALUES 
('GV2025001', 1000.00, 1000.00, 'active', 'Rahul Sharma', '+91 9876543001', CURRENT_DATE + INTERVAL '365 days'),
('GV2025002', 500.00, 250.00, 'active', 'Priya Patel', '+91 9876543002', CURRENT_DATE + INTERVAL '365 days'),
('GV2025003', 2000.00, 0.00, 'redeemed', 'Amit Kumar', '+91 9876543003', CURRENT_DATE + INTERVAL '365 days'),
('GV2025004', 1500.00, 750.00, 'active', 'Sneha Singh', '+91 9876543004', CURRENT_DATE + INTERVAL '365 days'),
('GV2025005', 800.00, 800.00, 'active', 'Vikram Gupta', '+91 9876543005', CURRENT_DATE + INTERVAL '365 days')
ON CONFLICT (voucher_number) DO NOTHING;

-- Insert sample damage reports
INSERT INTO damage_reports (store_id, supplier_name, item_name, quantity, estimated_value, status) VALUES
((SELECT id FROM stores WHERE store_code = 'CBD'), 'ABC Suppliers', 'Damaged Electronics', 2, 1500.00, 'reported'),
((SELECT id FROM stores WHERE store_code = 'FSN'), 'Fashion Corp', 'Torn Garments', 5, 2500.00, 'investigating'),
((SELECT id FROM stores WHERE store_code = 'HOME'), 'Home Decor Ltd', 'Broken Furniture', 1, 5000.00, 'resolved');

-- Insert sample sales orders
INSERT INTO sales_orders (store_id, customer_name, customer_phone, items_description, total_amount, advance_amount, delivery_date) VALUES
((SELECT id FROM stores WHERE store_code = 'CBD'), 'John Doe', '+91 9876543100', 'Custom electronics order', 15000.00, 5000.00, CURRENT_DATE + INTERVAL '7 days'),
((SELECT id FROM stores WHERE store_code = 'FSN'), 'Jane Smith', '+91 9876543101', 'Custom tailoring order', 8000.00, 2000.00, CURRENT_DATE + INTERVAL '5 days');

-- Insert sample returns
INSERT INTO returns (store_id, original_bill_reference, return_amount, refund_method, customer_name, reason) VALUES
((SELECT id FROM stores WHERE store_code = 'CBD'), 'BILL001', 1200.00, 'cash', 'Customer A', 'Product defect'),
((SELECT id FROM stores WHERE store_code = 'FSN'), 'BILL002', 800.00, 'upi', 'Customer B', 'Wrong size');