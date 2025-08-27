# Cash Management System - Implementation Plan

**Created**: 2025-01-22  
**Status**: Planning Phase  
**Priority**: High  

## Overview

Comprehensive cash management system for DSR with denomination tracking, transfer approvals, and automated variance calculations.

## Core Requirements

### Cash Flow Formulas

#### Sales Cash Balance (Daily Reset to ₹0)
```
Cash Sales + Cash GV/HB/SO Advances - Cash Transfers to Petty - Cash Deposits = 0
```

#### Petty Cash Balance (Continuous)
```
Opening Petty + Cash Transfers from Sales - Expenses - Change Fund = Current Petty
```

### Business Rules
- **All expenses** paid only from petty cash
- **Change fund** is part of petty cash
- **No cash refunds** (only store credit via RRN)
- **Daily deposits** of all sales cash (next morning before 12pm)
- **Petty cash top-up** when balance < ₹2000 (usually to ₹5000)

## Module Structure

### Cash Management Module (`/cash-management`)
```
/cash-management
├── /count              # Daily cash counting
├── /transfers          # Cash transfer requests/approvals
└── /history           # Cash movement history
```

## Implementation Plan

### Phase 1: Daily Cash Counting System

#### 1.1 Denomination Interface
**Components**:
- Sales drawer counting (mandatory daily)
- Petty cash counting (mandatory daily)
- Standard Indian denominations:
  - ₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10, ₹5, ₹2, ₹1

**Features**:
- Auto-calculation of total amount
- Expected vs Actual variance display
- Historical counting records
- Denomination validation

#### 1.2 Cash Count UI/UX
```jsx
// Sales Drawer Count
₹2000 x [__] = ₹____
₹500  x [__] = ₹____
// ... other denominations
Total Counted: ₹____
Expected: ₹____
Variance: ₹____ (±)
```

### Phase 2: Cash Transfer System

#### 2.1 Transfer Request Flow
**Manager Request**:
- Amount field (editable)
- Optional reason/justification
- Display current balances:
  - Sales cash available
  - Current petty cash balance
- Submit for approval

#### 2.2 Superuser Approval Flow
**AIC/Superuser Interface**:
- View pending transfer requests
- Modify requested amount (₹5000 → ₹3000 or ₹7000)
- Add approval reason (especially when modifying)
- Approve/Reject with comments
- Auto-update both cash balances upon approval

#### 2.3 Transfer Transaction Log
- Original request amount vs approved amount
- Approval timestamp and approver
- Reason for modification (if any)
- Audit trail for compliance

### Phase 3: Universal Approvals Module

#### 3.1 Centralized Approvals Hub (`/approvals`)
```
/approvals
├── /transfers     # Cash transfer requests
├── /expenses      # Expense approvals
├── /sales         # Sales confirmations
└── /adjustments   # Inventory/cash adjustments
```

#### 3.2 Approval Pattern
**Generic Approval Component**:
- Type-specific approval cards
- Bulk approve functionality
- Role-based permissions
- Approval history tracking
- In-app notifications

### Phase 4: Dashboard Integration

#### 4.1 Updated KPIs (Top Row)
1. **Sales Cash Variance**: Expected vs Actual count
2. **Petty Cash Balance**: Current available amount
3. **Total Sales**: Existing metric
4. **Total Expenses**: Existing metric

#### 4.2 Dashboard Widgets (Below KPIs)
- **Pending Transfers**: Count and total amount awaiting approval
- **Low Cash Alerts**: 
  - Petty cash < ₹2000 warning
  - Small denominations < ₹200 alert
- **Recent Cash Activity**: Latest transfers and counts

### Phase 5: Smart Optimizations

#### 5.1 Automated Suggestions
- **Transfer Recommendations**: When petty cash < ₹2000
- **Change Fund Alerts**: When ₹50 and below denominations < ₹200
- **Denomination Optimization**: Suggest optimal denomination requests

#### 5.2 Variance Monitoring
- Track patterns in cash variances
- Alert on significant discrepancies
- Historical variance trends

## Database Schema Requirements

### New Tables

#### `cash_counts`
```sql
- id (uuid, primary key)
- date (date)
- type (enum: 'sales_drawer', 'petty_cash')
- denominations (jsonb) -- {2000: 5, 500: 10, ...}
- total_amount (decimal)
- expected_amount (decimal)
- variance (decimal)
- counted_by (uuid, references users)
- created_at (timestamp)
```

#### `cash_transfers`
```sql
- id (uuid, primary key)
- requested_amount (decimal)
- approved_amount (decimal)
- reason (text)
- status (enum: 'pending', 'approved', 'rejected')
- requested_by (uuid, references users)
- approved_by (uuid, references users)
- request_date (timestamp)
- approval_date (timestamp)
- notes (text)
```

#### `cash_balances`
```sql
- id (uuid, primary key)
- date (date)
- sales_cash_opening (decimal)
- sales_cash_closing (decimal)
- petty_cash_opening (decimal)
- petty_cash_closing (decimal)
- total_deposits (decimal)
- total_transfers (decimal)
```

## Technical Implementation

### 1. Components Architecture
```
/components/cash-management/
├── DenominationCounter.tsx    # Denomination input interface
├── CashTransferRequest.tsx    # Transfer request form
├── TransferApproval.tsx       # Approval interface
├── CashVarianceCard.tsx       # Variance display
└── CashBalanceWidget.tsx      # Balance summary
```

### 2. API Endpoints
```
POST /api/cash/count           # Submit daily cash count
GET  /api/cash/balance         # Get current balances
POST /api/cash/transfer        # Request transfer
PATCH /api/cash/transfer/:id   # Approve/modify transfer
GET  /api/cash/history         # Get transaction history
```

### 3. State Management
- Use Zustand for cash state management
- Real-time balance updates
- Optimistic UI updates for transfers

## Security & Compliance

### Access Controls
- **Manager**: Can count cash, request transfers
- **AIC/Superuser**: Can approve/modify transfers
- **Admin**: Full access to all cash operations

### Audit Requirements
- Complete audit trail for all cash movements
- Immutable transaction records
- User attribution for all actions
- Timestamp tracking

## Success Metrics

### Operational Efficiency
- Reduce cash counting time by 50%
- Minimize cash variances to < ₹50 daily
- Automate 80% of routine cash operations

### Compliance & Control
- 100% audit trail coverage
- Zero unauthorized transfers
- Daily cash reconciliation completion rate > 95%

## Future Enhancements

### Phase 6: Advanced Features
- **Predictive Analytics**: Forecast petty cash needs
- **Mobile Cash Counting**: Smartphone app for counting
- **Bank Integration**: Automated deposit recording
- **Multi-Store Consolidation**: Central cash management

### Phase 7: Notifications Infrastructure
- Email/SMS alerts for variances
- Real-time approval notifications
- Automated compliance reporting

---

## Implementation Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | 1 week | Denomination counting interface |
| Phase 2 | 1 week | Transfer request/approval system |
| Phase 3 | 1 week | Universal approvals module |
| Phase 4 | 3 days | Dashboard KPI integration |
| Phase 5 | 3 days | Smart optimizations |

**Total Estimated Duration**: 4-5 weeks

---

*This document will be updated as implementation progresses and requirements evolve.*