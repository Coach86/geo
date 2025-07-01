import { RuleResult } from './rule.interface';

export interface AggregatedScore {
  dimension: string;
  finalScore: number;
  maxPossibleScore: number;
  ruleResults: RuleResult[];
  evidence: string[];
  issues: Array<{
    ruleId: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
  calculationDetails: {
    formula: string;
    subScores: Array<{
      ruleId: string;
      name: string;
      value: number;
      weight: number;
      maxValue: number;
      contribution: number;
      evidence?: string[];
    }>;
    explanation: string;
  };
}