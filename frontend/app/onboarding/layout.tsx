"use client"

import type { ReactNode } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import OnboardingProgress from "@/components/onboarding/onboarding-progress"
import { OnboardingProvider } from "@/providers/onboarding-provider"
import { useOnboarding } from "@/providers/onboarding-provider"
import { useRouter } from "next/navigation"
import { getStepById, isLastStep, PRICING_STEP, StepId, getNextButtonText } from "./steps.config"
import OnboardingHeader from "@/components/onboarding/onboarding-header"
import { useAuth } from "@/providers/auth-provider"
import { useEffect, useState } from "react"
import { createProject, type CreateFullProjectRequest } from "@/lib/auth-api"

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingProvider>
      <ProtectedOnboarding>
        <div className="flex flex-col min-h-screen bg-background">
          <OnboardingHeader />
          <OnboardingProgress />

          <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 mt-16">{children}</main>

          <footer className="w-full border-t border-gray-200 py-4">
            <div className="max-w-3xl mx-auto px-4 flex justify-between">
              <NavigationButtons />
            </div>
          </footer>
        </div>
      </ProtectedOnboarding>
    </OnboardingProvider>
  )
}

function ProtectedOnboarding({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to auth page if not authenticated
      router.push('/auth')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse w-12 h-12 rounded-full bg-gray-200"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

function NavigationButtons() {
  const { currentStep, navigateNext, navigatePrevious, canNavigateFromStep, formData, savedConfigs } = useOnboarding()
  const router = useRouter()
  const { token, isAuthenticated, isLoading: authLoading } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const handleBack = () => {
    if (currentStep === StepId.PROJECT) {
      router.push("/")
    } else {
      navigatePrevious()
    }
  }

  const handleNext = async () => {
    if (currentStep === StepId.PRICING) {
      router.push("/results")
    } else if (currentStep === StepId.CONTACT) {
      // From contact step, create the project before going to pricing
      await handleGenerateReport()
    } else {
      navigateNext()
    }
  }

  const handleGenerateReport = async () => {
    if (!token || authLoading) {
      setGenerationError("Authentication required. Please ensure you are logged in.")
      return
    }

    const allConfigs = savedConfigs.length > 0 ? savedConfigs : [formData]
    if (allConfigs.length === 0) {
      setGenerationError("No configurations found. Please add at least one website.")
      return
    }

    setIsGenerating(true)
    setGenerationError(null)

    try {
      // Process each configuration
      for (const config of allConfigs) {
        console.log("Processing configuration:", config.website)

        // Prepare the identity card request
        const identityCardRequest: CreateFullProjectRequest = {
          url: config.website,
          brandName: config.brandName,
          description: config.analyzedData?.fullDescription || config.description,
          industry: config.industry,
          market: config.markets?.[0]?.country || "United States",
          language: config.markets?.[0]?.languages?.[0] || "English",
          keyBrandAttributes: config.analyzedData?.keyBrandAttributes || config.attributes || [],
          competitors: config.analyzedData?.competitors ||
            config.competitors?.filter((c) => c.selected).map((c) => c.name) || [],
        }

        // Save the identity card
        console.log("Saving identity card for:", config.brandName)
        const identityCard = await createProject(identityCardRequest, token)
        console.log("Identity card saved successfully:", identityCard.id)
      }

      console.log("All configurations processed successfully")
      // Navigate to pricing page after project creation
      router.push("/pricing")
    } catch (error) {
      console.error("Error generating report:", error)
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Failed to generate report. Please try again."
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const isPricingStep = currentStep === StepId.PRICING
  const canNavigate = canNavigateFromStep(currentStep)
  const buttonText = getNextButtonText(currentStep, canNavigate)

  return (
    <div className="w-full flex justify-between">
      <Button variant="outline" className="flex items-center gap-2 rounded-md border-mono-200" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </Button>

      {!isPricingStep && (
        <Button
          className={`flex items-center gap-2 rounded-md ${
            canNavigate ? "bg-accent-500 hover:bg-accent-600" : "bg-gray-300"
          } text-white shadow-button transition-all duration-300`}
          onClick={handleNext}
          disabled={!canNavigate || isGenerating}
        >
          {isGenerating ? (
            <>
              <span>Generating report...</span>
            </>
          ) : (
            <>
              <span>{buttonText}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  )
}
