/**
 * Type definitions for LLM tool usage tracking
 */

export interface ToolUsageExecutionDetails {
  status: string;
  result?: unknown;
  error?: string;
  duration?: number;
  timestamp?: string;
}

export interface ToolUsage {
  type: string;
  parameters?: Record<string, unknown>;
  execution_details?: ToolUsageExecutionDetails;
}

export interface WebSearchToolUsage extends ToolUsage {
  type: 'web_search';
  parameters: {
    query: string;
    filters?: Record<string, unknown>;
  };
  execution_details: ToolUsageExecutionDetails & {
    result?: {
      sources: number;
      relevantResults: number;
    };
  };
}