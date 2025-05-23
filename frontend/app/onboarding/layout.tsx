"use client"

import type { ReactNode } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import OnboardingProgress from "@/components/onboarding/onboarding-progress"
import { OnboardingProvider } from "@/providers/onboarding-provider"
import { useOnboarding } from "@/providers/onboarding-provider"
import { useRouter } from "next/navigation"
import OnboardingHeader from "@/components/onboarding/onboarding-header"

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingProvider>
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
    </OnboardingProvider>
  )
}

function NavigationButtons() {
  const { currentStep, setCurrentStep } = useOnboarding()
  const router = useRouter()

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      router.push("/")
    }
  }

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1)
    } else {
      // Rediriger vers la page de résultats ou de génération du rapport
      router.push("/results")
    }
  }

  const isLastStep = currentStep === 7
  const isPaywallStep = currentStep === 7

  return (
    <div className="w-full flex justify-between">
      <Button variant="outline" className="flex items-center gap-2 rounded-md border-mono-200" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </Button>

      {!isPaywallStep && (
        <Button
          className={`flex items-center gap-2 rounded-md ${
            isLastStep ? "bg-accent-500 hover:bg-accent-600" : "bg-accent-500 hover:bg-accent-600"
          } text-white shadow-button transition-all duration-300`}
          onClick={handleNext}
        >
          {currentStep === 6 ? (
            <>
              <span>Continue to pricing</span>
              <ArrowRight className="h-4 w-4" />
            </>
          ) : currentStep === 5 ? (
            <>
              <span>Get my report</span>
              <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  )
}
