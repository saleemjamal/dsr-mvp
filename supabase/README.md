# Supabase Database Setup

This directory contains organized SQL files for setting up the DSR Simplified database.

## 📁 Directory Structure

```
supabase/
├── schemas/               # Database schema files
│   ├── 01_core_tables.sql        # Core business tables (stores, sales, expenses, vouchers)
│   ├── 02_customer_management.sql # Customer-related tables
│   ├── 03_inventory_damage.sql    # Inventory and damage tracking
│   ├── 04_indexes_performance.sql # Database indexes for performance
│   └── 05_triggers_functions.sql  # Triggers for auto-updates
├── functions/             # Business logic and views
│   ├── business_logic.sql         # Business calculation functions
│   └── views.sql                  # Database views for easier querying
├── seeds/                 # Sample data
│   └── sample_data.sql           # Test data for development
└── README.md              # This file
```

## 🚀 Setup Instructions

### Option 1: Run All Files (Recommended)
Copy and paste the complete `supabase-schema.sql` file into your Supabase SQL Editor.

### Option 2: Run Individual Files (For Understanding)
Run the files in this order:

1. **Schemas** (run in order):
   ```sql
   -- 1. Core tables first
   schemas/01_core_tables.sql
   
   -- 2. Customer management tables
   schemas/02_customer_management.sql
   
   -- 3. Inventory and damage tables
   schemas/03_inventory_damage.sql
   
   -- 4. Performance indexes
   schemas/04_indexes_performance.sql
   
   -- 5. Triggers and utility functions
   schemas/05_triggers_functions.sql
   ```

2. **Functions and Views**:
   ```sql
   -- Business logic functions
   functions/business_logic.sql
   
   -- Database views
   functions/views.sql
   ```

3. **Sample Data** (optional):
   ```sql
   -- Test data for development
   seeds/sample_data.sql
   ```

## 📊 What Gets Created

### Core Tables
- `stores` - Store locations and details
- `sales` - Sales transactions
- `expenses` - Business expenses
- `gift_vouchers` - Gift voucher management

### Extended Tables
- `customers` - Customer database
- `hand_bills` - POS failure backup
- `sales_orders` - Customer orders
- `returns` - Return processing
- `damage_reports` - Damage tracking

### Performance Features
- **Indexes** on commonly queried columns
- **Triggers** for automatic timestamp updates
- **Views** for easier data access
- **Functions** for business calculations

### Sample Data
- 4 stores with different categories
- 20+ sample sales transactions
- 15+ sample expense records
- 5 gift vouchers with different statuses
- Customer data and other test records

## 🔧 Business Functions

### Cash Summary
```sql
-- Get daily cash summary for all stores
SELECT * FROM get_daily_cash_summary();

-- Get cash summary for specific store
SELECT * FROM get_daily_cash_summary(CURRENT_DATE, 'store-uuid');
```

### Store Metrics
```sql
-- Get 30-day performance metrics for a store
SELECT * FROM get_store_metrics('store-uuid');

-- Get 7-day metrics
SELECT * FROM get_store_metrics('store-uuid', 7);
```

### Gift Voucher Liability
```sql
-- Get total voucher liability
SELECT * FROM get_voucher_liability();
```

## 📈 Useful Views

### Sales with Store Info
```sql
SELECT * FROM sales_with_store WHERE sale_date = CURRENT_DATE;
```

### Daily Cash Reconciliation
```sql
SELECT * FROM daily_cash_reconciliation WHERE sale_date = CURRENT_DATE;
```

### Monthly Performance
```sql
SELECT * FROM monthly_performance WHERE month = DATE_TRUNC('month', CURRENT_DATE);
```

## 🔐 Security Notes

- Row Level Security (RLS) is disabled for MVP
- All tables are publicly accessible for development
- **Important**: Enable RLS and create proper policies before production deployment

## 📝 Environment Setup

After running the SQL, update your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## ✅ Verification

After setup, verify with these queries:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check sample data
SELECT COUNT(*) as store_count FROM stores;
SELECT COUNT(*) as sales_count FROM sales;
SELECT COUNT(*) as expenses_count FROM expenses;

-- Test business functions
SELECT * FROM get_daily_cash_summary();
```

## 🚀 Next Steps

1. Run the schema in your Supabase project
2. Update your `.env.local` file
3. Restart your Next.js development server
4. Your app will now use real data from Supabase!