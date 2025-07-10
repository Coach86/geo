"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import PricingPage from "@/components/pricing/pricing-page"
import { getOnboardingData } from "@/lib/onboarding-storage"
import FeedbackBubble from "@/components/shared/FeedbackBubble"
import { useAuth } from "@/providers/auth-provider"

export default function Pricing() {
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()
  const [recommendedPlan, setRecommendedPlan] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get data from localStorage
    const formData = getOnboardingData()
    
    // Check if we have onboarding data
    const hasOnboardingData =
      (formData.brand?.markets?.length > 0) || 
      (formData.project?.website) || 
      (formData.prompts?.llmModels?.some((m: any) => m.selected))

    // Get plan from URL parameters
    const plan = searchParams.get("plan")

    // Determine the recommended plan
    if (plan && ["starter", "growth", "enterprise", "agencies"].includes(plan)) {
      // If plan is specified in URL, use it
      setRecommendedPlan(plan)
    } else if (hasOnboardingData) {
      // If we have onboarding data, let the PricingPage component calculate the recommended plan
      setRecommendedPlan("calculate")
    } else {
      // Default to "growth" if no plan is specified and no onboarding data
      setRecommendedPlan("growth")
    }

    // Add a class to the body to indicate we're on the pricing page
    document.body.classList.add("pricing-page")

    // Short delay to ensure data is loaded
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => {
      document.body.classList.remove("pricing-page")
      clearTimeout(timer)
    }
  }, [searchParams])

  // Show loading state while determining the plan
  if (isLoading || !recommendedPlan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
      </div>
    )
  }

  return (
    <>
      <PricingPage forcedRecommendedPlan={recommendedPlan === "calculate" ? undefined : recommendedPlan} />
      {isAuthenticated && (
        <FeedbackBubble 
          description="Need help choosing your plan? Contact us!"
          buttonText="Contact Us"
          defaultSubject="Question about pricing"
          startExpanded={true}
        />
      )}
    </>
  )
}
