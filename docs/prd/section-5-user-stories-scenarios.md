# Section 5: User Stories & Scenarios

### Epic: Automated Sales Data Integration

**User Story 1: Real-time Sales Visibility**
*As a* Store Manager  
*I want to* see real-time sales data automatically pulled from GoFrugal  
*So that* I can make immediate decisions without manual data entry  

**Acceptance Criteria:**
- Sales data syncs automatically every hour
- Manual force-sync button available for immediate updates
- Dashboard shows last sync time and status
- Historical data comparison available
- Works offline with cached data

**User Story 2: Manual Tender-Type Entry with Validation**
*As a* Store Manager  
*I want to* enter tender-type splits with automatic validation against POS totals  
*So that* errors are caught immediately instead of during month-end  

**Acceptance Criteria:**
- Entry form shows POS total for reference
- System validates sum of tender types equals POS total
- Variance over ₹100 triggers immediate alert
- Reason required for accepting variance
- Auto-save prevents data loss

### Epic: Intelligent Cash Management

**User Story 3: Dual-Account Cash Tracking**
*As an* AIC  
*I want to* track Sales Cash and Petty Cash separately  
*So that* I can manage different cash flows appropriately  

**Acceptance Criteria:**
- Two distinct cash accounts visible
- Automatic movement tracking for each account
- Transfer between accounts with approval workflow
- Daily position tracking for both accounts
- Low balance alerts for Petty Cash (<₹2000)

**User Story 4: Multi-Day Deposit Management**
*As a* Store Manager  
*I want to* accumulate cash over multiple days before depositing  
*So that* I can manage banking efficiently for different store locations  

**Acceptance Criteria:**
- Support accumulation up to 7 days
- Running total shows pending deposit amount
- Variance tolerance adjusts by √(days) × ₹100
- Clear indication of days since last deposit
- Deposit slip number tracking

### Epic: Exception-Based Reconciliation

**User Story 5: Three-Way Automatic Matching**
*As an* AIC  
*I want* the system to automatically match POS, manual, and bank data  
*So that* I only focus on exceptions requiring attention  

**Acceptance Criteria:**
- Automatic matching runs on data availability
- Only exceptions appear in my workflow
- One-click approval for matched items
- Bulk actions for multiple items
- Exception reasons clearly displayed

**User Story 6: Predictive Bank Reconciliation**
*As an* AIC  
*I want* the system to predict expected bank deposits  
*So that* I can proactively identify issues before they compound  

**Acceptance Criteria:**
- Prediction based on cash counts and tender types
- Expected vs actual deposit comparison
- Early warning for missing deposits
- Historical accuracy tracking
- Pattern learning for common variances

### Detailed Scenario Walkthroughs

**Scenario 1: Morning Store Opening**

*Current State (2+ hours):*
1. Manager counts cash from multiple registers (30 min)
2. Opens GoFrugal POS, prints yesterday's report (10 min)
3. Manually calculates tender splits in Excel (45 min)
4. Sends WhatsApp photo to owner and AIC (5 min)
5. Discovers ₹500 variance, spends 30 min investigating
6. Prepares bank deposit without knowing if amount is correct

*Future State (30 minutes):*
1. Manager counts cash (15 min)
2. Opens dashboard - sees API already synced overnight
3. Enters tender counts - system auto-validates (5 min)
4. ₹500 variance detected immediately with likely cause shown
5. Accepts variance with reason or investigates (5 min)
6. System predicts deposit amount, generates slip (5 min)
7. Owner and AIC see updates in real-time dashboard

**Scenario 2: AIC Daily Reconciliation**

*Current State (3-4 hours):*
1. Collect reports via WhatsApp from 5 stores (45 min)
2. Enter data into master Excel sheet (30 min)
3. Download bank statement, match deposits manually (1 hour)
4. Call 2 stores about mismatches (30 min)
5. Update Excel with explanations (15 min)
6. Send consolidated report to owner (15 min)
7. Still unsure if all variances are identified

*Future State (45 minutes):*
1. Open reconciliation dashboard - all data pre-loaded
2. System shows 3 exceptions out of 50 transactions (5 min)
3. Reviews exception details with full context (10 min)
4. Approves/investigates exceptions (20 min)
5. Bulk approves matched items (5 min)
6. Automated report sent to owner (5 min)
7. Complete confidence in reconciliation status

**Scenario 3: Business Owner Decision Making**

*Current State (Multi-day lag):*
1. Receives monthly P&L from CA on 15th of next month
2. Gets daily WhatsApp updates (often incomplete)
3. Visits store to spot-check concerns
4. Makes expansion decision based on 45-day old data
5. Discovers cash shortage 2 months after it started

*Future State (Real-time):*
1. Opens mobile dashboard during morning coffee
2. Sees yesterday's performance across all stores
3. Notices Store #3 trending down, investigates immediately
4. Adjusts inventory based on real-time velocity data
5. Approves expansion with confidence in numbers
6. Receives alert for unusual variance within hours

### User Journey Maps

**Store Manager Journey:**
```
Opening → Count Cash → ✓ Auto-Validation → Handle Exceptions → Deposit → Done (30 min)
         ↓                    ↓                    ↓
    [Pain: Manual]    [Delight: Instant]   [Relief: Guided]
```

**AIC Journey:**
```
Dashboard → Review Exceptions → Investigate → Approve → Report
    ↓              ↓                ↓           ↓         ↓
[Relief]      [Focused]        [Context]   [Efficient] [Automated]
```

**Owner Journey:**
```
Mobile Alert → Dashboard View → Drill Down → Make Decision
      ↓              ↓              ↓            ↓
  [Proactive]    [Real-time]   [Detailed]   [Confident]
```

---
