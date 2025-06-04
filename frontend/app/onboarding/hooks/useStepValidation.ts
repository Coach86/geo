"use client";

import { useMemo } from "react";
import { validateStep, canNavigateFromStep } from "../types/validation";
import type { ValidationResult } from "../types/validation";
import type { OnboardingFormData } from "../types/form-data";
import type { StepId } from "../config/steps";

export interface UseStepValidationReturn {
  validateCurrentStep: (stepId: StepId, data: OnboardingFormData) => ValidationResult;
  canNavigateNext: (stepId: StepId, data: OnboardingFormData) => boolean;
  getStepErrors: (stepId: StepId, data: OnboardingFormData) => string[];
  getStepWarnings: (stepId: StepId, data: OnboardingFormData) => string[];
  isStepValid: (stepId: StepId, data: OnboardingFormData) => boolean;
}

export function useStepValidation(): UseStepValidationReturn {
  const validateCurrentStep = useMemo(() => {
    return (stepId: StepId, data: OnboardingFormData): ValidationResult => {
      return validateStep(stepId, data);
    };
  }, []);

  const canNavigateNext = useMemo(() => {
    return (stepId: StepId, data: OnboardingFormData): boolean => {
      return canNavigateFromStep(stepId, data);
    };
  }, []);

  const getStepErrors = useMemo(() => {
    return (stepId: StepId, data: OnboardingFormData): string[] => {
      const validation = validateStep(stepId, data);
      return validation.errors;
    };
  }, []);

  const getStepWarnings = useMemo(() => {
    return (stepId: StepId, data: OnboardingFormData): string[] => {
      const validation = validateStep(stepId, data);
      return validation.warnings || [];
    };
  }, []);

  const isStepValid = useMemo(() => {
    return (stepId: StepId, data: OnboardingFormData): boolean => {
      const validation = validateStep(stepId, data);
      return validation.isValid;
    };
  }, []);

  return {
    validateCurrentStep,
    canNavigateNext,
    getStepErrors,
    getStepWarnings,
    isStepValid,
  };
}