"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"

export default function CancelPage() {
  const router = useRouter()

  const handleBackToPricing = () => {
    router.push("/pricing")
  }

  const handleBackToDashboard = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <XCircle className="h-16 w-16 text-orange-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Cancelled
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your payment was cancelled. No charges were made to your account.
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={handleBackToPricing}
            className="bg-accent-500 hover:bg-accent-600 text-white w-full"
          >
            Back to Pricing
          </Button>
          <Button 
            variant="outline"
            onClick={handleBackToDashboard}
            className="w-full"
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}