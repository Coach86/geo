export type StepId = 
  | 'project-info' 
  | 'brand-identity' 
  | 'prompt-selection' 
  | 'phone-verification' 
  | 'pricing'
  | 'confirmation';

export interface StepConfig {
  id: StepId;
  order: number;
  title: string;
  path: string;
}

export const STEP_ORDER: StepConfig[] = [
  { id: 'project-info', order: 1, title: 'Project Information', path: '/onboarding' },
  { id: 'brand-identity', order: 2, title: 'Brand Identity', path: '/onboarding' },
  { id: 'prompt-selection', order: 3, title: 'Prompt Selection', path: '/onboarding' },
  { id: 'phone-verification', order: 4, title: 'Phone Verification', path: '/onboarding' },
  { id: 'pricing', order: 5, title: 'Pricing', path: '/pricing' },
  { id: 'confirmation', order: 6, title: 'Confirmation', path: '/onboarding' },
];

export const getStepById = (id: StepId): StepConfig | undefined => {
  return STEP_ORDER.find(step => step.id === id);
};

export const getStepByOrder = (order: number): StepConfig | undefined => {
  return STEP_ORDER.find(step => step.order === order);
};

export const isValidStepTransition = (currentStepId: StepId, targetStepId: StepId): boolean => {
  const currentStep = getStepById(currentStepId);
  const targetStep = getStepById(targetStepId);
  
  if (!currentStep || !targetStep) {
    return false;
  }
  
  // Allow navigation to any previous step or the immediate next step
  return targetStep.order <= currentStep.order + 1;
};