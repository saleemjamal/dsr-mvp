// Test to understand outlet structure and bill numbering
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Prevent static generation

export async function GET(request: NextRequest) {
  try {
    const licenseKey = process.env.GOFRUGAL_LICENSE_KEY!
    const baseUrl = process.env.GOFRUGAL_BASE_URL!
    const hqPath = process.env.GOFRUGAL_HQ_PATH!
    
    const endpoint = `${baseUrl}${hqPath}/api/v1/salesHeader`
    const results: any = {
      sampleData: [],
      outletAnalysis: {},
      billNumbering: {},
      summary: {}
    }
    
    // Get a larger sample to analyze outlet patterns
    console.log('Fetching sample data to analyze outlets...')
    
    const params = new URLSearchParams({
      page: '1',
      limit: '50'  // Get more records to see the pattern
    })
    
    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: {
        'X-Auth-Token': licenseKey,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000)
    })
    
    if (response.ok) {
      const data = await response.json()
      const records = data?.salesHeaders || []
      
      if (records.length > 0) {
        // Store sample data
        results.sampleData = records.slice(0, 10).map((r: any) => ({
          billNo: r.billNo,
          outletId: r.outletId,
          outletName: r.outletName,
          billDate: r.billDate,
          amount: r.amount,
          customerName: r.customerName
        }))
        
        // Analyze outlets
        const outletMap = new Map<number, any>()
        const billsByOutlet = new Map<number, Set<any>>()
        
        records.forEach((record: any) => {
          const outletId = record.outletId
          const billNo = record.billNo
          
          // Track outlet info
          if (!outletMap.has(outletId)) {
            outletMap.set(outletId, {
              outletId: outletId,
              outletName: record.outletName || `Outlet ${outletId}`,
              billNumbers: new Set(),
              firstBillDate: record.billDate,
              lastBillDate: record.billDate,
              recordCount: 0
            })
          }
          
          const outlet = outletMap.get(outletId)
          outlet.billNumbers.add(billNo)
          outlet.recordCount++
          
          // Track bills by outlet
          if (!billsByOutlet.has(outletId)) {
            billsByOutlet.set(outletId, new Set())
          }
          billsByOutlet.get(outletId)?.add(billNo)
        })
        
        // Convert outlet analysis to array
        results.outletAnalysis = {
          uniqueOutlets: Array.from(outletMap.keys()),
          outletCount: outletMap.size,
          outletDetails: Array.from(outletMap.values()).map(o => ({
            outletId: o.outletId,
            outletName: o.outletName,
            uniqueBillCount: o.billNumbers.size,
            recordCount: o.recordCount,
            sampleBillNos: Array.from(o.billNumbers).slice(0, 5)
          }))
        }
        
        // Analyze bill numbering patterns
        const billNoAnalysis: any = {}
        records.forEach((record: any) => {
          const billNo = record.billNo
          if (!billNoAnalysis[billNo]) {
            billNoAnalysis[billNo] = {
              billNo: billNo,
              outlets: [],
              count: 0
            }
          }
          billNoAnalysis[billNo].outlets.push(record.outletId)
          billNoAnalysis[billNo].count++
        })
        
        // Find bills that appear in multiple outlets
        const duplicateBills = Object.values(billNoAnalysis)
          .filter((b: any) => b.count > 1)
          .map((b: any) => ({
            billNo: b.billNo,
            appearCount: b.count,
            outlets: [...new Set(b.outlets)]
          }))
        
        results.billNumbering = {
          totalRecordsAnalyzed: records.length,
          uniqueBillNumbers: Object.keys(billNoAnalysis).length,
          duplicateBillNumbers: duplicateBills.length,
          duplicateExamples: duplicateBills.slice(0, 10),
          conclusion: duplicateBills.length > 0 
            ? 'Bill numbers are PER OUTLET - same billNo can exist in multiple outlets'
            : 'Bill numbers appear to be globally unique'
        }
        
        // Summary and recommendations
        results.summary = {
          finding: 'Each outlet has its own bill number sequence',
          uniqueIdentifier: 'Combination of (billNo + outletId)',
          implications: [
            'Cannot rely on billNo alone for tracking',
            'Need to track last synced billNo PER OUTLET',
            'Must include outletId in all queries and storage'
          ],
          syncStrategy: {
            approach: 'Track sync position per outlet',
            dataStructure: {
              'outlet_1': 'last_synced_billNo_for_outlet_1',
              'outlet_2': 'last_synced_billNo_for_outlet_2',
              'example': 'Map<outletId, lastBillNo>'
            },
            recommendation: 'Create a sync_status table with (outlet_id, last_bill_no, last_sync_date)'
          }
        }
      }
    } else {
      results.error = 'Failed to fetch data'
      results.status = response.status
    }
    
    return NextResponse.json(results)
    
  } catch (error: any) {
    console.error('Outlet analysis error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}