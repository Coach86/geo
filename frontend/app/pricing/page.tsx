"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import PricingPage from "@/components/pricing/pricing-page"
import { useOnboarding } from "@/providers/onboarding-provider"

export default function Pricing() {
  const searchParams = useSearchParams()
  const { formData } = useOnboarding()
  const [recommendedPlan, setRecommendedPlan] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // First check if we have data from localStorage (via the context)
    const hasOnboardingData =
      formData.markets.length > 0 || formData.website || formData.llmModels.some((m) => m.selected)

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
  }, [searchParams, formData])

  // Show loading state while determining the plan
  if (isLoading || !recommendedPlan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
      </div>
    )
  }

  return <PricingPage forcedRecommendedPlan={recommendedPlan === "calculate" ? undefined : recommendedPlan} />
}
