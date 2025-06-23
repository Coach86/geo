"use client";

import { useOnboarding } from "@/providers/onboarding-provider";
import { useRouter } from "next/navigation";
import { ONBOARDING_STEPS, PRICING_STEP, StepId } from "@/app/onboarding/steps.config";

export default function OnboardingProgress() {
  const { currentStep, setCurrentStep } = useOnboarding();
  const router = useRouter();

  // Only use onboarding steps for display (hide pricing step)
  const allSteps = ONBOARDING_STEPS;

  // Fonction pour naviguer vers une étape spécifique
  const navigateToStep = (stepId: StepId) => {
    setCurrentStep(stepId);

    // Rediriger vers la page appropriée
    if (stepId === StepId.PRICING) {
      router.push(PRICING_STEP.path);
    } else {
      router.push("/onboarding");
    }
  };

  return (
    <div className="w-full border-b border-mono-200 bg-mono-50 sticky top-16 z-10 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Progress bar */}
        <div className="relative h-2 bg-mono-100 rounded-md overflow-hidden mb-6">
          <div
            className="absolute h-full bg-accent-500 transition-all duration-500 ease-in-out"
            style={{ width: `${(currentStep / allSteps.length) * 100}%` }}
          ></div>
        </div>

        {/* Step indicators */}
        <div className="flex justify-between">
          {allSteps.map((step) => {
            const isActive = currentStep >= step.id;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => navigateToStep(step.id)}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-md mb-1 transition-colors ${
                    isActive
                      ? "bg-accent-500 text-white shadow-sm"
                      : "bg-mono-100 text-mono-400"
                  } hover:opacity-80`}
                >
                  {Icon && <Icon className="w-5 h-5" />}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive ? "text-accent-500" : "text-mono-500"
                  }`}
                >
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
