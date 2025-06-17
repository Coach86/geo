"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { useAuth } from "@/providers/auth-provider"

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { token, isLoading: authLoading } = useAuth()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  
  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    const verifyCheckout = async () => {
      // Wait for auth to load before checking token
      if (authLoading) {
        return
      }
      
      if (!sessionId) {
        setStatus("error")
        setMessage("Invalid session")
        return
      }
      
      if (!token) {
        setStatus("error")
        setMessage("Authentication required")
        return
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/public/stripe/verify-checkout?session_id=${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setStatus("success")
          setMessage(data.message || "Payment successful! Your plan has been activated.")
          
          // Set celebration flag and redirect to home after 3 seconds
          sessionStorage.setItem('celebrate_plan_activation', 'true');
          setTimeout(() => {
            router.push("/home?from=checkout")
          }, 3000)
        } else {
          const errorData = await response.json()
          setStatus("error")
          setMessage(errorData.message || "Failed to verify payment")
        }
      } catch (error) {
        console.error("Error verifying checkout:", error)
        setStatus("error")
        setMessage("An error occurred while verifying your payment")
      }
    }

    verifyCheckout()
  }, [sessionId, token, router, authLoading])

  const handleContinue = () => {
    if (status === "success") {
      sessionStorage.setItem('celebrate_plan_activation', 'true');
      router.push("/home?from=checkout")
    } else {
      router.push("/")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === "loading" && (
          <>
            <div className="flex justify-center mb-6">
              <Loader2 className="h-16 w-16 text-accent-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Processing your payment...
            </h1>
            <p className="text-gray-600">
              Please wait while we verify your payment and activate your plan.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Payment Successful!
            </h1>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You will be redirected to your dashboard in a few seconds...
            </p>
            <Button 
              onClick={handleContinue}
              className="bg-accent-500 hover:bg-accent-600 text-white w-full"
            >
              Continue to Dashboard
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center mb-6">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Payment Verification Failed
            </h1>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handleContinue}
                className="bg-accent-500 hover:bg-accent-600 text-white w-full"
              >
                Continue to Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push("/pricing")}
                className="w-full"
              >
                Back to Pricing
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <Loader2 className="h-16 w-16 text-accent-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Loading...
            </h1>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}