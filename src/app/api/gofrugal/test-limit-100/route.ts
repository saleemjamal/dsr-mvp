// Test with 100 records per page and debug response structure
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Prevent static generation

export async function GET(request: NextRequest) {
  try {
    const licenseKey = process.env.GOFRUGAL_LICENSE_KEY!
    const baseUrl = process.env.GOFRUGAL_BASE_URL!
    const hqPath = process.env.GOFRUGAL_HQ_PATH!
    
    const endpoint = `${baseUrl}${hqPath}/api/v1/salesHeader`
    const results: any = {
      tests: [],
      summary: {}
    }
    
    // Test different limits and pages
    const tests = [
      { page: 1, limit: 100, description: 'First 100 records' },
      { page: 100, limit: 100, description: 'Page 100 with 100 records' },
      { page: 4792, limit: 100, description: 'Near last page (479257/100 ≈ 4793)' },
      { page: 4793, limit: 100, description: 'Last full page' }
    ]
    
    for (const test of tests) {
      console.log(`Testing ${test.description}...`)
      
      const params = new URLSearchParams({
        page: test.page.toString(),
        limit: test.limit.toString()
      })
      
      const response = await fetch(`${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': licenseKey,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(30000)
      })
      
      const responseText = await response.text()
      console.log(`Response for ${test.description} (first 500 chars):`, responseText.substring(0, 500))
      
      let parsedData = null
      let records = []
      let parseError = null
      
      if (response.ok) {
        try {
          parsedData = JSON.parse(responseText)
          
          // Try different possible field names
          records = parsedData?.salesHeaders || 
                   parsedData?.salesHeader || 
                   parsedData?.data || 
                   parsedData?.records ||
                   parsedData?.items ||
                   []
          
          // If still no records, check if the parsed data itself is an array
          if (records.length === 0 && Array.isArray(parsedData)) {
            records = parsedData
          }
          
        } catch (e: any) {
          parseError = e.message
        }
      }
      
      const result: any = {
        test: test.description,
        page: test.page,
        limit: test.limit,
        status: response.status,
        contentRange: response.headers.get('content-range'),
        contentLength: response.headers.get('content-length'),
        recordCount: records.length,
        hasData: records.length > 0,
        responseStructure: parsedData ? Object.keys(parsedData).slice(0, 10) : null,
        parseError: parseError
      }
      
      // If we got records, show sample data
      if (records.length > 0) {
        result.firstRecord = records[0]
        result.lastRecord = records[records.length - 1]
        result.billNumbers = records.slice(0, 5).map((r: any) => ({
          billNo: r.billNo,
          outletId: r.outletId,
          billDate: r.billDate
        }))
      } else {
        // Show raw response if no records found
        result.rawResponseSample = responseText.substring(0, 1000)
      }
      
      results.tests.push(result)
    }
    
    // Calculate optimal pagination
    const totalRecords = 479257
    const optimalLimit = 100
    const totalPages = Math.ceil(totalRecords / optimalLimit)
    
    results.summary = {
      totalRecords: totalRecords,
      optimalRecordsPerPage: optimalLimit,
      totalPagesWithLimit100: totalPages,
      lastPage: totalPages,
      mostRecentDataPages: `Pages ${totalPages - 10} to ${totalPages}`,
      syncStrategy: {
        dailyRecordsEstimate: 130,
        pagesPerDay: Math.ceil(130 / optimalLimit),
        recommendation: 'Fetch last 2-3 pages daily for incremental sync'
      },
      debugInfo: {
        anyDataFound: results.tests.some((t: any) => t.hasData),
        responseStructures: [...new Set(results.tests.map((t: any) => 
          t.responseStructure ? JSON.stringify(t.responseStructure) : 'parse_error'
        ))]
      }
    }
    
    return NextResponse.json(results)
    
  } catch (error: any) {
    console.error('Limit test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}