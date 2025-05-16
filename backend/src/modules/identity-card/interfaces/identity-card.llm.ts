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
export const identityCardSummarySchema = z.object({
  brandName: z.string(),
  industry: z.string(),
  shortDescription: z.string(),
  fullDescription: z.string(),
  keyBrandAttributes: z.array(z.string()),
});

/**
 * Zod schema for validating competitors LLM responses
 */
export const competitorsSummarySchema = z.object({
  competitors: z.array(z.string()),
});

/**
 * Default LLM provider to use for identity card analysis
 */
export const DEFAULT_IDENTITY_CARD_LLM_PROVIDER = LlmProvider.Anthropic;

/**
 * Default LLM provider to use for competitors analysis
 */
export const DEFAULT_COMPETITORS_LLM_PROVIDER = LlmProvider.Perplexity;
