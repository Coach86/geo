import { z } from 'zod';

// Scoring schema (0-100 for each dimension)
export const UnifiedKPIScoresSchema = z.object({
  authority: z.number().min(0).max(100),
  freshness: z.number().min(0).max(100),
  structure: z.number().min(0).max(100),
  brandAlignment: z.number().min(0).max(100),
});

// Detailed breakdown for each dimension
export const UnifiedKPIDetailsSchema = z.object({
  authority: z.object({
    hasAuthor: z.boolean(),
    citationCount: z.number(),
    domainAuthority: z.enum(['low', 'medium', 'high']).optional(),
    authorCredentials: z.boolean().optional(),
  }),
  freshness: z.object({
    daysSinceUpdate: z.number().nullable().optional(),
    hasDateSignals: z.boolean(),
    publishDate: z.string().nullable().optional(),
    modifiedDate: z.string().nullable().optional(),
  }),
  structure: z.object({
    h1Count: z.number(),
    avgSentenceWords: z.number(),
    hasSchema: z.boolean(),
    headingHierarchyScore: z.number().min(0).max(100),
  }),
  brand: z.object({
    brandMentions: z.number(),
    alignmentIssues: z.array(z.string()),
    consistencyScore: z.number().min(0).max(100),
    missingKeywords: z.array(z.string()).optional(),
  }),
});

// Issue tracking schema
export const UnifiedKPIIssueSchema = z.object({
  dimension: z.enum(['authority', 'freshness', 'structure', 'brand']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string(),
  recommendation: z.string(),
});

// LLM data schema
export const LLMDataSchema = z.object({
  prompt: z.string(),
  response: z.string(),
  model: z.string(),
  tokensUsed: z.object({
    input: z.number(),
    output: z.number(),
  }).optional(),
});

// Complete response schema
export const UnifiedKPIResultSchema = z.object({
  scores: UnifiedKPIScoresSchema,
  details: UnifiedKPIDetailsSchema,
  issues: z.array(UnifiedKPIIssueSchema),
  explanation: z.string(),
  llmData: LLMDataSchema.optional(), // Optional for backward compatibility
});

// TypeScript types
export type UnifiedKPIScores = z.infer<typeof UnifiedKPIScoresSchema>;
export type UnifiedKPIDetails = z.infer<typeof UnifiedKPIDetailsSchema>;
export type UnifiedKPIIssue = z.infer<typeof UnifiedKPIIssueSchema>;
export type LLMData = z.infer<typeof LLMDataSchema>;
export type UnifiedKPIResult = z.infer<typeof UnifiedKPIResultSchema>;

// Validation helper
export function validateUnifiedKPIResult(data: unknown): UnifiedKPIResult {
  return UnifiedKPIResultSchema.parse(data);
}