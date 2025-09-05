// Get the server's outbound IP address
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get IP from external service
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    
    return NextResponse.json({
      outboundIP: data.ip,
      message: 'This is the IP address GoFrugal sees when your server makes API calls',
      note: 'Provide this IP to GoFrugal support for whitelisting'
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get IP',
      message: 'Could not determine outbound IP address'
    }, { status: 500 })
  }
}