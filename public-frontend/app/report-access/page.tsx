'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

// Types for token validation
interface TokenValidationResult {
  valid: boolean;
  reportId?: string;
  companyId?: string;
}

// Types for resending token
interface ResendTokenRequest {
  reportId: string;
  companyId: string;
}

export default function ReportAccess() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenResult, setTokenResult] = useState<TokenValidationResult | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  
  // Get the token from the URL parameters
  const token = searchParams.get('token')
  
  // Define the API base URL based on environment
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  
  // Validate the token when the component mounts
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false)
        setError('No access token provided')
        return
      }
      
      try {
        const response = await fetch(`${apiBaseUrl}/reports/access/validate?token=${token}`)
        
        if (!response.ok) {
          throw new Error('Failed to validate token')
        }
        
        const result: TokenValidationResult = await response.json()
        setTokenResult(result)
        
        // If token is valid, redirect to the report page
        if (result.valid && result.reportId) {
          // Redirect to the report page with the token as a query parameter
          // This will allow the report page to fetch the data using the token
          router.push(`/report?token=${token}`)
        }
      } catch (err) {
        console.error('Error validating token:', err)
        setError('Failed to validate access token')
      } finally {
        setLoading(false)
      }
    }
    
    validateToken()
  }, [token, apiBaseUrl, router])
  
  // Handle requesting a new token
  const handleRequestNewToken = async () => {
    if (!tokenResult || !tokenResult.reportId || !tokenResult.companyId) {
      setError('Cannot request new token: missing report or company information')
      return
    }
    
    setResendStatus('loading')
    
    const requestBody: ResendTokenRequest = {
      reportId: tokenResult.reportId,
      companyId: tokenResult.companyId
    }
    
    try {
      const response = await fetch(`${apiBaseUrl}/reports/access/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        throw new Error('Failed to request new access token')
      }
      
      setResendStatus('success')
    } catch (err) {
      console.error('Error requesting new token:', err)
      setResendStatus('error')
      setError('Failed to request new access token')
    }
  }
  
  // Render loading state
  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Accessing Brand Intelligence Report</CardTitle>
            <CardDescription>Validating your access token...</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-b-blue-700 border-l-blue-300 border-r-blue-600 animate-spin"></div>
            <p className="mt-4 text-center text-muted-foreground">Please wait while we validate your access token</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Render error state
  if (error || !token) {
    return (
      <div className="container mx-auto max-w-3xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Access Error</CardTitle>
            <CardDescription>We encountered a problem with your access token</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>
                {error || 'No access token provided'}
              </AlertDescription>
            </Alert>
            
            <div className="mt-6">
              <p className="text-muted-foreground">
                This could be because:
              </p>
              <ul className="list-disc list-inside mt-2 text-muted-foreground">
                <li>The access link has expired</li>
                <li>The access token is invalid</li>
                <li>You don't have permission to view this report</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator for assistance or request a new access link.
            </p>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  // Token is invalid but we have report/company info to request a new one
  if (tokenResult && !tokenResult.valid) {
    return (
      <div className="container mx-auto max-w-3xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Access Link Expired</CardTitle>
            <CardDescription>Your access link has expired</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTitle>Token Expired</AlertTitle>
              <AlertDescription>
                The access link you're using has expired. Access links are valid for 24 hours from the time they are generated.
              </AlertDescription>
            </Alert>
            
            <div className="mt-6">
              <p>You can request a new access link to be sent to your email address.</p>
              <Separator className="my-4" />
              
              {resendStatus === 'success' ? (
                <Alert className="mt-4 bg-green-50 border-green-200">
                  <AlertTitle>Success!</AlertTitle>
                  <AlertDescription>
                    A new access link has been sent to your email address. Please check your inbox.
                  </AlertDescription>
                </Alert>
              ) : resendStatus === 'error' ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to send a new access link. Please try again or contact support.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
            >
              Return to Home
            </Button>
            <Button
              onClick={handleRequestNewToken}
              disabled={resendStatus === 'loading' || resendStatus === 'success'}
            >
              {resendStatus === 'loading' ? 'Sending...' : resendStatus === 'success' ? 'Sent!' : 'Request New Access Link'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  // This should not be reached normally, but added for completeness
  return (
    <div className="container mx-auto max-w-3xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>Redirecting to Report</CardTitle>
          <CardDescription>Please wait while we redirect you...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-b-blue-700 border-l-blue-300 border-r-blue-600 animate-spin"></div>
          <p className="mt-4 text-center text-muted-foreground">You will be redirected to your report momentarily</p>
        </CardContent>
      </Card>
    </div>
  )
}