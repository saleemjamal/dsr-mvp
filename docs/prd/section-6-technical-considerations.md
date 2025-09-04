# Section 6: Technical Considerations

### Architecture Overview

**Strategic Approach: Surgical Enhancement**
Rather than replacing the existing DSR-MVP, we implement a parallel API layer that enhances current functionality while preserving all existing features. This minimizes risk and accelerates time-to-value.

```
┌─────────────────────────────────────────────────────────┐
│                   User Interface Layer                   │
│         (Next.js 15, TypeScript, Tailwind CSS)          │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────┐
│              Validation & Logic Layer                    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   DSR Core   │  │  Validation  │  │Reconciliation│ │
│  │   (Existing) │←→│    Engine    │←→│    Engine    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────────────┬───────────┬────────────────────────────┘
                 │           │
┌────────────────┴───────────┴────────────────────────────┐
│                    Data Layer                            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │DSR Tables    │  │API Tables    │  │Reconciliation│ │
│  │(Existing)    │  │(New)         │  │Tables (New)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                    Supabase (PostgreSQL)                 │
└──────────────────────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────┐
│               External Integrations                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │GoFrugal API  │  │Vercel Cron   │  │Bank Import   │ │
│  │              │  │(Hourly Sync) │  │(Manual CSV)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend (Existing):**
- Next.js 15.0.3 with App Router
- TypeScript 5.x with strict mode
- Tailwind CSS 3.4 for styling
- Radix UI primitives for components
- TanStack Query for data fetching
- Zustand for state management

**Backend (Existing + New):**
- Supabase (PostgreSQL) for database
- Supabase Edge Functions for API sync
- Supabase Realtime for live updates
- Row Level Security (RLS) for access control

**Integration Layer (New):**
- Node.js service for GoFrugal API integration
- Vercel Cron for scheduled syncs (free tier)
- Queue system for failed sync retry
- Webhook handlers for real-time events

### Database Design

**Parallel Table Strategy:**
```sql
-- Existing DSR tables remain unchanged
public.sales (existing manual entries)
public.cash_movements (existing cash tracking)
public.expenses (existing)
public.stores (existing)
public.user_profiles (existing)

-- New API data tables
public.gofrugal_sales (
  id uuid PRIMARY KEY,
  store_id uuid REFERENCES stores(id),
  sale_date date NOT NULL,
  total_amount decimal(10,2),
  transaction_count integer,
  sync_timestamp timestamp,
  raw_data jsonb,
  INDEX idx_store_date (store_id, sale_date)
)

-- New reconciliation tables
public.reconciliation_log (
  id uuid PRIMARY KEY,
  store_id uuid REFERENCES stores(id),
  reconciliation_date date,
  manual_total decimal(10,2),
  api_total decimal(10,2),
  variance decimal(10,2),
  status varchar(20), -- 'matched', 'variance', 'resolved'
  resolution_notes text,
  created_at timestamp,
  resolved_by uuid REFERENCES user_profiles(id),
  INDEX idx_status_date (status, reconciliation_date)
)

-- New variance tracking
public.variance_alerts (
  id uuid PRIMARY KEY,
  store_id uuid,
  alert_type varchar(50),
  variance_amount decimal(10,2),
  threshold_amount decimal(10,2),
  auto_resolved boolean DEFAULT false,
  created_at timestamp
)
```

### API Integration Strategy

**GoFrugal API Implementation:**
```typescript
// API sync service structure
interface SyncService {
  // Hourly automated sync via Vercel Cron
  async scheduledSync(): Promise<SyncResult>
  
  // Manual force sync from UI
  async manualSync(storeId: string): Promise<SyncResult>
  
  // Retry failed syncs with exponential backoff
  async retryFailedSyncs(): Promise<void>
  
  // Validate API data against expected format
  validateApiResponse(data: any): ValidationResult
}

// Sync configuration
const SYNC_CONFIG = {
  CRON_SCHEDULE: '0 * * * *', // Every hour
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: [5, 15, 60], // Minutes
  BATCH_SIZE: 100, // Transactions per request
  RATE_LIMIT: 10, // Requests per second
  TIMEOUT: 30000, // 30 seconds
}
```

**Data Synchronization Flow:**
1. **Scheduled Sync (Hourly):**
   - Vercel Cron triggers Edge Function
   - Fetch data from GoFrugal API for all stores
   - Validate and transform data
   - Upsert into gofrugal_sales table
   - Trigger validation against manual entries
   - Create variance alerts if needed

2. **Manual Force Sync:**
   - User clicks sync button
   - Immediate API call for specific store
   - Real-time UI update via Supabase Realtime
   - Show sync progress and results

3. **Failure Handling:**
   - Queue failed syncs in database
   - Exponential backoff retry strategy
   - Alert AIC after 3 failed attempts
   - Fallback to last known good data

### Validation Engine

**Three-Way Reconciliation Logic:**
```typescript
interface ValidationEngine {
  // Compare manual entry with API total
  validateManualVsApi(
    manualTotal: number,
    apiTotal: number
  ): ValidationResult {
    const variance = Math.abs(manualTotal - apiTotal)
    const threshold = 100 // ₹100 base threshold
    
    return {
      matched: variance <= threshold,
      variance,
      percentageVar: (variance / apiTotal) * 100,
      requiresReview: variance > threshold
    }
  }
  
  // Predict bank deposit based on cash movements
  predictBankDeposit(
    cashMovements: CashMovement[]
  ): PredictedDeposit {
    const cashOnly = movements.filter(m => m.tender === 'cash')
    const totalCash = cashOnly.reduce((sum, m) => sum + m.amount, 0)
    
    return {
      expectedAmount: totalCash,
      expectedDate: getNextBankingDay(),
      confidence: calculateConfidence(historicalAccuracy)
    }
  }
  
  // Match bank statement with predictions
  matchBankStatement(
    statement: BankTransaction[],
    predictions: PredictedDeposit[]
  ): MatchResult[]
}
```

### Performance Considerations

**Optimization Strategies:**
- Database indexes on frequently queried columns (store_id, date)
- Pagination for large data sets (100 records per page)
- Caching layer for dashboard metrics (5-minute TTL)
- Lazy loading for historical reports
- Progressive data loading for mobile devices

**Scalability Planning:**
- Horizontal scaling via Supabase connection pooling
- Archival strategy for data older than 2 years
- Read replicas for reporting workload
- CDN for static assets
- Queue system for background processing

### Security Requirements

**Data Protection:**
- All API keys stored in environment variables
- TLS encryption for all data in transit
- Row Level Security (RLS) for multi-tenant isolation
- Audit logging for all financial transactions
- PII data encryption at rest

**Access Control:**
- Role-based permissions (Store User, AIC, Super User)
- Store-level data isolation
- Session timeout after 30 minutes of inactivity
- Two-factor authentication for AIC/Admin roles (Phase 2)

### Integration Points

**External Systems:**
1. **GoFrugal API:**
   - Endpoint: https://api.gofrugal.com/v1/
   - Authentication: API key + secret
   - Rate limits: 1000 requests/hour
   - Data format: JSON

2. **Bank Import (Manual):**
   - Supported formats: CSV, Excel
   - Standard templates for major banks
   - Automated parsing and matching

3. **WhatsApp Alerts (Phase 2):**
   - Integration via WhatsApp Business API
   - Alert templates for variances
   - Daily summary messages

### Technical Constraints

**Platform Limitations:**
- Vercel free tier: 100GB bandwidth, cron jobs every hour minimum
- Supabase free tier: 500MB database, 2GB bandwidth
- API rate limits: Must batch requests efficiently
- Mobile devices: Optimize for 2GB RAM Android devices

**Browser Support:**
- Chrome 90+ (primary)
- Safari 14+ (iOS devices)
- Firefox 88+ (secondary)
- Edge 90+ (secondary)

### Migration Strategy

**Phased Data Migration:**
```sql
-- Phase 1: Historical data import
INSERT INTO gofrugal_sales 
SELECT FROM gofrugal_api_historical_endpoint
WHERE date >= '2024-01-01'

-- Phase 2: Link existing manual entries
UPDATE sales s
SET api_reference_id = g.id
FROM gofrugal_sales g
WHERE s.store_id = g.store_id 
  AND s.sale_date = g.sale_date

-- Phase 3: Enable validation rules
ALTER TABLE sales 
ADD CONSTRAINT check_variance 
CHECK (validate_variance_threshold(amount, api_amount))
```

### Development & Testing

**Environment Setup:**
- Development: Local Supabase instance
- Staging: Separate Supabase project
- Production: Production Supabase project
- API Testing: Mock GoFrugal endpoints

**Testing Strategy:**
- Unit tests for validation logic (Jest)
- Integration tests for API sync (Playwright)
- Load testing for 10,000+ transactions
- User acceptance testing with 2 pilot stores

---
