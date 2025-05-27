import type {
  ComplianceResults,
  ComplianceSummary,
  DetailedComplianceResult,
  AttributeScore,
  AttributeAlignmentSummaryItem,
} from "@/types/compliance";

// Locally define AccuracyResults and AccuracyPipelineResult types (matching backend)
interface AttributeAccuracyScore {
  attribute: string;
  score: number;
  evaluation: string;
}

interface AccuracyPipelineResult {
  llmProvider: string;
  promptIndex: number;
  attributeScores: AttributeAccuracyScore[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  usedWebSearch?: boolean;
  citations?: any[];
  toolUsage?: any[];
  webSearchQueries?: any[];
}

interface AccuracyResults {
  results: AccuracyPipelineResult[];
  summary: {
    averageAttributeScores: Record<string, number>;
    [key: string]: unknown;
  };
  webSearchSummary?: unknown;
}

// Transform batch accuracy result to compliance format
export function transformAccordToCompliance(
  batchResult: AccuracyResults
): ComplianceResults {
  if (!batchResult) {
    throw new Error("No batch result data available");
  }

  // Use summary and results directly from batch result
  const summary: ComplianceSummary =
    batchResult.summary && typeof batchResult.summary === "object"
      ? {
          overallComplianceScore:
            (batchResult.summary as any).overallComplianceScore ?? 0,
          averageAttributeScores:
            (batchResult.summary as any).averageAttributeScores ?? {},
          attributeAlignmentSummary:
            (batchResult.summary as any).attributeAlignmentSummary ?? [],
        }
      : {
          overallComplianceScore: 0,
          averageAttributeScores: {},
          attributeAlignmentSummary: [],
        };

  // If the summary does not have overallComplianceScore, try to infer it from averageAttributeScores
  if (
    summary &&
    summary.averageAttributeScores &&
    (summary as any).overallComplianceScore === undefined
  ) {
    const scores = Object.values(summary.averageAttributeScores).map(Number);
    (summary as any).overallComplianceScore =
      scores.length > 0
        ? scores.reduce((a, b) => Number(a) + Number(b), 0) / scores.length
        : 0;
  }

  // Use detailed results from batch result
  const detailedResults: DetailedComplianceResult[] = Array.isArray(
    batchResult.results
  )
    ? batchResult.results.map((result) => ({
        llmProvider: result.llmProvider,
        promptIndex: result.promptIndex,
        originalPrompt: result.originalPrompt,
        llmResponse: result.llmResponse,
        attributeScores: result.attributeScores || [],
        citations: result.citations || [],
        toolUsage: result.toolUsage || [],
        error: result.error,
      }))
    : [];

  return { summary, detailedResults };
}
