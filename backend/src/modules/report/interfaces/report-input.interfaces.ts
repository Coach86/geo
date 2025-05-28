/**
 * Shared interfaces for batch-to-report data flow
 */

// Import the batch result interfaces so we can reference them
import {
  SpontaneousResults,
  SentimentResults,
  ComparisonResults,
  AccuracyResults,
  BrandBattleResults,
} from '../../batch/interfaces/batch.interfaces';

/**
 * Input format for creating/updating a report from batch results
 * This interface defines the expected structure that the batch module
 * should provide to the report module when saving a new report.
 */
export interface BatchReportInput {
  /** Company identifier */
  companyId: string;

  /** Start of the week (Monday 00:00:00 UTC) */
  date: Date;

  /** Spontaneous mention results from the spontaneous pipeline */
  spontaneous?: SpontaneousResults;

  /** Sentiment analysis results from the sentiment pipeline */
  sentiment?: SentimentResults;

  /** Accuracy analysis results from the accuracy pipeline */
  accord?: AccuracyResults;

  /** Comparison results from the comparison pipeline */
  comparison?: ComparisonResults;

  /** Brand Battle results from the brand battle pipeline */
  brandBattle?: BrandBattleResults;

  /** Model identifiers for each LLM used in batch processing */
  llmVersions: Record<string, string>;

  /** When the report data was generated */
  generatedAt: Date;

  /** Batch execution ID that generated this report */
  batchExecutionId?: string;
}
