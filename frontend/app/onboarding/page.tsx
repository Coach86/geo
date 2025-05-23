"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useOnboarding } from "@/providers/onboarding-provider"
import CompanyInfo from "@/components/onboarding/company-info"
import BrandIdentity from "@/components/onboarding/brand-identity"
import PromptSelection from "@/components/onboarding/prompt-selection"
import ModelSelection from "@/components/onboarding/model-selection"
import Confirmation from "@/components/onboarding/confirmation"
// Importer le nouveau composant PhoneVerification
import PhoneVerification from "@/components/onboarding/phone-verification"

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentStep, formData, setFormData } = useOnboarding()
  const [isLoading, setIsLoading] = useState(false)

  // Get URL from query params if available - only run once on initial load
  useEffect(() => {
    const urlParam = searchParams.get("url")
    if (urlParam && !formData.website) {
      setFormData((prev) => ({ ...prev, website: urlParam }))
    }
  }, []) // Empty dependency array - only run once

  // Simulate loading when changing steps
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [currentStep])

  // Redirect to pricing page when reaching step 6
  useEffect(() => {
    if (currentStep === 7) {
      router.push("/pricing")
    }
  }, [currentStep, router])

  // Render the current step
  const renderStep = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse w-12 h-12 rounded-full bg-gray-200"></div>
        </div>
      )
    }

    switch (currentStep) {
      case 1:
        return <CompanyInfo />
      case 2:
        return <BrandIdentity />
      case 3:
        return <PromptSelection />
      case 4:
        return <ModelSelection />
      case 5:
        return <Confirmation />
      case 6:
        return <PhoneVerification />
      default:
        return <CompanyInfo />
    }
  }

  return <div className="w-full animate-fade-in">{renderStep()}</div>
}
