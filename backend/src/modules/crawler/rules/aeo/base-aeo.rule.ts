import { 
  Category, 
  RuleResult, 
  PageContent,
  RuleIssue,
  EvidenceItem,
  AIUsage 
} from '../../interfaces/rule.interface';
import { EvidenceHelper } from '../../utils/evidence.helper';

export interface AEORuleConfig {
  impactScore: number;
  pageTypes: string[];
  isDomainLevel: boolean;
}

export abstract class BaseAEORule {
  public readonly id: string;
  public readonly name: string;
  public readonly category: Category;
  public readonly impactScore: number;
  public readonly pageTypes: string[];
  public readonly isDomainLevel: boolean;
  public readonly applicationLevel: 'Page' | 'Domain';

  constructor(
    id: string,
    name: string,
    category: Category,
    config: AEORuleConfig
  ) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.impactScore = config.impactScore;
    this.pageTypes = config.pageTypes;
    this.isDomainLevel = config.isDomainLevel;
    this.applicationLevel = config.isDomainLevel ? 'Domain' : 'Page';
  }

  abstract evaluate(url: string, content: PageContent): Promise<RuleResult>;

  // Helper to create a result object
  protected createResult(
    score: number,
    evidence: EvidenceItem[],
    issues?: RuleIssue[],
    details?: Record<string, any>,
    recommendations?: string[],
    aiUsage?: AIUsage
  ): RuleResult {
    const maxScore = 100; // Always use 100 scale for AEO rules
    const weight = this.getWeight();
    
    return {
      ruleId: this.id,
      ruleName: this.name,
      score,
      maxScore,
      weight,
      contribution: (score / maxScore) * weight,
      passed: score >= 60, // Consider >=60 as passing
      evidence,
      recommendations,
      details: details || {},
      issues,
      aiUsage
    };
  }


  // Get weight based on impact score
  public getWeight(): number {
    // Map impact score (1-3) to weight
    const weightMap: Record<number, number> = {
      1: 0.5,  // Low impact
      2: 1.0,  // Medium impact
      3: 1.5   // High impact
    };
    return weightMap[this.impactScore] || 1.0;
  }

  // Check if rule applies to a specific page type
  isApplicableToPageType(pageType: string): boolean {
    // Domain-level rules apply to all page types
    if (this.isDomainLevel) {
      return true;
    }
    
    // If pageTypes is empty, treat as "applies to all page types"
    if (this.pageTypes.length === 0) {
      return true;
    }
    
    // Otherwise, check if the page type is in the allowed list
    return this.pageTypes.includes(pageType);
  }
}