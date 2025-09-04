# Story 2.1: Manual Sync Endpoint Implementation

## Story Details
**Epic:** 2 - GoFrugal API Integration  
**Priority:** P0 - Critical  
**Points:** 5  
**Status:** Not Started  

## User Story
**As a** Store Manager  
**I need to** manually trigger a sync with GoFrugal  
**So that** I can immediately fetch latest sales data when needed  

## Acceptance Criteria
- [ ] Create `POST /api/sync/manual` endpoint
- [ ] Implement authentication check (sync permission required)
- [ ] Accept store_id and optional date_range parameters
- [ ] Call gofrugal-service.syncSales() method
- [ ] Store fetched data in gofrugal_sales table
- [ ] Return sync statistics (records created, time taken)
- [ ] Handle and log errors appropriately
- [ ] Add rate limiting (max 10 syncs per hour per store)

## API Contract
```typescript
// Request
POST /api/sync/manual
Headers: {
  Authorization: "Bearer <token>"
}
Body: {
  store_id: string;
  sync_type: 'sales' | 'items' | 'customers' | 'all';
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  force_full_sync?: boolean; // Ignore incremental timestamps
}

// Response
{
  sync_id: string;
  sync_type: string;
  status: 'success' | 'partial' | 'failed';
  records_created: number;
  records_updated: number;
  records_failed: number;
  duration_ms: number;
  rate_limit_remaining: number;
  next_sync_allowed_at?: string; // ISO timestamp if rate limited
  errors?: string[];
  details?: {
    sales?: { created: number; failed: number; };
    items?: { created: number; failed: number; };
    customers?: { created: number; failed: number; };
  };
}
```

## Implementation
```typescript
// /src/app/api/sync/manual/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { gofrugalService } from '@/lib/gofrugal-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check permission
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('permissions')
    .eq('id', session.user.id)
    .single();
    
  if (!profile?.permissions?.includes('sync.manual')) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }
  
  const body = await request.json();
  const { store_id, sync_type, date_from, date_to, force_full_sync } = body;
  
  // Simple in-memory rate limiting (perfect for hourly syncs)
  const rateLimitOk = await checkSimpleRateLimit(store_id);
  if (!rateLimitOk) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded (max 10 syncs per hour per store)',
        rate_limit_remaining: 0,
        next_sync_allowed_at: new Date(Date.now() + 3600000).toISOString()
      }, 
      { status: 429 }
    );
  }
  
  try {
    let result;
    const details: any = {};
    
    // Handle different sync types
    switch(sync_type) {
      case 'sales':
        result = await gofrugalService.syncSales(
          store_id, 
          date_from ? new Date(date_from) : undefined
        );
        details.sales = { 
          created: result.records_created, 
          failed: result.records_failed 
        };
        break;
        
      case 'items':
        result = await gofrugalService.syncItems(store_id);
        details.items = { 
          created: result.records_created, 
          failed: result.records_failed 
        };
        break;
        
      case 'customers':
        result = await gofrugalService.syncCustomers();
        details.customers = { 
          created: result.records_created, 
          failed: result.records_failed 
        };
        break;
        
      case 'all':
        // Sync all data types
        const salesResult = await gofrugalService.syncSales(store_id, date_from ? new Date(date_from) : undefined);
        const itemsResult = await gofrugalService.syncItems(store_id);
        const customersResult = await gofrugalService.syncCustomers();
        
        result = {
          sync_id: crypto.randomUUID(),
          success: salesResult.success && itemsResult.success && customersResult.success,
          records_created: salesResult.records_created + itemsResult.records_created + customersResult.records_created,
          records_failed: salesResult.records_failed + itemsResult.records_failed + customersResult.records_failed,
          duration_ms: salesResult.duration_ms + itemsResult.duration_ms + customersResult.duration_ms,
          errors: [...(salesResult.errors || []), ...(itemsResult.errors || []), ...(customersResult.errors || [])]
        };
        
        details.sales = { created: salesResult.records_created, failed: salesResult.records_failed };
        details.items = { created: itemsResult.records_created, failed: itemsResult.records_failed };
        details.customers = { created: customersResult.records_created, failed: customersResult.records_failed };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid sync_type' }, 
          { status: 400 }
        );
    }
    
    // Log sync activity
    await logSyncActivity(store_id, sync_type, result.sync_id, session.user.id);
    
    return NextResponse.json({
      ...result,
      sync_type,
      rate_limit_remaining: rateLimitStatus.remaining,
      details
    });
  } catch (error) {
    console.error('Manual sync failed:', error);
    
    // Check if it's a rate limit error from GoFrugal
    if (error.message.includes('Rate limited')) {
      return NextResponse.json(
        { 
          error: 'GoFrugal API rate limit exceeded',
          rate_limit_remaining: 0,
          next_sync_allowed_at: new Date(Date.now() + 60000).toISOString()
        }, 
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
}
```

// Simple in-memory rate limiter (no Redis needed)
const syncHistory = new Map<string, Date[]>();

async function checkSimpleRateLimit(storeId: string): Promise<boolean> {
  const now = new Date();
  const history = syncHistory.get(storeId) || [];
  
  // Remove entries older than 1 hour
  const recentSyncs = history.filter(
    time => now.getTime() - time.getTime() < 3600000
  );
  
  // Check if under limit (10 syncs per hour)
  if (recentSyncs.length >= 10) {
    return false;
  }
  
  // Add current sync to history
  recentSyncs.push(now);
  syncHistory.set(storeId, recentSyncs);
  
  return true;
}

// Optional: Clean up old entries periodically
setInterval(() => {
  const now = new Date();
  for (const [storeId, history] of syncHistory.entries()) {
    const recentSyncs = history.filter(
      time => now.getTime() - time.getTime() < 3600000
    );
    if (recentSyncs.length === 0) {
      syncHistory.delete(storeId);
    } else {
      syncHistory.set(storeId, recentSyncs);
    }
  }
}, 3600000); // Clean up every hour

## Testing Checklist
- [ ] Test successful sync with valid credentials
- [ ] Test authentication rejection
- [ ] Test permission rejection  
- [ ] Test rate limiting enforcement (in-memory)
- [ ] Test with date range parameters
- [ ] Test error handling for API failures
- [ ] Verify data stored correctly in database
- [ ] Test response format matches contract
- [ ] Test rate limiter resets after 1 hour