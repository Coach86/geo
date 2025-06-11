/**
 * Represents a single source citation.
 */
export interface SourceCitation {
  url: string;
  title?: string;
  text?: string; // Snippet of text that was cited
}

/**
 * Information about tool usage by the LLM (e.g., web search).
 */
export interface ToolUseInfo {
  type: string; // e.g., 'web_search', 'code_interpreter'
  parameters?: Record<string, any>; // e.g., { query: "search term" }
  execution_details?: {
    status: string; // e.g., 'success', 'failure'
    result?: any;
    error?: string;
  };
}

/**
 * Represents the score and evaluation for a specific attribute.
 */
export interface AttributeScore {
  attribute: string; // Name of the attribute (e.g., "Trustworthiness")
  score: number; // Numerical score (0-1)
  evaluation: string; // Textual evaluation or reasoning for the score
}

/**
 * Represents a single detailed result from an alignment test run.
 * This often corresponds to one model evaluating one prompt/query.
 */
export interface DetailedAlignmentResult {
  model: string; // Name of the LLM (e.g., "GPT-4")
  promptIndex?: number; // Optional, if multiple prompts are used per model
  originalPrompt?: string; // The prompt given to the LLM
  llmResponse?: string; // The raw response from the LLM
  attributeScores: AttributeScore[]; // Scores for various alignment attributes
  toolUsage?: ToolUseInfo[]; // Optional: Record of tools used (e.g., web searches)
  citations?: SourceCitation[]; // Optional: Citations provided by the LLM
  error?: string; // Optional: Any error encountered during this specific test run
}

/**
 * Summary of attribute alignment, typically for the accordion section.
 */
export interface AttributeAlignmentSummaryItem {
  name: string; // Attribute name
  mentionRate: string; // e.g., "90%" - how often it was mentioned or relevant
  alignment: string; // e.g., "✅", "High", "⚠️", "Medium", "❌", "Low" - qualitative alignment
}

/**
 * Overall summary of alignment results.
 */
export interface AlignmentSummary {
  overallAlignmentScore: number; // Overall score as percentage, e.g., 87 for 87%
  // Average scores for each attribute across all models/tests
  averageAttributeScores: Record<string, number>; // e.g., { "Trustworthiness": 0.9, "Transparency": 0.8 }
  // Data for the "Attribute Alignment" table in the accordion
  attributeAlignmentSummary: AttributeAlignmentSummaryItem[];
}

/**
 * The main structure for alignment results, combining summary and detailed breakdowns.
 */
export interface AlignmentResults {
  summary: AlignmentSummary;
  detailedResults: DetailedAlignmentResult[];
}
