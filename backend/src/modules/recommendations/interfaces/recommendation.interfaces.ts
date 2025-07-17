export enum RecommendationType {
  ENTITY_GAP = 'entity_gap',
  FEATURE_GAP = 'feature_gap',
  CONTENT_PRESENCE = 'content_presence',
  LOCALIZATION = 'localization',
  COMPETITIVE_POSITIONING = 'competitive_positioning',
  SENTIMENT_IMPROVEMENT = 'sentiment_improvement',
}

export enum RecommendationPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum RecommendationStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DISMISSED = 'dismissed',
  IMPLEMENTED = 'implemented',
}

export enum ImplementationDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export interface RecommendationCandidate {
  type: RecommendationType;
  title: string;
  description: string;
  evidence: Evidence[];
  confidenceScore: number;
  impactScore: number;
  suggestedActions: string[];
  methodology: string;
}

export interface Evidence {
  id: string;
  type: 'visibility_data' | 'sentiment_data' | 'alignment_data' | 'competition_data' | 'citation_analysis';
  source: string;
  dataPoints: DataPoint[];
  supportingQuotes: string[];
  statisticalSignificance: number;
  collectedAt: Date;
}

export interface DataPoint {
  metric: string;
  value: string | number | boolean | Record<string, unknown>;
  context: string;
}

export interface RecommendationMetadata {
  analyzedAt: Date;
  batchExecutionId: string;
  modelsUsed: string[];
  promptsAnalyzed: number;
  confidenceThreshold: number;
}