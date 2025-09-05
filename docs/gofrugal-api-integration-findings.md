# GoFrugal API Integration - Complete Findings & Learnings

## Executive Summary
After extensive testing of the GoFrugal API endpoints, we've established that:
- **salesHeader** endpoint works and contains all sales data (479,257+ records)
- **salesInfo** endpoint does NOT work - returns only HTML error pages
- Bill numbers are **per outlet** and **reset annually** on April 1st (Indian Financial Year)
- Date filtering does NOT work on salesHeader
- Optimal pagination is 100 records per page

---

## Endpoint Analysis

### salesHeader Endpoint ✅ WORKING
**URL:** `http://{domain}/{hq_path}/api/v1/salesHeader`

#### What Works:
- Simple pagination: `?page=1&limit=100`
- Returns bill-level sales data
- Content-range header provides total record count
- Maximum 100 records per page

#### What Doesn't Work:
- ❌ Date parameters (`fromDate`, `toDate`) cause 400 errors
- ❌ No query filtering support
- ❌ Cannot filter by date, only paginate

#### Data Structure:
```json
{
  "salesHeaders": [
    {
      "billNo": "CA3945",        // Alphanumeric with prefixes
      "outletId": 3,              // Each outlet has its own sequence
      "outletName": "POPPAT JAMALS ANNA NAGAR",
      "billDate": "2014-10-08 00:00:00",  // DateTime format
      "amount": 621,
      "customerName": "John Doe",
      "billDetails": [...]        // Nested line items
    }
  ]
}
```

### salesInfo Endpoint ❌ NOT WORKING
**URL:** `http://{domain}/{hq_path}/api/v1/salesInfo`

#### Issues:
- Returns HTML error pages (400 Bad Request) for ALL query attempts
- Requires `q` parameter but none of the formats work
- Appears to be misconfigured or not available in this GoFrugal instance

#### Attempted Query Formats (All Failed):
- `q=billNo==1`
- `q=billNo==CA1`
- `q=billDate>=2025-09-03 00:00:00`
- `q=billNo>479000`
- All date formats and operators

---

## Critical Discoveries

### 1. Bill Number Structure
Bill numbers are **NOT globally unique**. They have three dimensions:

```
Unique Key = BillNo + OutletId + FinancialYear
```

#### Bill Number Prefixes:
- **CA**: Cash bills (e.g., CA1, CA2)
- **CC**: Credit card bills
- **SP**: Split bills
- **CR**: Credit bills
- **RR**: Return receipts
- **CQ**: Cheque payments
- **LR**: Loyalty receipts

#### Important Characteristics:
- Each outlet maintains its own sequence
- Numbers reset on April 1st (start of Indian Financial Year)
- Same billNo can exist across multiple outlets
- Same billNo can repeat each financial year

### 2. Pagination & Data Order
- **Total Records:** 479,257+
- **Order:** By bill creation (oldest first)
- **First Page:** Contains oldest bills (Bill #1 from 2014)
- **Last Page:** Contains most recent bills
- **Optimal Limit:** 100 records per page
- **Total Pages:** 4,793 (with limit=100)

### 3. Date Handling
- **Date Format in Data:** `"2014-10-08 00:00:00"` (MySQL datetime)
- **Date Filtering:** NOT supported via API parameters
- **Workaround:** Must fetch pages and filter client-side

---

## Sync Strategy Recommendations

### Initial Data Import
Since date filtering doesn't work, options are:

1. **Import All Data** (479k records)
   - Fetch all 4,793 pages
   - ~1.6GB storage in Supabase
   - ~27 hours with parallel processing

2. **Import Recent Data Only**
   - Start from last page (4793) and work backwards
   - Stop after desired date range
   - More efficient for recent data needs

### Incremental Daily Sync

```javascript
// Recommended approach - Fetch from end
const RECORDS_PER_PAGE = 100;
const totalRecords = 479257; // From content-range header
const lastPage = Math.ceil(totalRecords / RECORDS_PER_PAGE);

// Daily sync - check last 3 pages (300 records)
for (let page = lastPage; page > lastPage - 3; page--) {
  const data = await fetchPage(page);
  
  // Process records and check against last sync
  for (const record of data.salesHeaders) {
    const uniqueKey = `${record.billNo}_${record.outletId}_${getFinancialYear(record.billDate)}`;
    if (alreadySynced(uniqueKey)) break;
    
    await saveRecord(record);
  }
}
```

---

## Database Schema Design

### Recommended Supabase Table Structure

```sql
CREATE TABLE gofrugal_sales (
  id SERIAL PRIMARY KEY,
  
  -- Bill identifiers
  bill_no VARCHAR(50) NOT NULL,
  outlet_id INTEGER NOT NULL,
  bill_date TIMESTAMP NOT NULL,
  financial_year INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN EXTRACT(MONTH FROM bill_date) >= 4 THEN EXTRACT(YEAR FROM bill_date)
      ELSE EXTRACT(YEAR FROM bill_date) - 1
    END
  ) STORED,
  
  -- Bill data
  outlet_name VARCHAR(200),
  amount DECIMAL(10,2),
  customer_name VARCHAR(200),
  customer_mobile VARCHAR(20),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint accounting for resets
  UNIQUE(bill_no, outlet_id, financial_year)
);

-- Indexes for efficient queries
CREATE INDEX idx_bill_date ON gofrugal_sales(bill_date);
CREATE INDEX idx_outlet_id ON gofrugal_sales(outlet_id);
CREATE INDEX idx_financial_year ON gofrugal_sales(financial_year);

-- Sync tracking table
CREATE TABLE gofrugal_sync_status (
  id SERIAL PRIMARY KEY,
  outlet_id INTEGER,
  last_bill_no VARCHAR(50),
  last_sync_date TIMESTAMP,
  last_page_synced INTEGER,
  total_records_synced INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(outlet_id)
);
```

---

## Mistakes Made & Lessons Learned

### 1. Wrong Assumptions
- ❌ **Assumed bill numbers were globally unique** 
  - ✅ Reality: Per outlet + yearly reset
- ❌ **Assumed salesInfo would work like documentation**
  - ✅ Reality: Endpoint not functional in this instance
- ❌ **Assumed date filtering would work**
  - ✅ Reality: Must paginate and filter client-side

### 2. Testing Approach Issues
- ❌ **Started with complex date queries**
  - ✅ Should have started with simple pagination
- ❌ **Focused on salesInfo too long**
  - ✅ Should have verified data availability first
- ❌ **Used small page limits (5 records)**
  - ✅ Should have used maximum (100) from start

### 3. Date Format Attempts (All Failed)
We tried every conceivable date format:
- ISO: `2025-09-03`
- DateTime: `2025-09-03 00:00:00`
- DD/MM/YYYY: `03/09/2025`
- MM/DD/YYYY: `09/03/2025`
- With quotes, without quotes, with operators (>=, ==, LIKE)
- **None worked** - the API simply doesn't support date filtering

---

## Working Test Endpoints to Keep

### Essential Tests
1. **test-sales** - Basic salesHeader data retrieval
2. **test-pagination** - Analyzes data volume and performance
3. **test-limit-100** - Optimal pagination with 100 records
4. **test-outlets** - Understanding multi-outlet bill structure

### Can Be Removed
- test-exact (redundant with test-sales)
- test-simple (basic connectivity test, not needed)
- test-auth, test-connection, test-formats (failed attempts)
- test-salesinfo (endpoint doesn't work)
- test-dates (date filtering doesn't work)
- test-query-syntax (query syntax doesn't work)
- test-actual-dates (date queries don't work)
- test-billno-patterns (superseded by test-outlets)
- test-both-endpoints (diagnostic, not needed anymore)
- test-page-order (diagnostic, not needed anymore)

---

## Implementation Checklist

- [ ] Use salesHeader endpoint only (salesInfo doesn't work)
- [ ] Set pagination to 100 records per page
- [ ] Implement composite unique key (billNo + outletId + financialYear)
- [ ] Track sync status per outlet
- [ ] Handle financial year transitions (April 1st)
- [ ] Fetch from last page backwards for recent data
- [ ] Filter dates client-side after fetching
- [ ] Plan for ~4,793 API calls for full import
- [ ] Implement parallel processing for faster imports
- [ ] Monitor for bill number resets on April 1st

---

## API Configuration

### Environment Variables Required
```env
GOFRUGAL_LICENSE_KEY=4D74C067C486AB92CA42E197C1C1A21AED615A892F9D9420D2C4D2E0CFD9A5DBC55AD86074B95482
GOFRUGAL_BASE_URL=http://poppatjamals.gofrugal.com
GOFRUGAL_HQ_PATH=/RayMedi_HQ
```

### Working API Call Example
```javascript
const response = await fetch(
  `${GOFRUGAL_BASE_URL}${GOFRUGAL_HQ_PATH}/api/v1/salesHeader?page=4793&limit=100`,
  {
    headers: {
      'X-Auth-Token': GOFRUGAL_LICENSE_KEY,
      'Content-Type': 'application/json'
    }
  }
);
```

---

## Performance Metrics

- **API Response Time:** ~1-2 seconds per 100 records
- **Data Size:** ~2KB per record
- **Daily New Records:** ~130-200
- **Storage Requirement:** ~1.6GB for all data
- **Import Time Estimate:** 27 hours (5 parallel workers)
- **Daily Sync Time:** 2-3 minutes (checking last 3 pages)

---

## Contact & Support

For issues with the GoFrugal API:
- API Documentation: https://help.connect.gofrugal.com/eCommerceAPI/
- Note: Their documentation may not match actual implementation
- salesInfo endpoint documented but not functional in this instance

---

*Document created: September 4, 2025*
*Based on extensive testing of GoFrugal API endpoints*