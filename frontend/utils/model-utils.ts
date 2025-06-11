import { ModelConfig } from '@/lib/api/config';

// Cache for model configurations to avoid repeated API calls
let modelConfigCache: ModelConfig[] | null = null;
let modelNameMap: Record<string, string> = {};

/**
 * Set the model configuration cache (should be called when models are loaded)
 */
export function setModelConfigCache(models: ModelConfig[]) {
  modelConfigCache = models;
  modelNameMap = createModelNameMap(models);
}

/**
 * Get the friendly name for a model identifier
 * @param modelId The model identifier from the backend (e.g., "gpt-4o", "claude-sonnet-4-20250514")
 * @returns The friendly model name (e.g., "GPT-4o", "Claude 4 Sonnet")
 */
export function getModelFriendlyName(modelId: string): string {
  if (!modelId) {
    return 'Unknown Model';
  }

  // Use the cached mapping first
  if (modelNameMap[modelId]) {
    return modelNameMap[modelId];
  }

  // If not in cache, return the original model ID as fallback
  return modelId;
}

/**
 * Create a mapping object from model identifier to friendly name
 * Maps the "model" field to the "name" field from the config
 */
function createModelNameMap(models: ModelConfig[]): Record<string, string> {
  const map: Record<string, string> = {};
  
  models.forEach(model => {
    // Direct mapping from model identifier to friendly name
    map[model.model] = model.name;
    
    // Also map by ID for backward compatibility
    map[model.id] = model.name;
  });
  
  return map;
}