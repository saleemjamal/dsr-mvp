# DSR Transaction Reconciliation System

## Overview

The DSR system implements a comprehensive transaction reconciliation workflow where the Accounts Incharge (AIC) matches daily transactions against external truth sources to ensure financial accuracy and audit compliance.

## Business Process

### Daily Reconciliation Workflow
1. **Store users** create transactions throughout the day (sales, expenses, returns, etc.)
2. **AIC** logs into the system each day to perform reconciliation
3. **AIC** matches DSR transactions against:
   - Bank statements (for digital payments)
   - ERP system (for inventory/sales data)
   - Physical vouchers (for expense receipts)
   - Cash count sheets (for cash transactions)
4. **AIC** marks transactions as reconciled or flags discrepancies
5. **System** prevents editing of reconciled transactions

## Transaction Types & Reconciliation Sources

### 1. Sales Transactions
- **Cash Sales** → Match against daily cash count sheets
- **Digital Sales** (UPI, Card) → Match against bank statements
- **All Sales** → Verify against ERP inventory movements
- **Status Flow**: `pending` → `reconciled` → `completed`

### 2. Expense Transactions  
- **Cash Expenses** → Match against cash count + physical vouchers
- **Digital Expenses** → Match against bank statements + vouchers
- **Status Flow**: `pending` → `reconciled` → `completed`

### 3. Hand Bill Transactions
- **Creation** → Match against physical handbill vouchers
- **Conversion** → When converted to sale, becomes part of sales reconciliation
- **Status Flow**: `pending` → `reconciled` → `converted`

### 4. Return Transactions
- **Cash Refunds** → Match against cash count adjustments
- **Digital Refunds** → Match against bank statement refunds
- **All Returns** → Verify against ERP inventory adjustments
- **Status Flow**: `pending` → `reconciled` → `completed`

### 5. Gift Voucher Transactions
- **Issuance** → Match payment (cash/digital) against bank/cash records
- **Redemption** → Verify against physical voucher usage
- **Status Flow**: `active` → `reconciled` → `redeemed/expired`

### 6. Sales Order Transactions
- **Advance Payments** → Match against bank/cash records
- **Balance Payments** → Match during order conversion to sale
- **Status Flow**: `pending` → `confirmed` → `delivered`

## Status System

### Standard Status Flow
```
pending → reconciled → completed
   ↑         ↑           ↑
Store     AIC Match   Final State
User      Process     
```

### Status Definitions
- **pending**: Created by store user, awaiting reconciliation
- **reconciled**: Verified by AIC against external sources
- **completed**: Final business state (delivered/processed/closed)

### Edit Permissions
- **Store Users**: Can edit only `pending` transactions
- **AIC**: Can reconcile any `pending` transaction
- **System**: Prevents editing of `reconciled` or `completed` transactions

## Database Schema

### Reconciliation Fields (Added to All Transaction Tables)
```sql
status VARCHAR DEFAULT 'pending'              -- pending/reconciled/completed
reconciled_by UUID REFERENCES users(id)       -- Who performed reconciliation
reconciled_at TIMESTAMP                       -- When reconciliation happened
reconciliation_source VARCHAR                 -- bank/erp/cash/voucher
reconciliation_notes TEXT                     -- Notes about discrepancies
external_reference VARCHAR                    -- Bank txn ID, ERP ref, etc.
```

### Transaction Tables Requiring Updates
- `sales`
- `expenses` 
- `returns`
- `hand_bills`
- `gift_vouchers` (modified to fit existing lifecycle)
- `sales_orders` (already has status system)

## User Interface

### Store User Experience
- **Transaction Lists**: Show status badges (Pending/Reconciled/Completed)
- **Edit Restrictions**: Edit buttons only visible for pending transactions
- **Visual Indicators**: Clear status communication

### AIC Reconciliation Interface
- **Daily Dashboard**: Summary of pending transactions by type
- **Reconciliation Workspace**: 
  - Filter by transaction type, store, date range
  - Batch selection and processing
  - Side-by-side comparison with external sources
- **Exception Management**: Flag and track discrepancies
- **Reporting**: Daily reconciliation reports and audit trails

### Icon Standardization
- **👁️ Eye**: View transaction details (all statuses)
- **✏️ Edit**: Edit transaction (pending only)
- **✅ CheckCircle**: Primary action (Convert/Complete/Redeem)
- **🔍 Search**: Reconciliation actions (AIC only)

## Reconciliation Matching Process

### Automated Matching (Future Enhancement)
- Import bank statements via file upload
- Import ERP data via API
- Auto-match based on amount, date, reference
- Flag unmatched items for manual review

### Manual Matching (Current Implementation)
- AIC views pending transactions
- Manually verifies against external sources
- Marks as reconciled with notes and external reference
- Handles exceptions and discrepancies

## Audit Trail Requirements

### Reconciliation Log
- All reconciliation actions logged
- Changes tracked with timestamp and user
- External reference numbers recorded
- Notes preserved for audit purposes

### Reporting Requirements
- Daily reconciliation status reports
- Exception and discrepancy reports
- Monthly audit trail summaries
- Bank/ERP matching statistics

## Security & Compliance

### Access Controls
- Only AIC role can perform reconciliation
- Store users cannot view reconciliation data
- Reconciled transactions are read-only
- Full audit trail maintained

### Data Integrity
- Prevent backdating of reconciliation
- Immutable reconciliation records
- External reference validation
- Reconciliation source tracking

## Implementation Phases

### Phase 1: Foundation
- Database schema updates
- Status system implementation
- Basic reconciliation interface

### Phase 2: Enhanced UX
- Icon standardization
- Improved filtering and search
- Batch processing capabilities

### Phase 3: Automation
- File import capabilities
- Auto-matching algorithms
- Advanced reporting dashboard

### Phase 4: Integration
- Bank API integration
- ERP system connectivity
- Real-time reconciliation alerts

This reconciliation system ensures financial accuracy while maintaining clear audit trails and appropriate access controls for different user roles.