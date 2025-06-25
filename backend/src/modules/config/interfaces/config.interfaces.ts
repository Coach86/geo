export interface LLMModelConfig {
  id: string;
  provider: string;
  model: string;
  name: string;
  enabled: boolean;
  webAccess?: boolean;
  premium?: boolean;
  parameters: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

export interface AvailableModel {
  id: string;
  model: string;
  name: string;
  provider: string;
  enabled: boolean;
  webAccess: boolean;
  premium: boolean;
}