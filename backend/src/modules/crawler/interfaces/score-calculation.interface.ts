/**
 * Interfaces for detailed score calculation transparency
 */

export interface SubScore {
  name: string;
  value: number;
  weight: number;
  maxValue: number;
  contribution: number; // Actual points contributed to final score
  evidence?: string | string[]; // Actual values found during analysis
}

export interface ScoreCalculationDetails {
  formula: string;
  subScores: SubScore[];
  finalScore: number;
  explanation: string;
}

export interface DimensionCalculationDetails {
  authority?: ScoreCalculationDetails;
  freshness?: ScoreCalculationDetails;
  structure?: ScoreCalculationDetails;
  brandAlignment?: ScoreCalculationDetails;
}

// Extended result interfaces for analyzers
export interface AuthorityAnalysisResultWithCalc {
  score: number;
  hasAuthor: boolean;
  authorCredentials: string[];
  outboundCitations: number;
  trustedCitations: string[];
  issues: any[];
  calculationDetails: ScoreCalculationDetails;
}

export interface FreshnessAnalysisResultWithCalc {
  score: number;
  publishDate?: Date;
  modifiedDate?: Date;
  daysSinceUpdate?: number;
  hasDateSignals: boolean;
  issues: any[];
  calculationDetails: ScoreCalculationDetails;
}

export interface StructureAnalysisResultWithCalc {
  score: number;
  h1Count: number;
  headingHierarchy: boolean;
  headingHierarchyScore: number;
  schemaTypes: string[];
  avgSentenceWords: number;
  issues: any[];
  calculationDetails: ScoreCalculationDetails;
}


export interface BrandAnalysisResultWithCalc {
  score: number;
  brandKeywordMatches: number;
  requiredTermsFound: string[];
  outdatedTermsFound: string[];
  brandConsistency: number;
  issues: any[];
  calculationDetails: ScoreCalculationDetails;
}