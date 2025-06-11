/**
 * Config API
 */

import { API_ENDPOINTS } from './constants';
import { apiFetch } from './utils';

export interface ModelConfig {
  id: string;
  model: string; // The actual model identifier used in the database (e.g., "gpt-4o", "claude-sonnet-4-20250514")
  name: string; // The friendly display name (e.g., "GPT-4o", "Claude 4 Sonnet")
  provider: string;
  enabled: boolean;
  webAccess: boolean;
}

export interface ModelsResponse {
  models: ModelConfig[];
}

/**
 * Get available models configuration
 */
export async function getModelsConfig(token: string): Promise<ModelsResponse> {
  try {
    return await apiFetch<ModelsResponse>(
      API_ENDPOINTS.CONFIG.MODELS,
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get models config error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get models config'
    );
  }
}