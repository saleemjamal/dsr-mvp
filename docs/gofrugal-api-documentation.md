# GoFrugal API Documentation

## Overview
This document provides comprehensive technical documentation for integrating with GoFrugal HQ APIs. These APIs enable real-time data synchronization between GoFrugal POS systems and external applications.

## Table of Contents
1. [Authentication](#authentication)
2. [Base Configuration](#base-configuration)
3. [Sales Header API](#sales-header-api)
4. [Items API](#items-api)
5. [Customers API](#customers-api)
6. [Loyalty Info API](#loyalty-info-api)
7. [Error Handling](#error-handling)
8. [Rate Limits & Best Practices](#rate-limits--best-practices)

---

## Authentication

### Required Headers
All API requests must include the following headers:

```http
Content-Type: application/json
X-Auth-Token: {YOUR_LICENSE_KEY}
Accept: application/json
```

### Obtaining License Key
1. Login to GoFrugal HQ Dashboard
2. Navigate to Settings → API Configuration
3. Generate or retrieve your license key
4. Store securely in environment variables

### Security Notes
- Never expose API keys in client-side code
- Rotate keys periodically
- Use HTTPS for all production requests
- Implement request signing for additional security

---

## Base Configuration

### Environment URLs

| Environment | Base URL Pattern |
|------------|------------------|
| UAT/Testing | `http://uat.gofrugal.com/RayMedi_HQ/api/v1/` |
| Production HQ | `http://{YOUR_DOMAIN}/RayMedi_HQ/api/v1/` |
| Standalone POS | `http://{YOUR_DOMAIN}/WebReporter/api/v1/` |

### Supported Products
- RPOS6 (v6.5.8.9_SP70+)
- RPOS7 (RC118+)
- DE (v6.2.5.2+)
- HQ (RC64.96+)
- TruePOS
- ServQuick

---

## Sales Header API

### Overview
Retrieves comprehensive sales transaction data including bill headers, payment details, and transaction summaries.

### Endpoint
```
GET /api/v1/salesHeader
```

### Full URL Examples
```
# HQ System
http://{YOUR_DOMAIN}/RayMedi_HQ/api/v1/salesHeader

# Standalone RPOS
http://{YOUR_DOMAIN}/WebReporter/api/v1/salesHeader
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fromDate` | string | No | Start date (YYYY-MM-DD format) |
| `toDate` | string | No | End date (YYYY-MM-DD format) |
| `storeId` | string | No | Filter by specific store |
| `page` | integer | No | Page number for pagination (default: 1) |
| `limit` | integer | No | Records per page (default: 100, max: 1000) |
| `fields` | string | No | Comma-separated list of fields to return |
| `lastSyncTimestamp` | string | No | ISO timestamp for incremental sync |

### Request Example
```typescript
const response = await fetch('http://hq.example.com/RayMedi_HQ/api/v1/salesHeader?fromDate=2025-01-01&toDate=2025-01-31&storeId=STORE001&page=1&limit=100', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Token': 'your-license-key',
    'Accept': 'application/json'
  }
});
```

### Response Structure
```json
{
  "salesHeaders": [
    {
      "billId": "B202501010001",
      "billNumber": "INV-2025-001",
      "billDate": "2025-01-01",
      "billTime": "10:30:45",
      "storeId": "STORE001",
      "storeName": "Main Store",
      "customerId": 12345,
      "customerName": "John Doe",
      "customerMobile": "9876543210",
      "grossAmount": 5000.00,
      "discountAmount": 250.00,
      "taxAmount": 855.00,
      "netAmount": 5105.00,
      "roundOff": -0.00,
      "billAmount": 5105.00,
      "paymentMode": "MIXED",
      "paymentDetails": [
        {
          "mode": "CASH",
          "amount": 2105.00
        },
        {
          "mode": "CARD",
          "amount": 3000.00,
          "cardType": "CREDIT",
          "cardLastFour": "1234"
        }
      ],
      "itemCount": 8,
      "quantity": 12,
      "salesManId": "SM001",
      "salesManName": "Sales Person 1",
      "status": "COMPLETED",
      "isReturn": false,
      "originalBillNumber": null,
      "createdAt": "2025-01-01T10:30:45Z",
      "updatedAt": "2025-01-01T10:31:00Z",
      "syncStatus": "SYNCED",
      "posTerminal": "POS1"
    }
  ],
  "pagination": {
    "total_records": 479128,
    "current_page": 1,
    "per_page": 100,
    "total_pages": 4792,
    "has_next": true,
    "has_previous": false
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-01-15T10:00:00Z",
    "execution_time_ms": 245
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `billId` | string | Unique identifier from POS system |
| `billNumber` | string | Human-readable bill/invoice number |
| `billDate` | string | Transaction date (YYYY-MM-DD) |
| `billTime` | string | Transaction time (HH:MM:SS) |
| `storeId` | string | Store/outlet identifier |
| `grossAmount` | decimal | Total before discounts and taxes |
| `discountAmount` | decimal | Total discount applied |
| `taxAmount` | decimal | Total tax amount |
| `netAmount` | decimal | Final amount after all calculations |
| `paymentMode` | string | CASH, CARD, UPI, MIXED |
| `paymentDetails` | array | Breakdown for mixed payments |
| `isReturn` | boolean | True if this is a return transaction |

### Incremental Sync Strategy
```typescript
// Use lastSyncTimestamp for efficient updates
const lastSync = localStorage.getItem('lastSalesSync');
const url = `${API_BASE}/salesHeader?lastSyncTimestamp=${lastSync}`;

// After successful sync
localStorage.setItem('lastSalesSync', new Date().toISOString());
```

---

## Items API

### Overview
Retrieves product catalog information including stock levels, pricing, and item details.

### Endpoint
```
GET /api/v1/items
```

### Full URL Examples
```
# HQ System
http://{YOUR_DOMAIN}/RayMedi_HQ/api/v1/items

# Standalone POS
http://{YOUR_DOMAIN}/WebReporter/api/v1/items

# DE System with Company Context
http://{YOUR_DOMAIN}/WebReporter/api/v1/items?companyDataContext={CompanyName}
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Records per page (default: 50, max: 500) |
| `q` | string | No | Query filter (e.g., `itemName==Soap`) |
| `fields` | string | No | Specific fields to return |
| `selectAll` | boolean | No | Include all items including inactive |
| `itemTimeStamp` | string | No | For incremental sync |
| `categoryId` | string | No | Filter by category |
| `brandId` | string | No | Filter by brand |

### Request Headers (Optional)
```http
Accept-Encoding: gzip  # For compressed response
```

### Request Example
```typescript
const response = await fetch('http://hq.example.com/RayMedi_HQ/api/v1/items?page=1&limit=100&selectAll=true', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Token': 'your-license-key',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip'
  }
});
```

### Response Structure
```json
{
  "items": [
    {
      "itemId": "ITM001",
      "itemCode": "8901030865278",
      "itemName": "Dove Soap 100g",
      "itemShortName": "Dove 100g",
      "categoryId": "CAT001",
      "categoryName": "Personal Care",
      "brandId": "BRD001",
      "brandName": "Dove",
      "manufacturer": "Hindustan Unilever",
      "hsnCode": "3401",
      "barcode": "8901030865278",
      "uom": "PCS",
      "packSize": 1,
      "mrp": 55.00,
      "salePrice": 52.00,
      "purchasePrice": 40.00,
      "taxPercentage": 18.00,
      "taxType": "GST",
      "stock": [
        {
          "storeId": "STORE001",
          "storeName": "Main Store",
          "currentStock": 145,
          "availableStock": 140,
          "blockedStock": 5,
          "minStock": 20,
          "maxStock": 200,
          "reorderLevel": 50,
          "lastStockUpdate": "2025-01-15T09:30:00Z"
        }
      ],
      "status": "ACTIVE",
      "isComposite": false,
      "isService": false,
      "allowDiscount": true,
      "itemTimeStamp": "2025-01-15T10:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total_records": 237898,
    "current_page": 1,
    "per_page": 100,
    "total_pages": 2379,
    "has_next": true,
    "has_previous": false
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `itemId` | string | Unique item identifier |
| `itemCode` | string | SKU or product code |
| `barcode` | string | Barcode/EAN number |
| `mrp` | decimal | Maximum retail price |
| `salePrice` | decimal | Current selling price |
| `stock` | array | Stock details per store |
| `taxPercentage` | decimal | Applicable tax rate |
| `itemTimeStamp` | string | Last modification timestamp |

### Incremental Sync for Items
```typescript
// Track changes using itemTimeStamp
const lastItemSync = localStorage.getItem('lastItemSync');
const url = `${API_BASE}/items?itemTimeStamp=${lastItemSync}`;

// Process only changed items
response.items.forEach(item => {
  if (item.itemTimeStamp > lastItemSync) {
    updateLocalItem(item);
  }
});

localStorage.setItem('lastItemSync', new Date().toISOString());
```

---

## Customers API

### Overview
Manages customer information including contact details, loyalty points, and credit limits.

### Endpoint
```
GET /api/v1/eCustomers
```

### Full URL Examples
```
# HQ System
http://{YOUR_DOMAIN}/RayMedi_HQ/api/v1/eCustomers

# WebReporter
http://{YOUR_DOMAIN}/WebReporter/api/v1/eCustomers

# TruePOS
http://{YOUR_DOMAIN}/TruePOS/api/v1/eCustomers

# ServQuick
http://{YOUR_DOMAIN}/servquick/api/v1/eCustomers
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Query filter (see examples below) |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Records per page (default: 50) |
| `fields` | string | No | Specific fields to return |

### Query Filter Examples
```
# By Customer ID
?q=customerId==150

# By Customer Name
?q=customerName==John

# By Mobile Number
?q=mobile==9876543210

# Multiple conditions
?q=status==ACTIVE;creditLimit>10000
```

### Request Example
```typescript
const response = await fetch('http://hq.example.com/RayMedi_HQ/api/v1/eCustomers?q=status==ACTIVE&page=1&limit=100', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Token': 'your-license-key'
  }
});
```

### Response Structure
```json
{
  "eCustomers": [
    {
      "id": 140,
      "customerId": "CUST0001",
      "name": "John Doe",
      "mobile": "9876543210",
      "alternateMobile": "9876543211",
      "email": "john.doe@example.com",
      "address": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "dateOfBirth": "1990-01-15",
      "anniversary": "2015-06-20",
      "gender": "MALE",
      "gstNumber": "27AAPFU0939F1ZV",
      "panNumber": "ABCDE1234F",
      "creditLimit": 50000.00,
      "creditDays": 30,
      "outstandingAmount": 12500.00,
      "loyaltyPoints": 2450,
      "loyaltyTier": "GOLD",
      "totalPurchases": 125000.00,
      "lastPurchaseDate": "2025-01-14",
      "visitCount": 45,
      "averageTicketSize": 2777.78,
      "preferredStore": "STORE001",
      "salesManId": "SM001",
      "salesManName": "Sales Person 1",
      "customerType": "RETAIL",
      "priceList": "RETAIL_PRICE",
      "discountPercentage": 5.00,
      "notes": "VIP Customer",
      "tags": ["VIP", "FREQUENT_BUYER"],
      "status": "ACTIVE",
      "blacklisted": false,
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2025-01-14T18:30:00Z",
      "lastSyncTime": "2025-01-15T10:00:00Z"
    }
  ],
  "count": 1,
  "total_records": 28713,
  "current_page": 1,
  "per_page": 50,
  "total_pages": 575
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | System generated ID |
| `customerId` | string | Unique customer code |
| `mobile` | string | Primary mobile number (mandatory) |
| `creditLimit` | decimal | Maximum credit allowed |
| `creditDays` | integer | Payment terms in days |
| `outstandingAmount` | decimal | Current outstanding balance |
| `loyaltyPoints` | integer | Available loyalty points |
| `totalPurchases` | decimal | Lifetime purchase value |

---

## Loyalty Info API

### Overview
Retrieves detailed loyalty program information, points transactions, and redemption history.

### Endpoint
```
GET /api/v1/loyaltyInfo
```

### Prerequisites
- Available only for HQ with RPOS6
- Loyalty module must be enabled
- Customer must be enrolled in loyalty program

### Full URL
```
http://{YOUR_DOMAIN}/RayMedi_HQ/api/v1/loyaltyInfo
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customerId` | string | Yes* | Customer ID |
| `mobile` | string | Yes* | Customer mobile number |
| `fromDate` | string | No | Start date for transactions |
| `toDate` | string | No | End date for transactions |
| `page` | integer | No | Page number |
| `limit` | integer | No | Records per page |

*Either `customerId` or `mobile` is required

### Request Example
```typescript
const response = await fetch('http://hq.example.com/RayMedi_HQ/api/v1/loyaltyInfo?customerId=CUST0001&fromDate=2025-01-01&toDate=2025-01-31', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Token': 'your-license-key'
  }
});
```

### Response Structure
```json
{
  "loyaltyInfo": {
    "customerId": "CUST0001",
    "customerName": "John Doe",
    "mobile": "9876543210",
    "email": "john.doe@example.com",
    "enrollmentDate": "2023-01-01",
    "tierInfo": {
      "currentTier": "GOLD",
      "tierName": "Gold Member",
      "tierBenefits": [
        "5% additional discount",
        "Free delivery",
        "Priority support"
      ],
      "nextTier": "PLATINUM",
      "pointsToNextTier": 5000,
      "tierExpiryDate": "2025-12-31"
    },
    "pointsBalance": {
      "availablePoints": 2450,
      "blockedPoints": 100,
      "expiringPoints": 500,
      "expiryDate": "2025-03-31",
      "lifetimePoints": 15000,
      "redeemedPoints": 12550
    },
    "transactions": [
      {
        "transactionId": "LT001",
        "transactionDate": "2025-01-14",
        "transactionType": "EARNED",
        "billNumber": "INV-2025-001",
        "points": 125,
        "description": "Purchase points",
        "storeId": "STORE001",
        "balance": 2450
      },
      {
        "transactionId": "LT002",
        "transactionDate": "2025-01-10",
        "transactionType": "REDEEMED",
        "redemptionId": "RD001",
        "points": -500,
        "description": "Points redemption for discount",
        "storeId": "STORE001",
        "balance": 2325
      }
    ],
    "redemptionHistory": [
      {
        "redemptionId": "RD001",
        "redemptionDate": "2025-01-10",
        "pointsRedeemed": 500,
        "redemptionValue": 250.00,
        "redemptionType": "DISCOUNT",
        "billNumber": "INV-2025-050",
        "storeId": "STORE001"
      }
    ],
    "earnRules": [
      {
        "ruleId": "RULE001",
        "ruleName": "Standard Purchase",
        "earnRate": 1,
        "perAmount": 100,
        "description": "Earn 1 point for every ₹100 spent",
        "validFrom": "2025-01-01",
        "validTo": "2025-12-31"
      }
    ],
    "specialOffers": [
      {
        "offerId": "OFFER001",
        "offerName": "Double Points Weekend",
        "multiplier": 2,
        "validFrom": "2025-01-20",
        "validTo": "2025-01-21",
        "terms": "Valid on all categories except electronics"
      }
    ]
  },
  "pagination": {
    "total_records": 150,
    "current_page": 1,
    "per_page": 50,
    "total_pages": 3
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `availablePoints` | integer | Points available for redemption |
| `blockedPoints` | integer | Points temporarily unavailable |
| `expiringPoints` | integer | Points expiring soon |
| `lifetimePoints` | integer | Total points earned ever |
| `transactionType` | string | EARNED, REDEEMED, EXPIRED, ADJUSTED |
| `redemptionType` | string | DISCOUNT, GIFT, CASHBACK |

---

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "ERR_AUTH_FAILED",
    "message": "Authentication failed. Please check your API key.",
    "details": {
      "timestamp": "2025-01-15T10:00:00Z",
      "request_id": "req_xyz789",
      "documentation_url": "https://help.gofrugal.com/api/errors#ERR_AUTH_FAILED"
    }
  }
}
```

### Common Error Codes

| HTTP Code | Error Code | Description | Resolution |
|-----------|------------|-------------|------------|
| 400 | ERR_BAD_REQUEST | Invalid request parameters | Check request format |
| 401 | ERR_AUTH_FAILED | Authentication failed | Verify API key |
| 403 | ERR_FORBIDDEN | Access denied | Check permissions |
| 404 | ERR_NOT_FOUND | Resource not found | Verify endpoint URL |
| 429 | ERR_RATE_LIMIT | Too many requests | Implement backoff |
| 500 | ERR_INTERNAL | Server error | Contact support |
| 503 | ERR_UNAVAILABLE | Service unavailable | Retry later |

### Error Handling Example
```typescript
class GoFrugalAPIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'GoFrugalAPIError';
  }
}

async function apiRequest(endpoint: string, options: RequestInit) {
  try {
    const response = await fetch(endpoint, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new GoFrugalAPIError(
        error.error.code,
        error.error.message,
        error.error.details,
        response.status
      );
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof GoFrugalAPIError) {
      // Handle API errors
      console.error(`API Error ${error.code}: ${error.message}`);
      
      // Implement retry logic for specific errors
      if (error.statusCode === 429) {
        // Rate limited - implement exponential backoff
        await delay(calculateBackoff(retryCount));
        return apiRequest(endpoint, options);
      }
      
      throw error;
    }
    
    // Network or other errors
    console.error('Request failed:', error);
    throw new Error('Network error occurred');
  }
}
```

---

## Rate Limits & Best Practices

### Rate Limiting
- **Default Limits**: 1000 requests per hour per API key
- **Burst Limit**: 50 requests per minute
- **Response Headers**:
  ```http
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 950
  X-RateLimit-Reset: 1642244400
  ```

### Best Practices

#### 1. Implement Pagination
```typescript
async function* fetchAllPages(endpoint: string) {
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await apiRequest(`${endpoint}?page=${page}&limit=100`);
    yield response.items;
    
    hasMore = response.pagination.has_next;
    page++;
    
    // Add delay to avoid rate limiting
    await delay(100);
  }
}

// Usage
for await (const batch of fetchAllPages('/api/v1/items')) {
  processBatch(batch);
}
```

#### 2. Use Incremental Sync
```typescript
class IncrementalSync {
  private lastSyncTime: string;
  
  async syncSales() {
    const params = new URLSearchParams({
      lastSyncTimestamp: this.lastSyncTime || '2025-01-01T00:00:00Z',
      limit: '100'
    });
    
    const response = await apiRequest(`/api/v1/salesHeader?${params}`);
    
    // Process only new/updated records
    response.salesHeaders.forEach(sale => {
      if (sale.updatedAt > this.lastSyncTime) {
        updateLocalRecord(sale);
      }
    });
    
    this.lastSyncTime = new Date().toISOString();
    saveLastSyncTime(this.lastSyncTime);
  }
}
```

#### 3. Implement Caching
```typescript
class CachedAPIClient {
  private cache = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  
  async getItems(forceRefresh = false) {
    const cacheKey = 'items';
    const cached = this.cache.get(cacheKey);
    
    if (!forceRefresh && cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    const data = await apiRequest('/api/v1/items');
    
    this.cache.set(cacheKey, {
      data,
      expiry: Date.now() + this.cacheExpiry
    });
    
    return data;
  }
}
```

#### 4. Batch Operations
```typescript
// Instead of multiple individual requests
// BAD
for (const storeId of storeIds) {
  await fetchSalesForStore(storeId);
}

// GOOD - Use filtering when possible
const allSales = await apiRequest('/api/v1/salesHeader?storeIds=' + storeIds.join(','));
```

#### 5. Error Recovery
```typescript
class ResilientAPIClient {
  private circuitBreaker = new CircuitBreaker();
  
  async fetchWithRetry(endpoint: string, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.circuitBreaker.execute(() => 
          apiRequest(endpoint)
        );
      } catch (error) {
        lastError = error;
        
        if (error.statusCode === 429) {
          // Rate limited - exponential backoff
          await delay(Math.pow(2, i) * 1000);
        } else if (error.statusCode >= 500) {
          // Server error - linear backoff
          await delay((i + 1) * 2000);
        } else {
          // Client error - don't retry
          throw error;
        }
      }
    }
    
    throw lastError;
  }
}
```

#### 6. Monitoring & Logging
```typescript
class MonitoredAPIClient {
  async request(endpoint: string, options: RequestInit) {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    console.log(`[${requestId}] API Request: ${endpoint}`);
    
    try {
      const response = await apiRequest(endpoint, options);
      
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] Success in ${duration}ms`);
      
      // Track metrics
      trackMetric('api.request.success', { endpoint, duration });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] Failed after ${duration}ms:`, error);
      
      // Track errors
      trackMetric('api.request.error', { 
        endpoint, 
        duration, 
        error: error.code 
      });
      
      throw error;
    }
  }
}
```

---

## Integration Checklist

### Pre-Integration
- [ ] Obtain API credentials from GoFrugal
- [ ] Verify API access with test request
- [ ] Set up development/staging environment
- [ ] Review rate limits and plan accordingly
- [ ] Design database schema for storing API data

### Implementation
- [ ] Implement authentication mechanism
- [ ] Create service layer for API calls
- [ ] Add error handling and retry logic
- [ ] Implement pagination for large datasets
- [ ] Set up incremental sync mechanism
- [ ] Add caching where appropriate
- [ ] Create logging and monitoring

### Testing
- [ ] Test all endpoints with various parameters
- [ ] Verify error handling for all error codes
- [ ] Test rate limiting behavior
- [ ] Load test with expected data volumes
- [ ] Test incremental sync accuracy
- [ ] Verify data transformation logic

### Deployment
- [ ] Secure API credentials in environment variables
- [ ] Set up monitoring and alerting
- [ ] Configure automated sync schedules
- [ ] Document recovery procedures
- [ ] Create runbooks for common issues

---

## Support & Resources

### Official Documentation
- Main Documentation: https://help.connect.gofrugal.com/eCommerceAPI/
- HQ APIs: https://help.connect.gofrugal.com/eCommerceAPI/HQ-APIs.html
- Error Codes: https://help.connect.gofrugal.com/api/errors

### Contact Support
- Email: support@gofrugal.com
- Phone: 1800-XXX-XXXX
- Developer Portal: https://developers.gofrugal.com

### Version History
- v1.0 - Initial API release
- v1.1 - Added pagination support
- v1.2 - Enhanced loyalty endpoints
- v1.3 - Improved incremental sync

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Next Review: February 2025*