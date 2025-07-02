export interface ScoringThreshold {
  min: number;
  max?: number;
  score: number;
  description: string;
}

export interface ScoringDimension {
  name: string;
  weight: number;
  description: string;
  thresholds: ScoringThreshold[];
  criteria: Record<string, unknown>;
}

export interface AuthorityCriteria {
  authorRequired: boolean;
  minOutboundCitations: number;
  trustedDomains: string[];
  authorCredentialKeywords: string[];
}

export interface FreshnessCriteria {
  dateSignalRequired: boolean;
  dayRanges: Array<{
    maxDays: number;
    score: number;
  }>;
}

export interface StructureCriteria {
  requireSingleH1: boolean;
  requireSchema: boolean;
  schemaTypes: string[];
  maxAvgSentenceWords: number;
  sentenceWordThresholds: Array<{
    maxWords: number;
    score: number;
  }>;
}


export interface BrandCriteria {
  brandKeywords: string[];
  requiredTerms: string[];
  outdatedTerms: string[];
  currentYear: number;
}

export interface ScoringRulesConfig {
  dimensions: {
    authority: ScoringDimension & { criteria: AuthorityCriteria };
    freshness: ScoringDimension & { criteria: FreshnessCriteria };
    structure: ScoringDimension & { criteria: StructureCriteria };
    brand: ScoringDimension & { criteria: BrandCriteria };
  };
  globalScoreFormula: {
    weights: {
      freshness: number;
      structure: number;
      authority: number;
      brand: number;
    };
  };
}