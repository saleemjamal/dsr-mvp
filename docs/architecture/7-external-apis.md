# 7. External APIs

## GoFrugal API Integration

### Overview
GoFrugal HQ APIs provide comprehensive access to POS data including sales transactions, inventory, customer information, and loyalty programs. The integration enables real-time data synchronization and three-way reconciliation between POS systems, manual entries, and bank records.

### Authentication
- **Method**: License Key Authentication via `X-Auth-Token` header
- **Security**: 
  - Server-side only implementation
  - Rotate keys periodically
  - HTTPS recommended for production
  - Never expose keys in client-side code

### Base Configuration
```typescript
interface GoFrugalConfig {
  licenseKey: string;          // X-Auth-Token value
  baseUrl: string;             // e.g., http://hq.example.com
  hqPath: string;              // /RayMedi_HQ or /WebReporter
  rateLimit: {
    requestsPerHour: 1000,    // Default limit
    requestsPerMinute: 50      // Burst limit
  };
}
```

### API Endpoints

#### 1. Sales Header API
- **Endpoint**: `/api/v1/salesHeader`
- **Method**: GET
- **Purpose**: Retrieve comprehensive sales transaction data
- **Data Volume**: 479,128+ records available
- **Key Features**:
  - Bill-level transaction details
  - Payment mode breakdowns (CASH, CARD, UPI, MIXED)
  - Customer information linking
  - Return transaction tracking
  - Incremental sync via `lastSyncTimestamp`

#### 2. Items API
- **Endpoint**: `/api/v1/items`
- **Method**: GET
- **Purpose**: Product catalog and inventory management
- **Data Volume**: 237,898+ items
- **Key Features**:
  - Real-time stock levels per store
  - Pricing tiers (MRP, sale price, purchase price)
  - Category and brand classifications
  - Tax configurations
  - Incremental sync via `itemTimeStamp`

#### 3. Customers API
- **Endpoint**: `/api/v1/eCustomers`
- **Method**: GET
- **Purpose**: Customer master data and credit management
- **Data Volume**: 28,713+ customers
- **Key Features**:
  - Credit limits and outstanding tracking
  - Loyalty points balance
  - Purchase history analytics
  - Customer segmentation
  - Blacklist management

#### 4. Loyalty Info API
- **Endpoint**: `/api/v1/loyaltyInfo`
- **Method**: GET
- **Purpose**: Detailed loyalty program transactions
- **Prerequisites**: HQ with RPOS6, Loyalty module enabled
- **Key Features**:
  - Points earning/redemption history
  - Tier management
  - Special offers tracking
  - Points expiry management

### Rate Limiting Strategy

#### Limits
- **Hourly Limit**: 1000 requests per API key (GoFrugal side)
- **Application Limit**: 10 manual syncs per hour per store
- **Burst Limit**: 50 requests per minute (GoFrugal side)

#### Simplified In-Memory Implementation
Perfect for hourly sync patterns - no Redis needed:

```typescript
// Simple in-memory rate limiter for hourly syncs
const syncHistory = new Map<string, Date[]>();

function checkRateLimit(storeId: string): boolean {
  const now = new Date();
  const history = syncHistory.get(storeId) || [];
  
  // Keep only syncs from last hour
  const recentSyncs = history.filter(
    time => now.getTime() - time.getTime() < 3600000
  );
  
  if (recentSyncs.length >= 10) {
    return false; // Rate limit exceeded
  }
  
  recentSyncs.push(now);
  syncHistory.set(storeId, recentSyncs);
  return true;
}

// Periodic cleanup (optional)
setInterval(() => {
  const now = new Date();
  syncHistory.forEach((history, storeId) => {
    const recent = history.filter(
      time => now.getTime() - time.getTime() < 3600000
    );
    if (recent.length === 0) {
      syncHistory.delete(storeId);
    }
  });
}, 3600000); // Every hour
```

**Why this works for your use case**:
- Hourly syncs = very low request volume
- Memory footprint negligible (100 stores = ~10KB)
- No external dependencies
- Resets naturally on server restart
- Perfect for Vercel serverless
```

### Pagination Strategy

All endpoints support pagination to handle large datasets efficiently:

```typescript
interface PaginationParams {
  page: number;      // Current page (default: 1)
  limit: number;     // Records per page (max varies by endpoint)
}

interface PaginationResponse {
  total_records: number;
  current_page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}
```

**Recommended Limits**:
- Sales: 100 records/page (max: 1000)
- Items: 100 records/page (max: 500)
- Customers: 50 records/page (max: 100)

### Incremental Sync Architecture

```typescript
class IncrementalSyncManager {
  // Sales sync using lastSyncTimestamp
  async syncSales(storeId: string) {
    const lastSync = await getLastSyncTimestamp(storeId);
    const params = {
      storeId,
      lastSyncTimestamp: lastSync || '2025-01-01T00:00:00Z',
      limit: 100
    };
    
    const response = await fetchSalesData(params);
    await processNewRecords(response.salesHeaders);
    await updateSyncTimestamp(storeId, new Date().toISOString());
  }
  
  // Items sync using itemTimeStamp
  async syncItems() {
    const lastItemSync = await getLastItemTimestamp();
    const params = {
      itemTimeStamp: lastItemSync,
      selectAll: true,
      limit: 100
    };
    
    const response = await fetchItemsData(params);
    await processChangedItems(response.items);
  }
}
```

### Error Handling

#### Error Codes
| Code | Description | Retry Strategy |
|------|-------------|----------------|
| 429 | Rate Limited | Exponential backoff with jitter |
| 500-503 | Server Error | Linear backoff (max 3 retries) |
| 400-404 | Client Error | No retry, log and alert |

#### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: Date | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime!.getTime() > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure() {
    this.failures++;
    this.lastFailureTime = new Date();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

### Data Volume Considerations

#### Storage Requirements
- **Sales Data**: ~479K records × 2KB/record ≈ 1GB
- **Items Data**: ~238K records × 1KB/record ≈ 250MB
- **Customer Data**: ~29K records × 2KB/record ≈ 60MB
- **Total Initial Sync**: ~1.3GB

#### Performance Optimization
1. **Batch Processing**: Process 100-1000 records at a time
2. **Background Jobs**: Use queue system for large syncs
3. **Caching**: Implement 5-minute cache for frequently accessed data
4. **Database Indexing**: Create indexes on sync timestamps and foreign keys

### Security Considerations

1. **API Key Management**:
   - Store in environment variables only
   - Never commit to version control
   - Implement key rotation every 90 days

2. **Data Privacy**:
   - Encrypt customer PII at rest
   - Implement field-level access control
   - Audit log all API access

3. **Request Validation**:
   - Validate all input parameters
   - Implement request signing for critical operations
   - Use HTTPS in production

### Monitoring & Alerting

#### Key Metrics
- API response time (target: <500ms p95)
- Sync success rate (target: >99.5%)
- Rate limit utilization (alert at 80%)
- Circuit breaker state changes
- Data freshness (max lag: 1 hour)

#### Alert Conditions
- Rate limit exceeded (>950 requests/hour)
- Circuit breaker opened
- Sync failures (>3 consecutive)
- High variance detected (>₹1000)
- API response time degradation (>2s)

### Future Integrations (Phase 2)

#### Slack API
- **Purpose**: Real-time alerts and daily summaries
- **Implementation**: Webhook-based notifications
- **Channels**: 
  - `#dsr-variances`: Variance alerts >₹500
  - `#dsr-daily-summary`: EOD reconciliation reports
  - `#dsr-sync-status`: Critical sync failures

#### WhatsApp Business API
- **Purpose**: Mobile alerts for store managers
- **Features**:
  - Daily closing reminders
  - Variance notifications
  - Approval requests

#### Bank APIs (Phase 3)
- **Purpose**: Automated bank reconciliation
- **Integration**: Via banking aggregators
- **Features**:
  - Transaction matching
  - Balance verification
  - Settlement tracking

### Best Practices

1. **Sync Scheduling**:
   - Items: Daily at 2 AM (low change frequency)
   - Customers: Every 6 hours
   - Sales: Hourly during business hours
   - Loyalty: Real-time for active customers

2. **Error Recovery**:
   - Implement dead letter queues
   - Maintain sync audit logs
   - Provide manual retry mechanisms

3. **Performance**:
   - Use database connection pooling
   - Implement request deduplication
   - Optimize batch sizes based on network conditions

4. **Testing**:
   - Maintain separate test environment
   - Use mock data for development
   - Implement integration test suite