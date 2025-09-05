// Test pagination limits and estimate data import requirements
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Prevent static generation

export async function GET(request: NextRequest) {
  try {
    // Get environment variables
    const licenseKey = process.env.GOFRUGAL_LICENSE_KEY!
    const baseUrl = process.env.GOFRUGAL_BASE_URL!
    const hqPath = process.env.GOFRUGAL_HQ_PATH!
    
    const endpoint = `${baseUrl}${hqPath}/api/v1/salesHeader`
    const results: any = {
      pageSizeTests: [],
      estimates: {},
      recommendations: {}
    }

    // Test 1: Get total record count with minimal data
    console.log('Getting total record count...')
    const countResponse = await fetch(`${endpoint}?page=1&limit=1`, {
      method: 'GET',
      headers: {
        'X-Auth-Token': licenseKey,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000)
    })

    let totalRecords = 0
    let sampleRecord: any = null
    
    if (countResponse.ok) {
      const countData = await countResponse.json()
      
      // Try to extract total records from response headers or data
      const contentRange = countResponse.headers.get('content-range')
      if (contentRange) {
        // Format: "1-1/479235" - extract the total after the slash
        const match = contentRange.match(/\/(\d+)/)
        if (match) {
          totalRecords = parseInt(match[1])
        }
      }
      
      // Get sample record for size calculation
      if (countData.salesHeaders && countData.salesHeaders.length > 0) {
        sampleRecord = countData.salesHeaders[0]
      }
    }

    // Test 2: Test different page sizes to find limits
    const pageSizes = [1, 10, 50, 100, 200, 500]
    console.log('Testing page size limits...')
    
    for (const pageSize of pageSizes) {
      const startTime = Date.now()
      
      try {
        const testResponse = await fetch(`${endpoint}?page=1&limit=${pageSize}`, {
          method: 'GET',
          headers: {
            'X-Auth-Token': licenseKey,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(60000) // 60 second timeout for larger requests
        })
        
        const responseTime = Date.now() - startTime
        const responseText = await testResponse.text()
        let recordCount = 0
        let avgRecordSize = 0
        
        if (testResponse.ok) {
          try {
            const data = JSON.parse(responseText)
            if (data.salesHeaders) {
              recordCount = data.salesHeaders.length
              // Calculate average size per record
              avgRecordSize = new Blob([responseText]).size / recordCount
            }
          } catch (e) {
            // Parsing failed
          }
        }
        
        results.pageSizeTests.push({
          pageSize: pageSize,
          requested: pageSize,
          received: recordCount,
          status: testResponse.status,
          responseTimeMs: responseTime,
          success: testResponse.ok && recordCount > 0,
          avgRecordSizeBytes: Math.round(avgRecordSize),
          totalResponseSizeKB: Math.round(new Blob([responseText]).size / 1024)
        })
        
        // If this page size failed, don't test larger sizes
        if (!testResponse.ok || recordCount === 0) {
          break
        }
        
      } catch (error: any) {
        results.pageSizeTests.push({
          pageSize: pageSize,
          error: error.message,
          success: false
        })
        break
      }
    }

    // Find the optimal page size (largest successful)
    const successfulTests = results.pageSizeTests.filter((t: any) => t.success)
    const optimalPageSize = successfulTests.length > 0 
      ? Math.max(...successfulTests.map((t: any) => t.received))
      : 100

    // Calculate average response time and record size
    const avgResponseTime = successfulTests.length > 0
      ? successfulTests.reduce((sum: number, t: any) => sum + (t.responseTimeMs / t.received), 0) / successfulTests.length
      : 1000 // Default 1 second per record if no data

    const avgRecordSize = successfulTests.length > 0 && successfulTests[successfulTests.length - 1].avgRecordSizeBytes
      ? successfulTests[successfulTests.length - 1].avgRecordSizeBytes
      : 2000 // Default 2KB per record if no data

    // Calculate estimates
    const totalPages = Math.ceil(totalRecords / optimalPageSize)
    const estimatedTimeSeconds = (totalPages * avgResponseTime * optimalPageSize) / 1000
    const estimatedSizeBytes = totalRecords * avgRecordSize
    
    results.estimates = {
      totalRecords: totalRecords,
      totalPages: totalPages,
      optimalPageSize: optimalPageSize,
      avgRecordSizeBytes: avgRecordSize,
      avgRecordSizeKB: (avgRecordSize / 1024).toFixed(2),
      totalDataSizeMB: (estimatedSizeBytes / (1024 * 1024)).toFixed(2),
      totalDataSizeGB: (estimatedSizeBytes / (1024 * 1024 * 1024)).toFixed(3),
      estimatedImportTimeMinutes: Math.ceil(estimatedTimeSeconds / 60),
      estimatedImportTimeHours: (estimatedTimeSeconds / 3600).toFixed(2),
      avgTimePerRecordMs: avgResponseTime.toFixed(2)
    }

    // Storage estimates for Supabase
    const indexOverhead = 1.5 // Assume 50% overhead for indexes
    const jsonbOverhead = 1.2 // JSONB storage overhead
    const totalStorageBytes = estimatedSizeBytes * indexOverhead * jsonbOverhead
    
    results.supabaseEstimates = {
      rowCount: totalRecords,
      baseStorageMB: (estimatedSizeBytes / (1024 * 1024)).toFixed(2),
      withIndexesMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
      withIndexesGB: (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(3),
      estimatedMonthlyCost: {
        storage: `$${(totalStorageBytes / (1024 * 1024 * 1024) * 0.125).toFixed(2)} (at $0.125/GB)`,
        rows: totalRecords > 500000000 ? 'Exceeds free tier' : 'Within free tier (500M rows)',
        apiCalls: 'Depends on usage pattern'
      }
    }

    // Recommendations
    results.recommendations = {
      importStrategy: totalRecords > 100000 
        ? 'Use batch import with background jobs' 
        : 'Can import directly via API',
      optimalBatchSize: optimalPageSize,
      parallelJobs: totalRecords > 1000000 ? 5 : 1,
      estimatedParallelTimeHours: (estimatedTimeSeconds / 3600 / (totalRecords > 1000000 ? 5 : 1)).toFixed(2),
      dateFilteting: 'Date filtering appears to cause 400 errors - import all data then filter in database',
      incrementalSync: 'Recommend daily sync of new records only after initial import',
      rateLimit: 'Consider implementing rate limiting to avoid overwhelming the API'
    }

    // Sample data structure
    if (sampleRecord) {
      results.sampleDataStructure = {
        topLevelFields: Object.keys(sampleRecord),
        hasNestedData: !!sampleRecord.billDetails,
        billDetailsCount: sampleRecord.billDetails ? sampleRecord.billDetails.length : 0,
        estimatedFieldCount: Object.keys(sampleRecord).length + 
          (sampleRecord.billDetails ? sampleRecord.billDetails[0] ? Object.keys(sampleRecord.billDetails[0]).length : 0 : 0)
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRecords: totalRecords || 'Unable to determine',
        estimatedStorageGB: results.estimates.totalDataSizeGB || 'Unknown',
        estimatedImportHours: results.estimates.estimatedImportTimeHours || 'Unknown',
        maxPageSize: optimalPageSize
      },
      results: results
    })

  } catch (error: any) {
    console.error('Pagination test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.cause?.code,
      suggestion: 'Check API connectivity and credentials'
    }, { status: 500 })
  }
}