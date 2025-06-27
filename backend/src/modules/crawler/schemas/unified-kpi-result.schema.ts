import { z } from 'zod';

// Scoring schema (0-100 for each dimension)
export const UnifiedKPIScoresSchema = z.object({
  authority: z.number().min(0).max(100),
  freshness: z.number().min(0).max(100),
  structure: z.number().min(0).max(100),
  snippetExtractability: z.number().min(0).max(100),
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
    daysSinceUpdate: z.number().optional(),
    hasDateSignals: z.boolean(),
    publishDate: z.string().optional(),
    modifiedDate: z.string().optional(),
  }),
  structure: z.object({
    h1Count: z.number(),
    avgSentenceWords: z.number(),
    hasSchema: z.boolean(),
    headingHierarchyScore: z.number().min(0).max(100),
  }),
  snippet: z.object({
    extractableBlocks: z.number(),
    listCount: z.number(),
    qaBlockCount: z.number(),
    avgSentenceLength: z.number(),
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
  dimension: z.enum(['authority', 'freshness', 'structure', 'snippet', 'brand']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string(),
  recommendation: z.string(),
});

// Complete response schema
export const UnifiedKPIResultSchema = z.object({
  scores: UnifiedKPIScoresSchema,
  details: UnifiedKPIDetailsSchema,
  issues: z.array(UnifiedKPIIssueSchema),
  explanation: z.string(),
});

// TypeScript types
export type UnifiedKPIScores = z.infer<typeof UnifiedKPIScoresSchema>;
export type UnifiedKPIDetails = z.infer<typeof UnifiedKPIDetailsSchema>;
export type UnifiedKPIIssue = z.infer<typeof UnifiedKPIIssueSchema>;
export type UnifiedKPIResult = z.infer<typeof UnifiedKPIResultSchema>;

// Validation helper
export function validateUnifiedKPIResult(data: unknown): UnifiedKPIResult {
  return UnifiedKPIResultSchema.parse(data);
}