import { z } from 'zod';

const SentimentEnum = z.enum(['positive', 'neutral', 'negative']);

const SpontaneousResultSchema = z.object({
  llmProvider: z.string().min(1),
  promptIndex: z.number().int().nonnegative(),
  mentioned: z.boolean(),
  topOfMind: z.array(z.string().min(1)),
});

const SentimentResultSchema = z.object({
  llmProvider: z.string().min(1),
  promptIndex: z.number().int().nonnegative(),
  sentiment: SentimentEnum,
  accuracy: z.number().min(0).max(1),
  extractedFacts: z.array(z.string().min(1)),
});

const ComparisonResultSchema = z.object({
  llmProvider: z.string().min(1),
  promptIndex: z.number().int().nonnegative(),
  winner: z.string().min(1),
  differentiators: z.array(z.string().min(1)),
});

export const WeeklyBrandReportSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  weekStart: z.date(),
  spontaneous: z.object({
    results: z.array(SpontaneousResultSchema),
    summary: z.object({
      mentionRate: z.number().min(0).max(1),
      topMentions: z.array(z.string().min(1)),
    }),
  }),
  sentimentAccuracy: z.object({
    results: z.array(SentimentResultSchema),
    summary: z.object({
      overallSentiment: SentimentEnum,
      averageAccuracy: z.number().min(0).max(1),
    }),
  }),
  comparison: z.object({
    results: z.array(ComparisonResultSchema),
    summary: z.object({
      winRate: z.number().min(0).max(1),
      keyDifferentiators: z.array(z.string().min(1)),
    }),
  }),
  llmVersions: z.record(z.string()),
  generatedAt: z.date(),
});

export type WeeklyBrandReportInput = z.infer<typeof WeeklyBrandReportSchema>;