import { FormData } from '@/app/onboarding/types/form-data';
import { 
  DEFAULT_PROJECT_DATA,
  DEFAULT_BRAND_DATA,
  DEFAULT_PROMPT_DATA,
  DEFAULT_CONTACT_DATA,
  createDefaultFormData
} from '@/app/onboarding/types/form-data';

const STORAGE_KEY = 'onboarding-form-data';

export function getOnboardingData(): FormData {
  if (typeof window === 'undefined') {
    return createDefaultFormData();
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultFormData();
    }
    
    const parsed = JSON.parse(stored);
    
    // Ensure all required properties exist with defaults
    return {
      project: {
        ...DEFAULT_PROJECT_DATA,
        ...parsed.project,
      },
      brand: {
        ...DEFAULT_BRAND_DATA,
        ...parsed.brand,
        // Ensure markets is always an array
        markets: Array.isArray(parsed.brand?.markets) && parsed.brand.markets.length > 0
          ? parsed.brand.markets
          : DEFAULT_BRAND_DATA.markets,
      },
      prompts: {
        ...DEFAULT_PROMPT_DATA,
        ...parsed.prompts,
        // Ensure arrays exist
        visibilityPrompts: parsed.prompts?.visibilityPrompts || DEFAULT_PROMPT_DATA.visibilityPrompts,
        perceptionPrompts: parsed.prompts?.perceptionPrompts || DEFAULT_PROMPT_DATA.perceptionPrompts,
        comparisonPrompts: parsed.prompts?.comparisonPrompts || DEFAULT_PROMPT_DATA.comparisonPrompts,
        llmModels: parsed.prompts?.llmModels || DEFAULT_PROMPT_DATA.llmModels,
      },
      contact: {
        ...DEFAULT_CONTACT_DATA,
        ...parsed.contact,
      },
      isEditing: parsed.isEditing || false,
    };
  } catch (error) {
    console.error('Error reading onboarding data from localStorage:', error);
    return createDefaultFormData();
  }
}

export function updateOnboardingData(updates: Partial<FormData>): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const current = getOnboardingData();
    
    // Deep merge the updates
    const updated: FormData = {
      ...current,
      ...updates,
      // Handle nested objects carefully
      project: updates.project ? { ...current.project, ...updates.project } : current.project,
      brand: updates.brand ? { 
        ...current.brand, 
        ...updates.brand,
        // Ensure markets is always an array
        markets: updates.brand.markets !== undefined 
          ? (Array.isArray(updates.brand.markets) ? updates.brand.markets : [])
          : current.brand.markets
      } : current.brand,
      prompts: updates.prompts ? { ...current.prompts, ...updates.prompts } : current.prompts,
      contact: updates.contact ? { ...current.contact, ...updates.contact } : current.contact,
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating onboarding data in localStorage:', error);
  }
}

export function clearOnboardingData(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing onboarding data from localStorage:', error);
  }
}

// Helper function to update nested fields
export function updateNestedField(path: string, value: any): void {
  const data = getOnboardingData();
  const keys = path.split('.');
  let current: any = data;
  
  // Navigate to the parent of the target field
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  // Set the value
  current[keys[keys.length - 1]] = value;
  
  // Save back to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}