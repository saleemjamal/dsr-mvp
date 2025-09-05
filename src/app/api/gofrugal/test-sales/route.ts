// Test working script for Sales Header API
// Using exact same configuration as test-exact which is confirmed working

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Prevent static generation

export async function GET(request: NextRequest) {
  try {
    // Use environment variables like test-exact
    const licenseKey = process.env.GOFRUGAL_LICENSE_KEY!
    const baseUrl = process.env.GOFRUGAL_BASE_URL!
    const hqPath = process.env.GOFRUGAL_HQ_PATH!
    
    // Build the endpoint URL using env variables
    const fullBaseUrl = `${baseUrl}${hqPath}/api/v1/salesHeader`
    
    // Simple request without date parameters
    const params = new URLSearchParams({
      page: '1',
      limit: '5'
    })

    const fullUrl = `${fullBaseUrl}?${params}`
    
    console.log('Testing Sales Header API:', { url: fullUrl })

    // Make the request with environment variable auth token and timeout
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'X-Auth-Token': licenseKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })
    
    // Get response text first
    const responseText = await response.text()
    
    // Try to parse as JSON
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = {
        parseError: true,
        rawResponse: responseText.substring(0, 1000)
      }
    }
    
    // Build result - focus on salesHeaders data
    const result = {
      success: response.ok,
      endpoint: fullUrl,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      summary: {
        authenticated: response.status !== 401,
        hasData: responseData?.salesHeaders?.length > 0 || false,
        recordCount: responseData?.salesHeaders?.length || 0,
        firstBill: responseData?.salesHeaders?.[0] || null,
        allBillNumbers: responseData?.salesHeaders?.map((h: any) => ({
          billNo: h.billNo,
          billDate: h.billDate,
          amount: h.amount,
          outletId: h.outletId,
          customerId: h.customerId,
          customerName: h.customerName
        })) || []
      }
    }
    
    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Sales API test error:', error)
    
    // Network errors
    if (error.cause?.code === 'ENOTFOUND') {
      return NextResponse.json({
        success: false,
        error: 'DNS lookup failed',
        details: `Cannot resolve domain`,
        suggestion: 'Check if the domain is correct and accessible from your server'
      }, { status: 503 })
    }
    
    if (error.cause?.code === 'ECONNREFUSED') {
      return NextResponse.json({
        success: false,
        error: 'Connection refused',
        details: `Server refused connection`,
        suggestion: 'The GoFrugal server may be down or blocking connections'
      }, { status: 503 })
    }
    
    if (error.cause?.code === 'ETIMEDOUT' || error.cause?.code === 'ECONNRESET') {
      return NextResponse.json({
        success: false,
        error: 'Network timeout',
        details: `Network timeout connecting to server`,
        suggestion: 'Check network connectivity between your server and GoFrugal'
      }, { status: 504 })
    }
    
    // Certificate errors
    if (error.cause?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.cause?.code === 'CERT_HAS_EXPIRED') {
      return NextResponse.json({
        success: false,
        error: 'SSL/TLS certificate error',
        details: error.message,
        suggestion: 'The GoFrugal server has certificate issues. Contact their support.'
      }, { status: 503 })
    }
    
    // Generic error
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      message: error.message,
      cause: error.cause,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}