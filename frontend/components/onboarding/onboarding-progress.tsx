"use client"

import { useOnboarding } from "@/providers/onboarding-provider"
import { Building, Users, MessageSquare, CheckCircle, Bot, CreditCard, Phone } from "lucide-react"
import { useRouter } from "next/navigation"

export default function OnboardingProgress() {
  const { currentStep, setCurrentStep } = useOnboarding()
  const router = useRouter()

  const steps = [
    { id: 1, name: "Company", icon: Building },
    { id: 2, name: "Brand", icon: Users },
    { id: 3, name: "Prompts", icon: MessageSquare },
    { id: 4, name: "Models", icon: Bot },
    { id: 5, name: "Review", icon: CheckCircle },
    { id: 6, name: "Contact", icon: Phone },
    { id: 7, name: "Plan", icon: CreditCard },
  ]

  // Fonction pour naviguer vers une étape spécifique
  const navigateToStep = (stepId: number) => {
    setCurrentStep(stepId)

    // Rediriger vers la page appropriée en fonction de l'étape
    if (stepId === 5) {
      router.push("/onboarding") // Page de récapitulatif
    } else if (stepId === 7) {
      router.push("/pricing") // Page de tarification
    } else if (stepId === 6) {
      router.push("/onboarding") // Page de contact
    } else {
      router.push("/onboarding") // Autres étapes d'onboarding
    }
  }

  return (
    <div className="w-full border-b border-mono-200 bg-mono-50 sticky top-16 z-10 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Progress bar */}
        <div className="relative h-2 bg-mono-100 rounded-md overflow-hidden mb-6">
          <div
            className="absolute h-full bg-accent-500 transition-all duration-500 ease-in-out"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          ></div>
        </div>

        {/* Step indicators */}
        <div className="flex justify-between">
          {steps.map((step) => {
            const isActive = currentStep >= step.id
            const Icon = step.icon

            return (
              <div
                key={step.id}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => navigateToStep(step.id)}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-md mb-1 transition-colors ${
                    isActive ? "bg-accent-500 text-white shadow-sm" : "bg-mono-100 text-mono-400"
                  } hover:opacity-80`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium ${isActive ? "text-accent-500" : "text-mono-500"}`}>
                  {step.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
