import { z } from 'zod';
import { LlmProvider } from '@/modules/llm/interfaces/llm-provider.enum';

/**
 * Interface for LLM analysis result
 */
export interface LlmSummaryResult {
  brandName: string;
  industry: string;
  shortDescription: string;
  fullDescription: string;
  objectives?: string;
  keyBrandAttributes: string[];
  // competitors removed from main summary result
}

/**
 * Interface for competitors analysis result
 */
export interface CompetitorsSummaryResult {
  competitors: string[];
}

/**
 * Zod schema for validating LLM responses
 */
export const projectSummarySchema = z.object({
  brandName: z.string(),
  industry: z.string(),
  shortDescription: z.string(),
  fullDescription: z.string(),
  objectives: z.string().optional(),
  keyBrandAttributes: z.array(z.string()),
});

/**
 * Zod schema for validating competitors LLM responses
 */
export const competitorsSummarySchema = z.object({
  competitors: z.array(z.string()),
});

/**
 * Default LLM provider to use for project analysis
 */
export const DEFAULT_PROJECT_LLM_PROVIDER = LlmProvider.Perplexity;

/**
 * Default LLM provider to use for competitors analysis
 */
export const DEFAULT_COMPETITORS_LLM_PROVIDER = LlmProvider.Perplexity;
