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
import { useEffect, useState, useRef } from "react"
import { createProject, type CreateFullProjectRequest } from "@/lib/auth-api"
import { getOnboardingData, updateOnboardingData, clearOnboardingData } from "@/lib/onboarding-storage"

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
  const { currentStep, navigateNext, navigatePrevious, currentStepData, setCurrentStepData } = useOnboarding()
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
    // Save current step data to localStorage before navigating
    if (currentStepData) {
      const existingData = getOnboardingData();
      
      switch (currentStep) {
        case StepId.PROJECT:
          updateOnboardingData({
            project: currentStepData.project,
            brand: {
              ...existingData.brand,
              markets: currentStepData.brand?.markets || existingData.brand.markets,
              analyzedData: currentStepData.brand?.analyzedData || existingData.brand.analyzedData,
            }
          });
          break;
          
        case StepId.BRAND:
          updateOnboardingData({
            brand: {
              ...existingData.brand,
              attributes: currentStepData.attributes || [],
              competitors: currentStepData.competitors || [],
            }
          });
          break;
          
        case StepId.PROMPTS:
          updateOnboardingData({
            prompts: {
              ...existingData.prompts,
              visibilityPrompts: currentStepData.visibilityPrompts || [],
              perceptionPrompts: currentStepData.perceptionPrompts || [],
            }
          });
          break;
          
        case StepId.CONTACT:
          updateOnboardingData({
            contact: {
              ...existingData.contact,
              phoneNumber: currentStepData.phoneNumber || "",
              phoneCountry: currentStepData.phoneCountry || "US",
            }
          });
          // From contact step, create the project before going to pricing
          await handleGenerateReport()
          return;
          break;
      }
    }

    if (currentStep === StepId.PRICING) {
      router.push("/results")
    } else {
      navigateNext()
    }
  }

  const handleGenerateReport = async () => {
    if (!token || authLoading) {
      setGenerationError("Authentication required. Please ensure you are logged in.")
      return
    }

    // Get data from localStorage
    const formData = getOnboardingData()
    if (!formData.project?.website) {
      setGenerationError("No website found. Please complete the project information.")
      return
    }

    setIsGenerating(true)
    setGenerationError(null)

    try {
      console.log("Processing configuration:", formData)

      // Prepare the identity card request
      const identityCardRequest: CreateFullProjectRequest = {
        url: formData.project?.website || "",
        brandName: formData.project?.brandName || "",
        description: formData.brand?.analyzedData?.fullDescription || formData.project?.description || "",
        industry: formData.project?.industry || "",
        market: formData.brand?.markets?.[0]?.country || "United States",
        language: formData.brand?.markets?.[0]?.languages?.[0] || "English",
        keyBrandAttributes: formData.brand?.attributes || formData.brand?.analyzedData?.keyBrandAttributes || [],
        competitors: formData.brand?.competitors?.filter((c: any) => c.selected).map((c: any) => c.name) || 
                    formData.brand?.analyzedData?.competitors || [],
      }

      // Add prompts if they exist and have been edited
      if (formData.prompts) {
        const selectedVisibilityPrompts = formData.prompts.visibilityPrompts
          ?.filter((p: any) => p.selected)
          .map((p: any) => p.text);
        
        const selectedPerceptionPrompts = formData.prompts.perceptionPrompts
          ?.filter((p: any) => p.selected)
          .map((p: any) => p.text);

        if (selectedVisibilityPrompts?.length > 0 || selectedPerceptionPrompts?.length > 0) {
          identityCardRequest.prompts = {
            spontaneous: selectedVisibilityPrompts || [],
            direct: selectedPerceptionPrompts || [],
            // Initialize other prompt types as empty arrays
            comparison: [],
            accuracy: [],
            brandBattle: []
          };
        }
      }

      // Save the identity card
      console.log("Saving identity card for:", identityCardRequest.brandName)
      const identityCard = await createProject(identityCardRequest, token)
      console.log("Identity card saved successfully:", identityCard.id)

      // Clear onboarding data after successful creation
      clearOnboardingData()
      
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

  // Check if we can navigate based on step data
  const canNavigate = (() => {
    if (!currentStepData) return false;
    
    const step = getStepById(currentStep);
    if (!step?.canNavigate) return true;
    
    // For validation, we need to check the current step data
    switch (currentStep) {
      case StepId.PROJECT:
        return !!(
          currentStepData.project?.website &&
          currentStepData.project?.brandName &&
          currentStepData.project?.description &&
          currentStepData.project?.industry &&
          currentStepData.brand?.analyzedData
        );
      case StepId.BRAND:
        return !!(
          currentStepData.attributes?.length > 0 &&
          currentStepData.competitors?.length > 0
        );
      case StepId.PROMPTS:
        return !!(
          currentStepData.visibilityPrompts?.some((p: any) => p.selected) &&
          currentStepData.perceptionPrompts?.some((p: any) => p.selected)
        );
      case StepId.CONTACT:
        return !!currentStepData.phoneNumber;
      default:
        return true;
    }
  })();

  const isPricingStep = currentStep === StepId.PRICING
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