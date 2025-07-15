import { FormData } from '@/app/onboarding/types/form-data';
import { 
  DEFAULT_PROJECT_DATA,
  DEFAULT_BRAND_DATA,
  DEFAULT_PROMPT_DATA,
  DEFAULT_CONTACT_DATA,
  createDefaultFormData
} from '@/app/onboarding/types/form-data';

const STORAGE_KEY = 'onboarding-form-data';
const STORAGE_EXPIRY_KEY = 'onboarding-form-data-expiry';
const EXPIRY_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

interface StoredData {
  data: FormData;
  timestamp: number;
}

function isDataExpired(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  
  try {
    const expiryTime = localStorage.getItem(STORAGE_EXPIRY_KEY);
    if (!expiryTime) {
      return true;
    }
    
    const expiry = parseInt(expiryTime, 10);
    return Date.now() > expiry;
  } catch (error) {
    return true;
  }
}

export function getOnboardingData(): FormData {
  if (typeof window === 'undefined') {
    return createDefaultFormData();
  }
  
  try {
    // Check if data has expired
    if (isDataExpired()) {
      clearOnboardingData();
      return createDefaultFormData();
    }
    
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
        markets: Array.isArray(parsed.brand?.markets)
          ? parsed.brand.markets
          : DEFAULT_BRAND_DATA.markets,
      },
      prompts: {
        ...DEFAULT_PROMPT_DATA,
        ...parsed.prompts,
        // Ensure arrays exist
        visibilityPrompts: parsed.prompts?.visibilityPrompts || DEFAULT_PROMPT_DATA.visibilityPrompts,
        perceptionPrompts: parsed.prompts?.perceptionPrompts || DEFAULT_PROMPT_DATA.perceptionPrompts,
        alignmentPrompts: parsed.prompts?.alignmentPrompts || DEFAULT_PROMPT_DATA.alignmentPrompts,
        competitionPrompts: parsed.prompts?.competitionPrompts || DEFAULT_PROMPT_DATA.competitionPrompts,
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
    
    // Update expiry time whenever data is updated
    const expiryTime = Date.now() + EXPIRY_DURATION_MS;
    localStorage.setItem(STORAGE_EXPIRY_KEY, expiryTime.toString());
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
    localStorage.removeItem(STORAGE_EXPIRY_KEY);
    localStorage.removeItem('onboardingStep');
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
  
  // Update expiry time whenever data is updated
  const expiryTime = Date.now() + EXPIRY_DURATION_MS;
  localStorage.setItem(STORAGE_EXPIRY_KEY, expiryTime.toString());
}