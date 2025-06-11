import type {
  AlignmentResults,
  AlignmentSummary,
  DetailedAlignmentResult,
  AttributeAlignmentSummaryItem,
} from "@/types/alignment";

/**
 * Backend accuracy result types - properly typed versions of what we receive from the API
 */
interface AttributeAccuracyScore {
  attribute: string;
  score: number;
  evaluation: string;
}

interface Citation {
  url: string;
  title?: string;
  text?: string;
}

interface ToolUsage {
  type: string;
  input?: Record<string, unknown>;
  execution?: Record<string, unknown>;
}

interface AccuracyPipelineResult {
  model: string;
  promptIndex: number;
  attributeScores: AttributeAccuracyScore[];
  originalPrompt?: string;
  llmResponse?: string;
  error?: string;
  usedWebSearch?: boolean;
  citations?: Citation[];
  toolUsage?: ToolUsage[];
}

interface AccuracySummary {
  averageAttributeScores: Record<string, number>;
  overallAlignmentScore?: number;
  attributeAlignmentSummary?: AttributeAlignmentSummaryItem[];
}

interface AccuracyResults {
  results: AccuracyPipelineResult[];
  summary: AccuracySummary;
  webSearchSummary?: {
    usedWebSearch: boolean;
    webSearchCount: number;
    consultedWebsites: string[];
  };
}

/**
 * Calculates overall alignment score from attribute scores
 */
function calculateOverallScore(attributeScores: Record<string, number>): number {
  const scores = Object.values(attributeScores).filter(score => 
    typeof score === 'number' && !isNaN(score)
  );
  
  if (scores.length === 0) {
    return 0;
  }
  
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Converts a score (0-1) to a qualitative alignment indicator
 */
function scoreToAlignment(score: number): string {
  if (score >= 0.8) return "✅ High";
  if (score >= 0.6) return "⚠️ Medium"; 
  return "❌ Low";
}

/**
 * Calculates mention rate as a percentage
 */
function calculateMentionRate(
  attribute: string,
  results: AccuracyPipelineResult[]
): string {
  const totalResults = results.length;
  if (totalResults === 0) return "0%";
  
  const mentionCount = results.filter(result => 
    result.attributeScores?.some(score => score.attribute === attribute)
  ).length;
  
  const percentage = Math.round((mentionCount / totalResults) * 100);
  return `${percentage}%`;
}

/**
 * Creates attribute alignment summary from average scores
 */
function createAttributeAlignmentSummary(
  attributeScores: Record<string, number>,
  results: AccuracyPipelineResult[]
): AttributeAlignmentSummaryItem[] {
  return Object.entries(attributeScores).map(([attribute, averageScore]) => ({
    name: attribute,
    mentionRate: calculateMentionRate(attribute, results),
    alignment: scoreToAlignment(averageScore)
  }));
}

/**
 * Transforms backend accuracy results to frontend alignment format
 */
export function transformAccordToAlignment(
  batchResult: AccuracyResults
): AlignmentResults {
  if (!batchResult || typeof batchResult !== 'object') {
    throw new Error("Invalid batch result data");
  }

  if (!Array.isArray(batchResult.results)) {
    throw new Error("Batch result must contain a results array");
  }

  if (!batchResult.summary || typeof batchResult.summary !== 'object') {
    throw new Error("Batch result must contain a summary object");
  }

  const { summary: rawSummary, results } = batchResult;

  // Ensure averageAttributeScores is a valid object
  const averageAttributeScores = rawSummary.averageAttributeScores || {};
  
  // Calculate overall alignment score if not provided
  const overallAlignmentScore = rawSummary.overallAlignmentScore ?? 
    calculateOverallScore(averageAttributeScores);

  // Create attribute alignment summary if not provided
  const attributeAlignmentSummary = rawSummary.attributeAlignmentSummary ?? 
    createAttributeAlignmentSummary(averageAttributeScores, results);

  const summary: AlignmentSummary = {
    overallAlignmentScore,
    averageAttributeScores,
    attributeAlignmentSummary
  };

  // Transform detailed results with proper type safety
  const detailedResults: DetailedAlignmentResult[] = results.map(result => {
    console.log('Transforming alignment result:', {
      model: result.model,
      hasOriginalPrompt: !!result.originalPrompt,
      hasLlmResponse: !!result.llmResponse,
      hasCitations: !!(result.citations && result.citations.length > 0),
      hasToolUsage: !!(result.toolUsage && result.toolUsage.length > 0),
      originalPromptLength: result.originalPrompt?.length || 0,
      llmResponseLength: result.llmResponse?.length || 0
    });

    return {
      model: result.model,
      promptIndex: result.promptIndex,
      originalPrompt: result.originalPrompt && result.originalPrompt.trim() ? result.originalPrompt : undefined,
      llmResponse: result.llmResponse && result.llmResponse.trim() ? result.llmResponse : undefined,
      attributeScores: result.attributeScores || [],
      citations: result.citations && result.citations.length > 0 ? result.citations : undefined,
      toolUsage: result.toolUsage && result.toolUsage.length > 0 ? result.toolUsage : undefined,
      error: result.error
    };
  });

  console.log('Transformed alignment results:', {
    overallScore: summary.overallAlignmentScore,
    attributeCount: Object.keys(summary.averageAttributeScores).length,
    resultsCount: detailedResults.length
  });

  return {
    summary,
    detailedResults
  };
}