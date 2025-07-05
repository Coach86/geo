import { PageSignals } from './page-signals.interface';
import { PageCategory } from './page-category.interface';

export type Category = 'TECHNICAL' | 'STRUCTURE' | 'AUTHORITY' | 'QUALITY';
export type ApplicationLevel = 'Page' | 'Domain' | 'Off-Site';
export type SEOLLMType = 'SEO' | 'SEO adapted to LLM' | 'LLM';
export type ImpactLevel = 'High' | 'Medium' | 'Low';

export interface PageApplicability {
  // Tier 1 pages
  homepage: boolean;
  product_category_page: boolean; // PLP
  product_detail_page: boolean; // PDP
  services_features_page: boolean;
  pricing: boolean;
  comparison_page: boolean;
  blog_article: boolean;
  blog_category_tag_page: boolean;
  
  // Tier 2 pages
  pillar_page_topic_hub: boolean;
  product_roundup_review: boolean;
  how_to_guide_tutorial: boolean;
  case_study: boolean;
  what_is_x_definitional: boolean;
  in_depth_guide_white_paper: boolean;
  faq: boolean;
  glossary_page: boolean;
  public_forum_ugc: boolean;
  
  // Tier 3 pages
  about_company: boolean;
  team_page: boolean;
  contact: boolean;
  careers_page: boolean;
  press_media_room: boolean;
  store_locator: boolean;
  login_account: boolean;
  user_profile_dashboard: boolean;
  order_history: boolean;
  wishlist: boolean;
  search_results: boolean;
  error_404: boolean;
  privacy_policy: boolean;
  terms_of_service: boolean;
  cookie_policy: boolean;
  accessibility_statement: boolean;
  
  // Special applicability
  domainLevel: boolean;
  offSiteLevel: boolean;
}

export interface ScoreThreshold {
  min: number;
  max: number;
  score: number;
  description: string;
}

export interface ScoringFormula {
  thresholds: ScoreThreshold[];
}

export interface RuleIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

export type EvidenceType = 
  | 'info'      // General information (default)
  | 'success'   // Success/passing items (✓)
  | 'warning'   // Warnings or minor issues (⚠)
  | 'error'     // Errors or failures (✗)
  | 'score'     // Score calculations
  | 'heading'   // Section headers
  | 'base'      // Base score evidence

export interface EvidenceItem {
  type: EvidenceType;
  topic: string; // Topic/category for the evidence (e.g., "Semantic HTML5 Tags", "Content Ratio")
  content: string;
  target?: string; // Optional target value to display aligned right
  code?: string; // Optional code snippet to display below
  score?: number; // Optional score value for this evidence item
  maxScore?: number; // Optional maximum possible score for this evidence item
  metadata?: Record<string, any>; // Optional metadata for special rendering
}

export interface AIUsage {
  modelName: string;
  prompt: string;
  response: string;
}

export interface RuleResultFromRule {
  ruleId: string;
  ruleName: string;
  score: number;
  maxScore: number;
  weight: number;
  contribution: number;
  passed: boolean;
  evidence: EvidenceItem[]; // CRITICAL: Must always be populated with structured evidence
  details: Record<string, any>;
  issues?: RuleIssue[];
  aiUsage?: AIUsage; // Detailed AI/LLM usage information when AI was used
}

export interface Rule {
  id: string;
  name: string;
  category: Category;
  criteria: string;
  element: string;
  applicationLevel: ApplicationLevel;
  scoringFormula: ScoringFormula;
  seoLlmType: SEOLLMType;
  impact: ImpactLevel;
  impactScore: number; // 1-3
  implementationScore: number; // 0-3
  tool?: string;
  importance: string;
  checklist: string[];
  issueMessage: string;
  recommendationMessage: string;
  pageApplicability: PageApplicability;
  
  // Method to analyze content and return results
  analyze(content: PageContent): Promise<RuleResultFromRule>;
}

export interface PageContent {
  url: string;
  html: string;
  cleanContent: string;
  pageSignals: PageSignals;
  pageCategory: PageCategory;
  pageType?: string;
  metadata: any;
  securityInfo?: {
    isHttps: boolean;
    hasMixedContent: boolean;
    certificateValid: boolean;
    sslDetails?: {
      expiryDate?: string;
      error?: string;
      mixedContentCount?: number;
    };
  };
  performanceMetrics?: {
    loadTime?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
  };
  structuralElements?: {
    h1Count: number;
    h1Text?: string[];
    semanticTags: string[];
    schemaTypes: string[];
  };
}

export interface CategoryScore {
  category: Category;
  score: number;
  weight: number;
  appliedRules: number;
  passedRules: number;
  ruleResults: RuleResult[];
  issues: string[];
  recommendations: Recommendation[];
}

export interface RuleIssue {
  id?: string; // Unique identifier for the issue
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  dimension?: 'technical' | 'structure' | 'authority' | 'quality';
  affectedElements?: string[];
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  category?: 'technical' | 'structure' | 'authority' | 'quality'; // Rule category
  score: number;
  maxScore: number;
  weight: number;
  contribution: number;
  passed: boolean;
  evidence: EvidenceItem[];
  recommendations?: string[]; // Array of recommendations for improving the score
  details?: Record<string, any>;
  issues?: RuleIssue[];
  aiUsage?: AIUsage; // Detailed AI/LLM usage information when AI was used
}

export interface Recommendation {
  content: string;
  ruleId: string;
  ruleCategory: string;
}

export interface Score {
  url: string;
  pageType: string;
  timestamp: Date;
  categoryScores: {
    technical: CategoryScore;
    structure: CategoryScore;
    authority: CategoryScore;
    quality: CategoryScore;
  };
  globalScore: number;
  totalIssues: number;
  criticalIssues: number;
}