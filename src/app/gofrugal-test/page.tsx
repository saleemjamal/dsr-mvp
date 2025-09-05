"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function GoFrugalTestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Check authentication
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Check if user is admin (SU or AIC)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || (profile.role !== 'SU' && profile.role !== 'AIC')) {
        router.push('/dashboard')
        return
      }

      setLoading(false)
    }

    if (mounted) {
      checkAuth()
    }
  }, [mounted, router])

  const runConnectionTest = async () => {
    setTesting(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/gofrugal/test-connection')
      const data = await response.json()
      
      setResults(data)
      
      if (!response.ok && response.status === 401) {
        setError('Authentication failed. Please check your GoFrugal license key.')
      } else if (!response.ok) {
        setError(data.error || 'Connection test failed')
      }
    } catch (err: any) {
      console.error('Test error:', err)
      setError(err.message || 'Failed to run connection test')
    } finally {
      setTesting(false)
    }
  }

  const getStatusIcon = (success: boolean | undefined) => {
    if (success === undefined) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return success ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600'
    if (status >= 400 && status < 500) return 'text-red-600'
    if (status >= 500) return 'text-orange-600'
    return 'text-gray-600'
  }

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>GoFrugal API Connection Test</CardTitle>
          <CardDescription>
            Test your GoFrugal API credentials and verify connectivity to all endpoints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Button 
              onClick={runConnectionTest} 
              disabled={testing}
              size="lg"
              className="w-full max-w-sm"
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {testing ? 'Testing Connection...' : 'Run Connection Test'}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Test Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="space-y-4">
              {/* Overall Status */}
              <Alert variant={results.summary?.allTestsPassed ? "default" : "destructive"}>
                {results.summary?.allTestsPassed ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Connection Successful!</AlertTitle>
                    <AlertDescription>
                      All GoFrugal API endpoints are accessible and responding correctly.
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Connection Issues Detected</AlertTitle>
                    <AlertDescription>
                      Some endpoints are not responding as expected. Check the details below.
                    </AlertDescription>
                  </>
                )}
              </Alert>

              {/* Configuration Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">Base URL:</dt>
                      <dd className="font-mono">{results.configuration?.baseUrl}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">HQ Path:</dt>
                      <dd className="font-mono">{results.configuration?.hqPath}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Full API URL:</dt>
                      <dd className="font-mono text-xs break-all">{results.configuration?.fullApiUrl}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Test Results */}
              <div className="space-y-3">
                {/* Sales API Test */}
                {results.tests?.salesAPI && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(results.tests.salesAPI.success)}
                        <CardTitle className="text-base">Sales API</CardTitle>
                        <span className={`text-sm ${getStatusColor(results.tests.salesAPI.status)}`}>
                          {results.tests.salesAPI.status} {results.tests.salesAPI.statusText}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-gray-500">Records Found:</dt>
                          <dd className="font-medium">{results.tests.salesAPI.recordCount}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Has Data:</dt>
                          <dd className="font-medium">{results.tests.salesAPI.hasData ? 'Yes' : 'No'}</dd>
                        </div>
                        {results.tests.salesAPI.headers?.rateLimit && (
                          <>
                            <div>
                              <dt className="text-gray-500">Rate Limit:</dt>
                              <dd className="font-medium">{results.tests.salesAPI.headers.rateLimit}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-500">Remaining:</dt>
                              <dd className="font-medium">{results.tests.salesAPI.headers.rateLimitRemaining}</dd>
                            </div>
                          </>
                        )}
                      </dl>
                      {results.tests.salesAPI.data?.error && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertDescription className="text-xs">
                            {results.tests.salesAPI.data.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Items API Test */}
                {results.tests?.itemsAPI && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(results.tests.itemsAPI.success)}
                        <CardTitle className="text-base">Items API</CardTitle>
                        <span className={`text-sm ${getStatusColor(results.tests.itemsAPI.status)}`}>
                          {results.tests.itemsAPI.status} {results.tests.itemsAPI.statusText}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-gray-500">Records Found:</dt>
                          <dd className="font-medium">{results.tests.itemsAPI.recordCount}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Has Data:</dt>
                          <dd className="font-medium">{results.tests.itemsAPI.hasData ? 'Yes' : 'No'}</dd>
                        </div>
                      </dl>
                      {results.tests.itemsAPI.data?.error && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertDescription className="text-xs">
                            {results.tests.itemsAPI.data.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Customers API Test */}
                {results.tests?.customersAPI && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(results.tests.customersAPI.success)}
                        <CardTitle className="text-base">Customers API</CardTitle>
                        <span className={`text-sm ${getStatusColor(results.tests.customersAPI.status)}`}>
                          {results.tests.customersAPI.status} {results.tests.customersAPI.statusText}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-gray-500">Records Found:</dt>
                          <dd className="font-medium">{results.tests.customersAPI.recordCount}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Has Data:</dt>
                          <dd className="font-medium">{results.tests.customersAPI.hasData ? 'Yes' : 'No'}</dd>
                        </div>
                      </dl>
                      {results.tests.customersAPI.data?.error && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertDescription className="text-xs">
                            {results.tests.customersAPI.data.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-gray-500">Authentication:</dt>
                      <dd className="font-medium flex items-center gap-1">
                        {getStatusIcon(results.summary?.authentication === 'Valid')}
                        {results.summary?.authentication}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Sales Data:</dt>
                      <dd className="font-medium flex items-center gap-1">
                        {getStatusIcon(results.summary?.salesDataAvailable)}
                        {results.summary?.salesDataAvailable ? 'Available' : 'Not Available'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Items Data:</dt>
                      <dd className="font-medium flex items-center gap-1">
                        {getStatusIcon(results.summary?.itemsDataAvailable)}
                        {results.summary?.itemsDataAvailable ? 'Available' : 'Not Available'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Customers Data:</dt>
                      <dd className="font-medium flex items-center gap-1">
                        {getStatusIcon(results.summary?.customersDataAvailable)}
                        {results.summary?.customersDataAvailable ? 'Available' : 'Not Available'}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Raw Response (Development Only) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    View Raw Response (Debug)
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>How to use this test</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              <p>This page tests your GoFrugal API connection by:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Verifying your license key is valid</li>
                <li>Checking connectivity to the Sales, Items, and Customers endpoints</li>
                <li>Confirming data can be retrieved from each endpoint</li>
                <li>Displaying rate limit information if available</li>
              </ol>
              <p className="text-sm mt-2">
                If any test fails, check your `.env.local` configuration and ensure the GoFrugal server is accessible.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}