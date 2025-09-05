- add all sql to supabase folder in root and group by functionality/feature

## Project Structure
This is a DSR (Daily Sales Report) MVP built with Next.js 15, TypeScript, and Supabase.

### Key Components:
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **UI Components**: Radix UI primitives with custom components
- **State Management**: Zustand
- **Data Fetching**: TanStack Query

### Main Features:
- **Cash Management System** - Daily cash counting, transfers, multi-day deposits, separate sales/petty cash tracking
- **Daily Cash Positions** - Automatic tracking with variance detection and deposit management
- Sales Management with multi-tender support
- Customer Management
- Returns & Vouchers Processing
- Hand Bills Management
- Expense Tracking with backdating support (automatically reduces petty cash)
- Store/Location Management with user assignments
- Admin Panel (stores, categories, tender types, users)
- **Reports & Analytics Module** - Comprehensive business intelligence and data export
- Multi-store access control and switching
- **Universal FilterBar System** - Cross-store and date range filtering across all modules
- **Transaction Reconciliation System** - Daily AIC workflow to match transactions against external sources
- **Credit Bills System** - Convert Sales Orders to final bills with variance tracking

### Development Commands:
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Database Schema Location:
- SQL files organized in `dsr-mvp/supabase/schemas/` by functionality
- Migration scripts in `dsr-mvp/supabase/migrations/`
- Sample data in `dsr-mvp/supabase/seeds/`

### FilterBar System:
- **Universal Component**: `@/components/ui/filter-bar.tsx` - Consistent filtering across all pages
- **Role-Based Access**: Store filter only visible to AIC/SU users with multi-store access
- **Date Range Presets**: Today, Yesterday, Last 7 days, This month, etc.
- **Real-Time Data**: All modules fetch filtered data based on selected criteria
- **Implemented Pages**: Dashboard, Sales, Expenses, Hand Bills, Returns, Sales Orders, Cash Management, Gift Vouchers
- **Store Context Integration**: Uses `accessibleStores` from store context for proper access control

### Reconciliation System:
- **Purpose**: Daily workflow for Accounts Incharge (AIC) to verify transactions against external sources (bank statements, ERP, physical vouchers)
- **Access**: Available via sidebar menu → "Reconciliation" (AIC and Super User roles only)
- **Status Flow**: All transactions follow `pending → reconciled → completed` lifecycle
- **Features**:
  - Quick "Reconcile" button for fast workflow
  - Detailed reconciliation dialog with optional source tracking (Bank, ERP, Cash, Voucher)
  - Batch reconciliation for multiple transactions
  - External reference tracking for audit trails
  - Date and store filtering for focused workflow
- **Database**: All transaction tables (sales, expenses, returns, hand_bills, gift_vouchers, sales_orders) include reconciliation columns
- **Edit Restrictions**: Store users can only edit transactions with `pending` status; reconciled transactions are locked
- **Icon Standardization**: Consistent Eye/Edit/Action pattern across all transaction list views

### Reports & Analytics Module:
- **Structure**: `/reports` hub with 4 categories: Financial, Operational, Compliance & Export, Analytics
- **Permission-Based**: All reports respect user roles and access controls
- **Real-Time Data**: Reports connect to actual transaction data with FilterBar integration
- **Export Ready**: Infrastructure for multiple formats (XML, Excel, PDF, CSV)

#### ✅ **IMPLEMENTED REPORTS**
1. **Reports Hub** (`/reports`) - Comprehensive dashboard with categorized navigation
2. **Daily Sales Summary** (`/reports/financial/daily-sales-summary`) - Real data analysis with payment method and store breakdowns
3. **Expense Report** (`/reports/financial/expense-report`) - Complete expense analytics with category breakdown and store performance
4. **Tally Export** (`/reports/compliance/tally-export`) - Full XML/CSV/Excel generation with GST support and voucher mapping

#### 📋 **PLANNED REPORTS** (Routes created, pages needed)
**Financial**: Profit & Loss, Cash Flow Statement
**Operational**: Store Performance, Transaction Log, Cash Variance Report  
**Compliance**: Tax Summary, Audit Trail
**Analytics**: Sales Trends, Period Comparisons, Forecasting

### Known Issues & Solutions:
- **TypeScript Compilation Errors**: ✅ **RESOLVED** - All TypeScript errors fixed across the application:
  - Fixed tender-types page `editingType` state and `handleEdit` parameter typing
  - Updated cash-management page to use `currentStore` instead of `selectedStore` with null safety
  - Added missing `storeIds` property to FilterState interface in FilterBar component
  - Added missing `tender_type` and `reconciled` status to SalesOrder interface
  - Added missing permission constants to permissions system
  - Unified Customer interface usage between service and components (fixed `name` vs `customer_name` conflicts)
  - Fixed voucher redeem page `getStatusBadge` function parameter typing
  - Removed duplicate return statement in sales-orders-service
  - Application now builds successfully with TypeScript strict checking
- **Next.js 15 SSG Compliance**: ✅ **RESOLVED** - All `useSearchParams()` usage wrapped in Suspense boundaries:
  - Fixed auth/callback page with proper Suspense boundary
  - Fixed returns/redeem page with proper Suspense boundary  
  - Fixed vouchers/redeem page with proper Suspense boundary
  - Fixed auth/login page with proper Suspense boundary
  - Production build now succeeds with all 39 static pages generated
- **Authentication System**: ✅ **SIMPLIFIED** - Complete auth rewrite based on Stock_Audit pattern:
  - Removed complex AuthContext with session refresh loops that caused race conditions
  - Removed `/auth/callback` page - OAuth now redirects directly to `/dashboard`
  - Simplified middleware to only handle API routes (not page auth checks)
  - Created simple `auth-helpers.ts` for direct auth checks in pages
  - Fixed user profile lookups - changed from email to UUID (`session.user.id`)
  - Implemented whitelist model - users must exist in database before login
  - Fixed header hydration issues with `mounted` state pattern for client components
  - Moved main app from `/` to `/dashboard` for clear separation
  - Bundle size reduced from 9.09 kB → 3.57 kB
  ```typescript
  // ✅ CORRECT - Simple auth check pattern
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) router.push('/auth/login')
  
  // ✅ CORRECT - Profile lookup by ID
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)  // Not email!
  ```
- **Supabase Query Methods**: ✅ **RESOLVED** - All `.single()`, `.maybeSingle()`, and `.limit(1)` patterns fixed to prevent hanging.
  ```typescript
  // ❌ WRONG - Will hang in production
  const { data, error } = await supabase.from('table').select().single()
  const { data, error } = await supabase.from('table').select().limit(1)
  
  // ✅ CORRECT - Works reliably
  const { data, error } = await supabase.from('table').select()
  return data && data.length > 0 ? data[0] : null
  ```
  **See**: `docs/SUPABASE_QUERY_FIX_GUIDE.md` for comprehensive fix documentation
- **Supabase Update Patterns**: Updates with `.select()` combinations can hang due to Next.js caching and RLS policies. Use simple update-only pattern.
  ```typescript
  // ❌ WRONG - May hang with complex chaining
  const { data, error } = await supabase.from('table').update({...}).eq('id', id).select().limit(1)
  
  // ✅ CORRECT - Simple pattern that works (from Stock_Audit project)
  const { error } = await supabase.from('table').update({...}).eq('id', id)
  if (error) throw new Error(error.message)
  // Return success object or fetch separately if needed
  return { success: true, id }
  ```
- **Store/User Deactivation System**: ✅ **IMPLEMENTED** - Complete inactive entity filtering with authentication checks
- **Dashboard Data Integration**: ✅ **COMPLETED** - Real-time dashboard with cash variance, comprehensive KPIs, and functional quick actions
- **Reports Module Foundation**: ✅ **IMPLEMENTED** - Structured reports hub with Tally export and sales summary
- **Navigation Loading States**: ✅ **RESOLVED** - Fixed perpetual loading on client-side navigation:
  ```typescript
  // ❌ WRONG - Causes perpetual loading
  const [loading, setLoading] = useState(true)
  
  // ✅ CORRECT - Initialize to false
  const [loading, setLoading] = useState(false)
  ```
  **See**: `docs/NAVIGATION_LOADING_FIX.md` for detailed explanation
- **FilterBar Loading Issues**: ✅ **RESOLVED** - Fixed race conditions with proper filter initialization:
  ```typescript
  // Initialize default filters on mount  
  useEffect(() => {
    if (!filters) {
      const today = new Date()
      setFilters({
        dateRange: { from: today, to: today, preset: 'Today' },
        storeIds: [],
        storeId: null
      })
    }
  }, [filters])
  ```
- **Store Management**: Complete CRUD operations working with proper validation and user assignments.
- **Cash Management Issues**: ✅ **RESOLVED** - Fixed multiple cash management issues:
  - Fixed `getDefaultStore()` returning wrong store - now checks user's default_store_id and user_store_access
  - Fixed cash adjustment store ID mismatch - adjustments now correctly assigned to selected store
  - Fixed database trigger using NULL created_by - trigger now uses NEW values instead of SELECT
  - Fixed audit trail Total Adjustments KPI showing ₹0 - now includes both 'approved' and 'completed' status
  - Added "All Stores" selection handling - shows warning message that specific store must be selected
  - Fixed expense double-negative bug - expenses were being added to petty cash instead of subtracted due to double negation in `get_current_cash_balance` function
- **UI/UX Improvements**: ✅ **ENHANCED** - Multiple interface improvements:
  - Improved sidebar visual hierarchy with uppercase group headers, subtle backgrounds for submenus, and visual connectors
  - Removed broken Settings and Profile links from avatar dropdown menu
  - Added HTML5 native date input to sales form allowing backdating and flexible date selection
  - Better demarcation between menu and submenu items with indentation and styling
  - Fixed date picker issues by using native HTML5 date input instead of complex Popover/Calendar components
- **Storage Buckets**: When creating buckets, ensure `file_size_limit` is set correctly in bytes (e.g., 5242880 for 5MB, not just 5).
- **Image Uploads**: All image uploads use compression (default 0.6 quality, 800x800px max) with progressive fallback to ensure files stay under 4MB.
- **Atomic Operations**: Hand bills require successful image upload before database creation. Expenses fail if provided image fails to upload.
- **Customer Lookup**: Auto-lookup on blur pattern implemented - removes manual search button for better UX.
- **Sales Order Constraints**: Fixed to allow same order number across different stores using composite unique constraint `(order_number, store_id)`.
  ```sql
  -- Migration needed
  ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_order_number_key;
  ALTER TABLE public.sales_orders ADD CONSTRAINT sales_orders_order_number_store_unique 
      UNIQUE (order_number, store_id);
  ```

### Testing Status:

#### ✅ **COMPLETED MODULES**
- **Credit Bills System**: ✅ **FULLY IMPLEMENTED** - Complete credit bill workflow with variance tracking:
  - Sales Orders now track advance payments in cash movements for immediate cash management visibility
  - SO to Credit Bill conversion with editable final amounts and automatic variance calculation
  - Variance tracking with required reason capture for accountability
  - Handles all scenarios: balance payments, refunds, and amount changes (increase/decrease)
  - Complete audit trail in `credit_bill_audit` table with automatic calculations
  - Credit Bill number generation (CB[YY][MM][###] format)
  - Sales page shows "Credit Bill" badge for credit transactions
  - Full integration with cash management - advances and balances properly tracked
  - Database migration: `20250201_add_credit_bills.sql`
  - TypeScript compliant with all types properly defined
- **Production Build Readiness**: ✅ **DEPLOYMENT READY** - All build issues resolved:
  - TypeScript strict checking errors resolved - application builds successfully  
  - Next.js 15 SSG compliance - all Suspense boundaries implemented
  - Authentication completely simplified following Stock_Audit pattern
  - Header component hydration issues resolved with mounted state
  - All 39 static pages generate successfully in production build
- **Sales Creation**: Multi-tender type sales creation working properly without hanging. Native HTML5 date input added for reliable date selection across all devices.
- **Multi-Category Expenses**: New table-based expense form with per-row image capture and backdating support working properly. Native HTML5 date input allows expense entry for previous dates.
- **Hand Bills Management**: Creation, image capture, customer lookup, and conversion functionality working properly.
- **Customer Operations**: Addition, search, creation, and lookup functionality working properly.
- **Location/Store Management**: Store CRUD operations, user assignments, and access control working properly.
- **User Management**: User profiles, permissions, and store access management working properly.
- **Gift Voucher (GV) Operations**: Creation, lookup, and redemption functionality working properly.
- **Transaction Reconciliation**: Daily AIC workflow with pending transaction filtering, quick reconcile buttons, detailed reconciliation dialog, and batch operations working properly.
- **Dashboard Integration**: Real-time metrics with cash variance, comprehensive KPIs, and functional navigation working properly.
- **Store/User Deactivation**: Inactive entity filtering across all modules with automatic authentication checks working properly.
- **Reports Module Foundation**: Reports hub navigation, Daily Sales Summary with real data, and Tally Export UI working properly.
- **Cash Deposit System**: ✅ **FULLY IMPLEMENTED** - Bank deposit recording with validation:
  - Validates deposits against latest cash count (must be within 2 hours)
  - Shows counted amount vs expected amount with variance
  - Prevents depositing more than counted amount
  - Records deposit slip number and bank details
  - Creates negative cash movement to reset sales cash to zero
  - Links deposits to cash counts for complete audit trail
  - Database migration: `20250201_add_cash_deposits.sql`
- **Cash Management System**: ✅ **WORKING** - Complete cash management module operational:
  - Cash adjustment requests with initial setup, correction, injection, and loss types
  - Automatic cash movement creation on approval via database triggers
  - Store-specific cash balances for sales cash and petty cash accounts
  - Cash variance calculation with threshold alerts
  - Cash counting, transfers, and audit trail functionality
  - Multi-store support with "All Stores" warning for store-specific operations
  - Fixed store context issues ensuring correct store assignment
  - Audit trail KPIs correctly show approved/completed adjustments

#### 🔄 **PENDING TESTING**
- **Sales Orders (SO) Operations**: Order creation, status updates, and management needs testing.
- **SO to Credit Bill Conversion**: Test conversion workflow, variance calculations, and audit trail creation.
- **Cash Deposit System**: Test deposit validation against cash counts, deposit slip recording, and sales cash reset.
- **Returns Processing**: Return creation, status updates, and refund processing needs testing.

#### 🚧 **DEVELOPMENT NEEDED**
- **Approvals Workflow**: Multi-level approval system for transfers and other operations needs development and testing.
- **Reports Backend**: 
  - Tally XML/Excel/CSV file generation and download
  - Universal export system for Excel/PDF across all modules
  - Additional report types (10+ reports planned)
- **Advanced Export Features**: Scheduled reports, email delivery, custom templates

#### 🚀 **DEPLOYMENT STATUS**
- **Production Ready**: ✅ All build issues resolved, TypeScript compliant, Next.js 15 SSG compliant
- **Environment Variables**: Required in Vercel deployment:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
  GOOGLE_CLIENT_ID=your_google_client_id
  GOOGLE_CLIENT_SECRET=your_google_client_secret
  ```
- **OAuth Configuration**: Google OAuth and Supabase auth URLs configured for `dailysales.report`
- **Deploy Command**: `vercel --prod`

- current schema is in @dsr-mvp\supabase\current_schema.sql

### Credit Bills Workflow:

#### **Complete Business Flow**
1. **Sales Order Creation**:
   - Customer places bulk order
   - Advance payment collected (optional)
   - Advance automatically tracked in cash_movements for daily counting
   - Order saved with pending status

2. **SO to Credit Bill Conversion**:
   - Customer returns to collect goods
   - Staff navigates to Orders → Convert
   - System shows:
     - Original order amount
     - Advance paid
     - Editable final amount (for quantity changes)
     - Automatic variance calculation
   - Staff enters:
     - Final bill amount
     - Variance reason (if amount changed)
     - Balance payment method
   - System creates:
     - Credit Bill with unique number (CB[YY][MM][###])
     - Sales entry for cash management
     - Audit trail with variance tracking
     - Cash movement for balance/refund

3. **Variance Handling**:
   - **Increase**: Customer adds items → Higher final amount → Balance payment collected
   - **Decrease**: Customer reduces items → Lower final amount → Possible refund
   - **No change**: Standard conversion → Balance payment only
   - All variances tracked with reason and percentage

4. **Cash Management Integration**:
   - Advances appear in daily cash counting immediately
   - Balance payments tracked separately
   - Refunds properly deducted
   - Complete cash trail from order to delivery

### Cash Management System:

#### **Two-Account System**
- **Sales Cash**: Customer transactions (sales, SO advances, GV purchases, HB collections)
- **Petty Cash**: Store expenses only
- **Cash Movements**: Only CASH tender types create movements (not card/UPI/bank)

#### **Daily Cash Positions**
- Automatic tracking via `daily_cash_positions` table
- Multi-day deposit support (up to 7 days accumulation)
- Variance tolerance: √(days) × ₹100
- Generated closing balance column for accurate totals

#### **Dashboard Cash KPIs**
- **Sales Cash**: Shows current balance with pending deposit warnings
- **Petty Cash**: Shows balance with low-fund alerts (<₹2000 warning, <₹500 critical)
- **Cash Variance**: Moved to secondary metrics (no more confusing "Net Position")

#### **Cash Movement Sources**
```sql
SALES CASH movements:
+ Cash sales (movement_type: 'sale')
+ SO advances - cash only (movement_type: 'advance')
+ Gift voucher sales - cash only (movement_type: 'gift_voucher_sale')
+ Hand bill collections - cash only (movement_type: 'hand_bill_collection')
- Cash returns/refunds (movement_type: 'refund')
- Transfers to petty cash (movement_type: 'transfer_out')
- Bank deposits (movement_type: 'deposit')

PETTY CASH movements:
+ Transfers from sales cash (movement_type: 'transfer_in')
- Expenses (movement_type: 'expense')
```

#### **Key Migrations**
1. `20250202_add_daily_cash_tracking.sql` - Daily positions & multi-day deposits
2. `20250202_fix_cash_only_movements.sql` - Ensures only cash creates movements
3. `20250202_add_cash_movements_for_gv_hb_returns.sql` - GV/HB/Returns movements
4. `20250202_add_expense_cash_movements.sql` - Expense petty cash tracking
5. `20250202_fix_expense_double_negative.sql` - Fix double-negative bug in petty cash calculation
6. `20250202_cleanup_test_data.sql` - Clean test data for beta
- always code to ensure typescript and ssg compliance
- current schema is at @dsr-mvp\supabase\current-schema-pulled\remote-schema.sql
- localhost doesnt work.
- I run on prod. Localhost does not work.
- I deploy through vercel --prod not git push.