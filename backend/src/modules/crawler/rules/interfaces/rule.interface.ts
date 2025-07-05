import { PageSignals } from '../../interfaces/page-signals.interface';
import { PageCategory } from '../../interfaces/page-category.interface';
import { LlmService } from '../../../llm/services/llm.service';
import { TrackedLLMService } from '../../services/tracked-llm.service';

// Legacy dimensions - replaced by AEO categories
export type RuleDimension = 'technical' | 'content' | 'authority' | 'quality';
export type RuleScope = 'all' | 'category' | 'domain';
export type RuleExecutionScope = 'page' | 'domain';

export interface RuleApplicability {
  scope: RuleScope;
  categories?: string[];
  domains?: string[];
}

export interface RuleContext {
  pageSignals: PageSignals;
  pageCategory: PageCategory;
  domain: string;
  url: string;
  html: string;
  cleanContent: string;
  metadata: any;
  projectContext: {
    brandName: string;
    keyBrandAttributes: string[];
    competitors: string[];
  };
  llmService?: LlmService; // Deprecated - use trackedLLMService
  trackedLLMService?: TrackedLLMService;
  llmResults?: any; // Optional LLM results for rules that need them
  
  // Domain-level context (for domain-scoped rules)
  domainContext?: {
    allPages: Array<{
      url: string;
      html: string;
      cleanContent: string;
      metadata: any;
      pageSignals: PageSignals;
      pageCategory: PageCategory;
    }>;
    domainInfo?: any; // Additional domain-level information
  };
}

export interface RuleIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

export interface RuleResult {
  score: number; // 0-100
  maxScore: number; // Maximum possible score for this rule
  weight: number; // Weight of this rule in the dimension
  contribution: number; // Actual contribution to dimension score
  passed: boolean;
  evidence: string[];
  details: Record<string, any>;
  issues?: RuleIssue[];
}

export interface ScoringRule {
  id: string;
  name: string;
  dimension: RuleDimension;
  description: string;
  
  // Applicability
  applicability: RuleApplicability;
  
  // Execution scope - determines if rule runs per-page or per-domain
  executionScope: RuleExecutionScope;
  
  // Execution
  priority: number; // Higher priority rules run first
  weight: number; // Default weight (can be overridden by config)
  
  // Configuration
  config?: Record<string, any>;
  
  // The actual rule logic
  evaluate(context: RuleContext): Promise<RuleResult>;
  
  // Check if rule applies to given context
  appliesTo(context: RuleContext): boolean;
}

export interface RuleConstructor {
  new(config?: Record<string, any>): ScoringRule;
}