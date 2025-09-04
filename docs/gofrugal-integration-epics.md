# GoFrugal Integration - Epic and Story Definitions

## Project Overview
Integration of GoFrugal POS API with existing DSR-MVP system to create a dual-source validation layer for retail operations.

**Timeline:** 8 weeks (2 sprints per epic)
**Team Size:** 1-2 developers
**Risk Level:** Medium (brownfield enhancement)

---

## Epic 1: Foundation & Database Setup
**Goal:** Establish database schema and foundational services for GoFrugal integration
**Duration:** Week 1-2
**Dependencies:** None (can start immediately)

### Story 1.1: Database Migration for GoFrugal Tables
**Priority:** P0 - Critical
**Points:** 5
**Assigned:** Developer

**Description:**
As a developer, I need to create the database tables for storing GoFrugal API data and reconciliation logs so that we can persist and compare API data with manual entries.

**Acceptance Criteria:**
- [ ] Create migration file `20250203_add_gofrugal_tables.sql` in `/supabase/migrations/`
- [ ] Implement `gofrugal_sales` table with columns: id, store_id, sale_date, total_amount, transaction_count, raw_data, sync_timestamp, sync_status
- [ ] Implement `reconciliation_logs` table with variance calculations
- [ ] Implement `variance_alerts` table for threshold notifications
- [ ] Add appropriate indexes for store_id and date queries
- [ ] Test migration rollback script works correctly
- [ ] Verify tables created successfully in development environment

**Technical Notes:**
```sql
-- Rollback script to include:
DROP TABLE IF EXISTS variance_alerts CASCADE;
DROP TABLE IF EXISTS reconciliation_logs CASCADE;
DROP TABLE IF EXISTS gofrugal_sales CASCADE;
```

### Story 1.2: Create GoFrugal Service Layer
**Priority:** P0 - Critical
**Points:** 8
**Assigned:** Developer

**Description:**
As a developer, I need to create the GoFrugal service module that handles all API interactions and data transformations.

**Acceptance Criteria:**
- [ ] Create `/src/lib/gofrugal-service.ts` with TypeScript interfaces
- [ ] Implement `GoFrugalSale` interface matching database schema
- [ ] Implement `syncSales()` method with error handling
- [ ] Implement `validateAgainstAPI()` method for variance checking
- [ ] Add circuit breaker pattern for API failures
- [ ] Include comprehensive error logging
- [ ] Unit tests for service methods (minimum 80% coverage)

**Technical Implementation:**
```typescript
export interface GoFrugalService {
  syncSales(storeId: string, date?: Date): Promise<SyncResult>;
  validateAgainstAPI(manual: number, storeId: string, date: Date): Promise<ValidationResult>;
  handlePagination(endpoint: string, pageSize: number): AsyncGenerator<any>;
  transformApiData(rawData: any): GoFrugalSale;
}
```

### Story 1.3: Environment Configuration Setup
**Priority:** P0 - Critical
**Points:** 2
**Assigned:** Developer

**Description:**
As a developer, I need to configure environment variables and feature flags for GoFrugal integration.

**Acceptance Criteria:**
- [ ] Add GoFrugal environment variables to `.env.local.example`
- [ ] Document required environment variables in README
- [ ] Implement feature flag system in code
- [ ] Create `features.ts` config file
- [ ] Ensure API keys are never exposed client-side
- [ ] Add validation for required environment variables on startup

**Required Environment Variables:**
```
GOFRUGAL_API_KEY=xxx
GOFRUGAL_API_SECRET=xxx
GOFRUGAL_API_BASE_URL=https://api.gofrugal.com/v1
CRON_SECRET=xxx
NEXT_PUBLIC_ENABLE_GOFRUGAL=false
```

---

## Epic 2: GoFrugal API Integration
**Goal:** Implement core API sync functionality with GoFrugal POS system
**Duration:** Week 3-4
**Dependencies:** Epic 1 must be complete

### Story 2.1: Manual Sync Endpoint Implementation
**Priority:** P0 - Critical
**Points:** 5
**Assigned:** Developer

**Description:**
As a Store Manager, I need to manually trigger a sync with GoFrugal to immediately fetch latest sales data when needed.

**Acceptance Criteria:**
- [ ] Create `POST /api/sync/manual` endpoint
- [ ] Implement authentication check (user must have sync permission)
- [ ] Accept store_id and optional date_range parameters
- [ ] Call gofrugal-service.syncSales() method
- [ ] Store fetched data in gofrugal_sales table
- [ ] Return sync statistics (records created, time taken)
- [ ] Handle and log errors appropriately
- [ ] Add rate limiting (max 10 syncs per hour per store)

**API Contract:**
```typescript
POST /api/sync/manual
Body: {
  store_id: string,
  date_from?: string,
  date_to?: string
}
Response: {
  sync_id: string,
  status: 'success' | 'partial' | 'failed',
  records_created: number,
  duration_ms: number,
  errors?: string[]
}
```

### Story 2.2: Automated Hourly Sync Implementation
**Priority:** P0 - Critical
**Points:** 8
**Assigned:** Developer

**Description:**
As an AIC, I need the system to automatically sync with GoFrugal every hour so that data stays fresh without manual intervention.

**Acceptance Criteria:**
- [ ] Create `/api/cron/hourly-sync` endpoint
- [ ] Configure Vercel cron in `vercel.json` to run at :05 past each hour
- [ ] Implement CRON_SECRET authentication
- [ ] Sync all active stores incrementally (last sync timestamp)
- [ ] Handle pagination for large datasets (100 records per page)
- [ ] Implement retry logic for failed syncs
- [ ] Log sync results to monitoring system
- [ ] Send alerts if sync fails 3 times consecutively

**Vercel Cron Configuration:**
```json
{
  "crons": [{
    "path": "/api/cron/hourly-sync",
    "schedule": "5 * * * *"
  }]
}
```

### Story 2.3: GoFrugal API Error Handling
**Priority:** P1 - High
**Points:** 5
**Assigned:** Developer

**Description:**
As a developer, I need robust error handling for GoFrugal API interactions to ensure system stability.

**Acceptance Criteria:**
- [ ] Implement exponential backoff for rate limit errors (429)
- [ ] Handle authentication failures (401) with alert to admin
- [ ] Gracefully handle timeout errors (30 second timeout)
- [ ] Store failed sync attempts in database for retry
- [ ] Create error recovery mechanism
- [ ] Log all errors with context for debugging
- [ ] Implement circuit breaker (disable after 5 consecutive failures)
- [ ] Create admin notification for critical failures

### Story 2.4: API Data Transformation Pipeline
**Priority:** P1 - High
**Points:** 5
**Assigned:** Developer

**Description:**
As a system, I need to transform GoFrugal's API response format into our database schema correctly.

**Acceptance Criteria:**
- [ ] Map GoFrugal fields to our schema
- [ ] Handle missing or null fields gracefully
- [ ] Validate data types and ranges
- [ ] Convert currency values correctly (handle decimal places)
- [ ] Store original raw data in JSONB column
- [ ] Handle timezone conversions for dates
- [ ] Create data quality checks (negative amounts, future dates)
- [ ] Log transformation errors without failing entire sync

---

## Epic 3: Validation & Reconciliation Engine
**Goal:** Build intelligent variance detection and reconciliation system
**Duration:** Week 5-6
**Dependencies:** Epic 2 must be complete

### Story 3.1: Real-time Validation Service
**Priority:** P0 - Critical
**Points:** 8
**Assigned:** Developer

**Description:**
As a Store Manager, I need immediate validation when entering manual sales data to catch discrepancies right away.

**Acceptance Criteria:**
- [ ] Create `POST /api/validate` endpoint
- [ ] Compare manual entry against GoFrugal data for same date/store
- [ ] Calculate variance amount and percentage
- [ ] Return validation result with suggested actions
- [ ] Apply ₹100 threshold for variance alerts
- [ ] Store validation results in reconciliation_logs
- [ ] Trigger variance alert if threshold exceeded
- [ ] Response time must be < 2 seconds

**Validation Logic:**
```typescript
interface ValidationResult {
  matched: boolean;
  manual_total: number;
  api_total: number;
  variance_amount: number;
  variance_percentage: number;
  requires_explanation: boolean;
  suggested_action: 'accept' | 'review' | 'investigate';
}
```

### Story 3.2: Variance Alert System
**Priority:** P1 - High
**Points:** 5
**Assigned:** Developer

**Description:**
As an AIC, I need to be alerted when variances exceed thresholds so I can investigate immediately.

**Acceptance Criteria:**
- [ ] Create variance detection algorithm with configurable thresholds
- [ ] Generate alerts for variances > ₹100
- [ ] Store alerts in variance_alerts table
- [ ] Implement alert acknowledgment mechanism
- [ ] Create alert dashboard view
- [ ] Send email notifications for critical variances (> ₹500)
- [ ] Track alert resolution status
- [ ] Generate daily variance summary report

### Story 3.3: Reconciliation Workflow UI
**Priority:** P1 - High
**Points:** 8
**Assigned:** Developer

**Description:**
As an AIC, I need a dedicated reconciliation interface to review and resolve variances efficiently.

**Acceptance Criteria:**
- [ ] Create `/reconciliation/variances` page
- [ ] Display variance list with filters (date, store, status)
- [ ] Show side-by-side comparison of manual vs API data
- [ ] Implement variance resolution form with reason codes
- [ ] Allow bulk resolution of similar variances
- [ ] Track resolution history with audit trail
- [ ] Export variance report to Excel
- [ ] Mobile responsive design

### Story 3.4: Three-way Reconciliation Logic
**Priority:** P2 - Medium
**Points:** 8
**Assigned:** Developer

**Description:**
As an AIC, I need the system to reconcile POS, manual, and bank data automatically when bank statements are available.

**Acceptance Criteria:**
- [ ] Create reconciliation algorithm for 3 data sources
- [ ] Handle partial matches (2 out of 3 sources agree)
- [ ] Implement intelligent matching rules
- [ ] Generate reconciliation confidence scores
- [ ] Create exception reports for investigation
- [ ] Store reconciliation results with full audit trail
- [ ] Provide reconciliation timeline view
- [ ] Calculate and track reconciliation KPIs

---

## Epic 4: UI/UX Enhancements
**Goal:** Enhance user interface with validation indicators and sync status
**Duration:** Week 5-6 (parallel with Epic 3)
**Dependencies:** Epic 2 must be complete

### Story 4.1: Variance Badge Component
**Priority:** P1 - High
**Points:** 3
**Assigned:** Developer

**Description:**
As a Store Manager, I need visual indicators showing validation status on sales entries.

**Acceptance Criteria:**
- [ ] Create `VarianceBadge` component in `/components/ui/`
- [ ] Show green badge for matched entries (variance < ₹100)
- [ ] Show yellow badge for minor variances (₹100-500)
- [ ] Show red badge for major variances (> ₹500)
- [ ] Include variance amount in badge tooltip
- [ ] Animate badge on status change
- [ ] Ensure accessibility (ARIA labels)
- [ ] Add to sales list and detail views

**Component Design:**
```typescript
<VarianceBadge 
  variance={150} 
  threshold={100}
  status="warning"
  tooltip="Manual: ₹5,150 | API: ₹5,000"
/>
```

### Story 4.2: Sync Status Dashboard
**Priority:** P1 - High
**Points:** 5
**Assigned:** Developer

**Description:**
As an AIC, I need to monitor sync status across all stores to ensure data freshness.

**Acceptance Criteria:**
- [ ] Create `/sync/status` page
- [ ] Display last sync time for each store
- [ ] Show sync success rate (last 24 hours)
- [ ] Display pending sync queue
- [ ] Add manual sync button per store
- [ ] Show sync history with logs
- [ ] Implement real-time updates using WebSocket
- [ ] Add sync health indicators

### Story 4.3: Enhanced Sales Entry with Validation
**Priority:** P2 - Medium
**Points:** 5
**Assigned:** Developer

**Description:**
As a Store Manager, I need the sales entry form to show API comparison during data entry.

**Acceptance Criteria:**
- [ ] Add API data panel to sales entry form
- [ ] Show real-time comparison as amounts are entered
- [ ] Highlight fields with variances
- [ ] Require explanation for variances > threshold
- [ ] Show historical variance patterns
- [ ] Add "Accept API Value" quick action
- [ ] Preserve manual entry capability
- [ ] Improve form validation messages

### Story 4.4: Mobile Sync Management
**Priority:** P2 - Medium
**Points:** 3
**Assigned:** Developer

**Description:**
As a Business Owner, I need to trigger syncs and view status from my mobile device.

**Acceptance Criteria:**
- [ ] Ensure sync status page is mobile responsive
- [ ] Add sync button to mobile navigation
- [ ] Optimize sync status cards for mobile
- [ ] Implement pull-to-refresh for status updates
- [ ] Show condensed sync metrics on mobile
- [ ] Add mobile-friendly sync notifications
- [ ] Test on iOS and Android browsers

---

## Epic 5: Deployment & Monitoring
**Goal:** Setup production deployment with monitoring and rollback capabilities
**Duration:** Week 7-8
**Dependencies:** Epics 3 & 4 must be complete

### Story 5.1: Feature Flag Implementation
**Priority:** P0 - Critical
**Points:** 3
**Assigned:** Developer

**Description:**
As a DevOps engineer, I need feature flags to safely roll out GoFrugal integration.

**Acceptance Criteria:**
- [ ] Implement feature flag service
- [ ] Create flags for: sync, validation, UI components
- [ ] Add flag management interface
- [ ] Enable per-store feature control
- [ ] Create flag override for testing
- [ ] Document flag usage
- [ ] Add flag status to monitoring
- [ ] Implement gradual rollout capability

### Story 5.2: Rollback Procedures Documentation
**Priority:** P0 - Critical
**Points:** 5
**Assigned:** Developer

**Description:**
As a DevOps engineer, I need documented rollback procedures for safe deployment recovery.

**Acceptance Criteria:**
- [ ] Create rollback runbook document
- [ ] Write database migration rollback scripts
- [ ] Test rollback procedures in staging
- [ ] Document feature flag disable process
- [ ] Create API endpoint disable mechanism
- [ ] Document cache clearing procedures
- [ ] Define rollback decision criteria
- [ ] Train support team on procedures

**Rollback Checklist:**
```markdown
1. Disable feature flags immediately
2. Run database rollback script if needed
3. Clear CDN cache
4. Notify users of temporary disruption
5. Investigate root cause
6. Fix issues before re-deployment
```

### Story 5.3: Production Monitoring Setup
**Priority:** P1 - High
**Points:** 5
**Assigned:** Developer

**Description:**
As an SRE, I need comprehensive monitoring for the GoFrugal integration.

**Acceptance Criteria:**
- [ ] Setup Vercel Analytics tracking
- [ ] Create custom metrics for sync performance
- [ ] Implement error rate monitoring
- [ ] Setup alerts for sync failures
- [ ] Monitor API response times
- [ ] Track variance patterns
- [ ] Create operational dashboard
- [ ] Setup log aggregation for debugging

### Story 5.4: User Training & Documentation
**Priority:** P1 - High
**Points:** 3
**Assigned:** Developer/PM

**Description:**
As a Store Manager, I need training materials to understand the new validation features.

**Acceptance Criteria:**
- [ ] Create user guide for sync features
- [ ] Document variance resolution process
- [ ] Create troubleshooting guide
- [ ] Record training video (10 minutes)
- [ ] Prepare FAQ document
- [ ] Create quick reference cards
- [ ] Setup user support channel
- [ ] Schedule training sessions

### Story 5.5: Performance Testing & Optimization
**Priority:** P2 - Medium
**Points:** 5
**Assigned:** Developer

**Description:**
As a developer, I need to ensure the system performs well under load.

**Acceptance Criteria:**
- [ ] Load test sync endpoints (100 stores)
- [ ] Optimize database queries (< 100ms)
- [ ] Implement caching strategy
- [ ] Test with 1 year of historical data
- [ ] Optimize API pagination
- [ ] Profile and fix memory leaks
- [ ] Ensure mobile performance
- [ ] Document performance benchmarks

### Story 5.6: Production Deployment
**Priority:** P0 - Critical
**Points:** 3
**Assigned:** DevOps

**Description:**
As a team, we need to deploy GoFrugal integration to production safely.

**Acceptance Criteria:**
- [ ] Deploy with feature flags OFF
- [ ] Verify deployment health checks
- [ ] Enable for TEST001 store first
- [ ] Monitor for 24 hours
- [ ] Enable for one production store
- [ ] Monitor for 48 hours
- [ ] Gradual rollout to all stores
- [ ] Document deployment issues

---

## Risk Mitigation Strategies

### Technical Risks
1. **API Rate Limiting**
   - Mitigation: Implement caching and request batching
   - Fallback: Queue requests for later processing

2. **Data Loss During Sync**
   - Mitigation: Always preserve manual entries
   - Fallback: Restore from backup

3. **Performance Degradation**
   - Mitigation: Implement caching and optimization
   - Fallback: Disable sync temporarily

### Business Risks
1. **User Resistance**
   - Mitigation: Extensive training and support
   - Fallback: Allow opt-out initially

2. **Incorrect Variance Alerts**
   - Mitigation: Configurable thresholds
   - Fallback: Manual override capability

---

## Definition of Done

For each story to be considered complete:
- [ ] Code reviewed and approved
- [ ] Unit tests written (80% coverage)
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] QA tested and approved
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] Rollback procedure tested

---

## Sprint Plan

### Sprint 1 (Week 1-2): Foundation
- Epic 1: All stories (1.1, 1.2, 1.3)
- Total Points: 15

### Sprint 2 (Week 3-4): API Integration
- Epic 2: All stories (2.1, 2.2, 2.3, 2.4)
- Total Points: 23

### Sprint 3 (Week 5-6): Validation & UI
- Epic 3: Stories 3.1, 3.2, 3.3
- Epic 4: Stories 4.1, 4.2
- Total Points: 29

### Sprint 4 (Week 7-8): Deployment & Polish
- Epic 3: Story 3.4
- Epic 4: Stories 4.3, 4.4
- Epic 5: All stories
- Total Points: 34

---

## Success Metrics

### Technical Metrics
- Sync success rate > 95%
- API response time < 2 seconds
- Variance detection accuracy > 99%
- System uptime > 99.9%

### Business Metrics
- Reconciliation time reduced by 75%
- Manual entry time unchanged
- Variance resolution within 24 hours
- User adoption > 90% in 2 weeks

---

## Notes

1. All stories include rollback capability as part of acceptance criteria
2. Each epic has clear dependencies to prevent blocking
3. Feature flags enable safe incremental rollout
4. Manual entry system remains unchanged (risk mitigation)
5. All API interactions are server-side only (security)