"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { STEP_ORDER, getStepByOrder, getStepById, isValidStepTransition } from "../config/steps";
import type { StepId } from "../config/steps";

export interface UseOnboardingStepReturn {
  currentStepId: StepId;
  currentStepOrder: number;
  setCurrentStep: (stepId: StepId) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepId: StepId) => boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  canNavigateNext: boolean;
  canNavigatePrevious: boolean;
}

const STORAGE_KEY = "onboarding-current-step";
const DEFAULT_STEP: StepId = "project-info";

export function useOnboardingStep(): UseOnboardingStepReturn {
  const router = useRouter();
  const [currentStepId, setCurrentStepId] = useState<StepId>(DEFAULT_STEP);

  // Load step from localStorage on mount
  useEffect(() => {
    try {
      const savedStep = localStorage.getItem(STORAGE_KEY);
      if (savedStep && getStepById(savedStep as StepId)) {
        setCurrentStepId(savedStep as StepId);
      }
    } catch (error) {
      console.error("Error loading step from localStorage:", error);
    }
  }, []);

  // Save step to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currentStepId);
    } catch (error) {
      console.error("Error saving step to localStorage:", error);
    }
  }, [currentStepId]);

  const currentStep = getStepById(currentStepId);
  const currentStepOrder = currentStep?.order || 1;

  const setCurrentStep = (stepId: StepId) => {
    if (getStepById(stepId)) {
      setCurrentStepId(stepId);
    }
  };

  const nextStep = () => {
    const nextStepConfig = getStepByOrder(currentStepOrder + 1);
    if (nextStepConfig) {
      if (nextStepConfig.id === "pricing") {
        // Special handling for pricing step - redirect to pricing page
        router.push("/pricing");
      } else {
        setCurrentStepId(nextStepConfig.id as StepId);
      }
    }
  };

  const previousStep = () => {
    const prevStepConfig = getStepByOrder(currentStepOrder - 1);
    if (prevStepConfig) {
      setCurrentStepId(prevStepConfig.id as StepId);
    } else {
      // If no previous step, go to dashboard
      router.push("/");
    }
  };

  const goToStep = (stepId: StepId): boolean => {
    if (!isValidStepTransition(currentStepId, stepId)) {
      return false;
    }
    setCurrentStepId(stepId);
    return true;
  };

  const isFirstStep = currentStepOrder === 1;
  const isLastStep = currentStepOrder === STEP_ORDER.length;
  const canNavigateNext = !isLastStep;
  const canNavigatePrevious = true; // Can always go back

  return {
    currentStepId,
    currentStepOrder,
    setCurrentStep,
    nextStep,
    previousStep,
    goToStep,
    isFirstStep,
    isLastStep,
    canNavigateNext,
    canNavigatePrevious,
  };
}