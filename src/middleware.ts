import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Simple middleware like Stock_Audit - only handle specific needs
  // Let pages handle their own auth checks
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}