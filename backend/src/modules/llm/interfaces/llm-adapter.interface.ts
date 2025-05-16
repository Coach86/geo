import { ZodSchema } from 'zod';

// Define standard tool types as constants to ensure consistency
export const TOOL_TYPES = {
  WEB_SEARCH: 'web_search', // Standard web search tool type

  // Provider-specific tool types (will be normalized when stored)
  ANTHROPIC_WEB_SEARCH: 'web_search_20250305',
  OPENAI_WEB_SEARCH: 'web_search',
  PERPLEXITY_WEB_SEARCH: 'web_search_preview',
};

export interface LlmCallOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  timeout?: number;
  systemPrompt?: string; // System prompt for chat models
  model?: string; // Specific model to use (e.g., gpt-4.5 from OpenAI provider)
}

/**
 * Standardized citation interface that all LLM adapters should use
 * Minimal structure with only essential fields
 */
export interface SourceCitation {
  url: string; // URL of the cited source - the only required field
  title?: string; // Title of the source (optional, default 'Web Source')
  text?: string; // Extracted text from the source that was cited (if available)
}

/**
 * Standardized tool usage interface that all LLM adapters should use
 * Contains only necessary information about tool usage
 */
export interface ToolUseInfo {
  id: string; // Unique ID for the tool use
  type: string; // Standardized tool type from TOOL_TYPES (e.g., 'web_search')
  parameters?: {
    // Tool parameters (optional)
    query?: string; // Query used for search (if applicable)
    [key: string]: any; // Other parameters
  };
  execution_details?: {
    // Execution metadata (optional)
    status: string; // Status (e.g., 'completed', 'error')
    timestamp: string; // Execution timestamp
  };
  // No provider-specific fields should be added here
}

export interface LlmResponse {
  text: string;
  modelVersion: string;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  annotations?: SourceCitation[];
  toolUsage?: ToolUseInfo[];
  usedWebSearch?: boolean;
  responseMetadata?: any; // Store the full response metadata for reference
}

/**
 * Standard LLM adapter interface that all providers must implement
 * This ensures consistent behavior across different LLM providers
 */
export interface LlmAdapter {
  /** Unique provider name */
  name: string;

  /** Primary method to call the LLM with a prompt */
  call(prompt: string, options?: LlmCallOptions): Promise<LlmResponse>;

  /** Check if the LLM is available (e.g., API key is set) */
  isAvailable(): boolean;

  /**
   * Get structured output conforming to a schema
   * Optional but recommended for adapters that support it
   */
  getStructuredOutput?<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: LlmCallOptions,
  ): Promise<T>;
}
