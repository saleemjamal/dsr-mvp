# 5. API Specification

## Internal API Endpoints

### Synchronization APIs

#### Manual Sync Endpoint
Trigger manual synchronization for specific data types and stores.

```yaml
POST /api/sync/manual
  Description: Trigger manual sync for specific store and data type
  Authentication: Bearer token (user session)
  Permissions: sync.manual
  
  Request Body:
    {
      "store_id": "string",
      "sync_type": "sales | items | customers | loyalty | all",
      "date_from": "YYYY-MM-DD",  // Optional
      "date_to": "YYYY-MM-DD",    // Optional
      "force_full_sync": boolean   // Bypass incremental sync
    }
  
  Response (200):
    {
      "sync_id": "string",
      "sync_type": "string",
      "status": "success | partial | failed",
      "records_created": number,
      "records_updated": number,
      "records_failed": number,
      "duration_ms": number,
      "rate_limit_remaining": number,
      "next_sync_allowed_at": "ISO timestamp",
      "details": {
        "sales": { "created": number, "failed": number },
        "items": { "created": number, "failed": number },
        "customers": { "created": number, "failed": number }
      },
      "errors": ["string"]
    }
  
  Error Responses:
    401: Unauthorized
    403: Permission denied
    429: Rate limit exceeded
    500: Internal server error
```

#### Scheduled Sync (Cron)
Automated hourly synchronization for all active stores.

```yaml
POST /api/cron/hourly-sync
  Description: Automated hourly sync triggered by Vercel Cron
  Authentication: Bearer token (CRON_SECRET)
  
  Request Headers:
    Authorization: Bearer {CRON_SECRET}
  
  Response (200):
    {
      "sync_id": "string",
      "stores_synced": number,
      "total_records": number,
      "duration_ms": number,
      "failures": [{
        "store_id": "string",
        "error": "string"
      }]
    }
```

#### Sync Status
Check the status of an ongoing or completed sync operation.

```yaml
GET /api/sync/status/{sync_id}
  Description: Check sync operation status
  Authentication: Bearer token (user session)
  
  Response (200):
    {
      "sync_id": "string",
      "status": "running | success | partial | failed",
      "progress": number,  // 0-100
      "current_phase": "fetching | processing | storing | validating",
      "records_processed": number,
      "total_records": number,
      "errors": ["string"],
      "estimated_completion": "ISO timestamp"
    }
```

### Validation APIs

#### Real-time Validation
Validate manual entries against GoFrugal API data in real-time.

```yaml
POST /api/validate
  Description: Validate manual entry against API data
  Authentication: Bearer token (user session)
  
  Request Body:
    {
      "store_id": "string",
      "validation_type": "sales | inventory | cash",
      "date": "YYYY-MM-DD",
      "manual_data": {
        "total_amount": number,
        "transaction_count": number,
        "payment_breakdown": {
          "cash": number,
          "card": number,
          "upi": number
        }
      }
    }
  
  Response (200):
    {
      "validation_id": "string",
      "matched": boolean,
      "confidence_score": number,  // 0-100
      "manual_total": number,
      "api_total": number,
      "variance_amount": number,
      "variance_percentage": number,
      "variance_breakdown": {
        "cash": number,
        "card": number,
        "upi": number
      },
      "requires_explanation": boolean,
      "suggested_action": "accept | review | investigate",
      "matching_details": {
        "matched_transactions": number,
        "unmatched_manual": number,
        "unmatched_api": number
      }
    }
```

#### Batch Validation
Validate multiple records in batch mode.

```yaml
POST /api/validate/batch
  Description: Batch validation for multiple records
  Authentication: Bearer token (user session)
  
  Request Body:
    {
      "store_id": "string",
      "validations": [{
        "date": "YYYY-MM-DD",
        "type": "sales | inventory",
        "manual_total": number,
        "manual_count": number
      }]
    }
  
  Response (200):
    {
      "batch_id": "string",
      "total_validated": number,
      "matched": number,
      "variances": number,
      "results": [{
        "date": "string",
        "matched": boolean,
        "variance_amount": number,
        "confidence_score": number
      }]
    }
```

### Reconciliation APIs

#### Create Reconciliation
Initiate a reconciliation process for a specific period.

```yaml
POST /api/reconciliation/create
  Description: Create new reconciliation entry
  Authentication: Bearer token (user session)
  Permissions: reconciliation.create
  
  Request Body:
    {
      "store_id": "string",
      "reconciliation_date": "YYYY-MM-DD",
      "reconciliation_type": "SALES | INVENTORY | CASH",
      "manual_data": {
        "total": number,
        "count": number,
        "details": object
      },
      "bank_data": {  // Optional for three-way
        "total": number,
        "transactions": array
      }
    }
  
  Response (200):
    {
      "reconciliation_id": "string",
      "status": "matched | variance | escalated",
      "variance_amount": number,
      "confidence_score": number,
      "suggested_matches": array,
      "unmatched_items": {
        "manual": array,
        "api": array,
        "bank": array
      }
    }
```

#### Resolve Variance
Record resolution for detected variances.

```yaml
PUT /api/reconciliation/{id}/resolve
  Description: Resolve variance with explanation
  Authentication: Bearer token (user session)
  Permissions: reconciliation.resolve
  
  Request Body:
    {
      "resolution_notes": "string",
      "resolution_category": "data_entry | timing | system | other",
      "corrective_action": "string",
      "attachments": ["string"]  // File URLs
    }
  
  Response (200):
    {
      "reconciliation_id": "string",
      "status": "resolved",
      "resolved_by": "string",
      "resolved_at": "ISO timestamp"
    }
```

### Analytics APIs

#### Variance Trends
Get variance trends and patterns for analytics.

```yaml
GET /api/analytics/variance-trends
  Description: Analyze variance patterns over time
  Authentication: Bearer token (user session)
  
  Query Parameters:
    store_id: string (optional)
    date_from: YYYY-MM-DD
    date_to: YYYY-MM-DD
    group_by: day | week | month
  
  Response (200):
    {
      "period": "string",
      "trends": [{
        "date": "string",
        "total_variance": number,
        "variance_count": number,
        "average_variance": number,
        "variance_by_type": {
          "cash": number,
          "card": number,
          "upi": number
        }
      }],
      "patterns": [{
        "pattern_type": "recurring | seasonal | random",
        "description": "string",
        "frequency": "string",
        "impact": "low | medium | high"
      }],
      "recommendations": ["string"]
    }
```

#### Sync Performance
Monitor sync operation performance metrics.

```yaml
GET /api/analytics/sync-performance
  Description: Get sync performance metrics
  Authentication: Bearer token (user session)
  
  Query Parameters:
    period: today | week | month
    store_id: string (optional)
  
  Response (200):
    {
      "metrics": {
        "total_syncs": number,
        "success_rate": number,
        "average_duration_ms": number,
        "total_records_synced": number,
        "api_calls_made": number,
        "rate_limit_hits": number
      },
      "performance_by_type": {
        "sales": { "count": number, "avg_duration": number },
        "items": { "count": number, "avg_duration": number },
        "customers": { "count": number, "avg_duration": number }
      },
      "errors": [{
        "error_code": "string",
        "count": number,
        "last_occurrence": "ISO timestamp"
      }]
    }
```

### Alert Management APIs

#### Get Active Alerts
Retrieve active variance alerts requiring attention.

```yaml
GET /api/alerts/active
  Description: Get unacknowledged alerts
  Authentication: Bearer token (user session)
  
  Query Parameters:
    store_id: string (optional)
    severity: low | medium | high | critical
    type: threshold_exceeded | pattern_detected | sync_failure
  
  Response (200):
    {
      "alerts": [{
        "alert_id": "string",
        "store_id": "string",
        "alert_type": "string",
        "severity": "string",
        "variance_amount": number,
        "created_at": "ISO timestamp",
        "context": object,
        "suggested_actions": ["string"]
      }],
      "total_count": number,
      "critical_count": number
    }
```

#### Acknowledge Alert
Mark an alert as acknowledged/reviewed.

```yaml
PUT /api/alerts/{alert_id}/acknowledge
  Description: Acknowledge alert
  Authentication: Bearer token (user session)
  
  Request Body:
    {
      "acknowledgment_notes": "string",
      "action_taken": "string"
    }
  
  Response (200):
    {
      "alert_id": "string",
      "acknowledged_by": "string",
      "acknowledged_at": "ISO timestamp"
    }
```

### Data Export APIs

#### Export Reconciliation Report
Generate reconciliation reports in various formats.

```yaml
POST /api/export/reconciliation
  Description: Export reconciliation data
  Authentication: Bearer token (user session)
  
  Request Body:
    {
      "store_id": "string",
      "date_from": "YYYY-MM-DD",
      "date_to": "YYYY-MM-DD",
      "format": "csv | excel | pdf",
      "include_details": boolean,
      "email_to": "string"  // Optional
    }
  
  Response (200):
    {
      "export_id": "string",
      "status": "generating | ready",
      "download_url": "string",  // If ready
      "expires_at": "ISO timestamp"
    }
```

## Rate Limiting

All API endpoints implement rate limiting to prevent abuse:

### Rate Limits by Endpoint Type

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Sync APIs | 10 requests | per hour |
| Validation APIs | 100 requests | per minute |
| Analytics APIs | 50 requests | per minute |
| Export APIs | 5 requests | per hour |

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642244400
X-RateLimit-Policy: validation-api
```

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retry_after": 300,
    "reset_at": "2025-01-15T10:00:00Z"
  }
}
```

## Status Updates (Simplified Polling)

Instead of WebSockets, use simple HTTP polling for status updates:

### Client-Side Polling
```javascript
// Poll for sync status every 5 seconds
async function pollSyncStatus(syncId) {
  const response = await fetch(`/api/sync/status/${syncId}`);
  const data = await response.json();
  
  updateProgressBar(data.progress);
  
  if (data.status === 'running') {
    setTimeout(() => pollSyncStatus(syncId), 5000);
  } else {
    showSyncComplete(data);
  }
}

// Start polling after initiating sync
const syncResponse = await fetch('/api/sync/manual', {
  method: 'POST',
  body: JSON.stringify({ store_id, sync_type: 'sales' })
});
const { sync_id } = await syncResponse.json();
pollSyncStatus(sync_id);
```

### Why Polling Works Better Here
- Hourly syncs = infrequent updates
- Manual syncs complete in 30-60 seconds
- No persistent connection overhead
- Works perfectly with serverless (Vercel)
- Simpler to implement and debug
- No WebSocket infrastructure needed

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional context"
    },
    "request_id": "req_xyz123",
    "documentation_url": "https://docs.example.com/errors#ERROR_CODE"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request parameters |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| SYNC_IN_PROGRESS | 409 | Another sync already running |
| EXTERNAL_API_ERROR | 502 | GoFrugal API error |
| INTERNAL_ERROR | 500 | Server error |

## API Versioning

The API uses URL versioning:
- Current version: `/api/v1/`
- Legacy support: Minimum 6 months notice before deprecation
- Version header: `X-API-Version: 1.0`

## Security

### Authentication Methods
1. **Bearer Token**: For user sessions
2. **API Key**: For service-to-service calls
3. **CRON Secret**: For scheduled jobs

### Required Headers
```http
Authorization: Bearer {token}
Content-Type: application/json
X-Request-ID: {unique-id}
X-Store-Context: {store-id}  // For multi-store operations
```

### CORS Configuration
```javascript
{
  origin: ['https://app.example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}
```