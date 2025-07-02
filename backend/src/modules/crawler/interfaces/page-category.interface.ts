export enum PageCategoryType {
  HOMEPAGE = 'homepage',
  PRODUCT_SERVICE = 'product_service',
  BLOG_ARTICLE = 'blog_article',
  DOCUMENTATION_HELP = 'documentation_help',
  ABOUT_COMPANY = 'about_company',
  CONTACT = 'contact',
  LEGAL_POLICY = 'legal_policy',
  NAVIGATION_CATEGORY = 'navigation_category',
  LANDING_CAMPAIGN = 'landing_campaign',
  FAQ = 'faq',
  CASE_STUDY = 'case_study',
  PRICING = 'pricing',
  ERROR_404 = 'error_404',
  LOGIN_ACCOUNT = 'login_account',
  SEARCH_RESULTS = 'search_results',
  UNKNOWN = 'unknown'
}

export enum AnalysisLevel {
  FULL = 'full',
  PARTIAL = 'partial',
  LIMITED = 'limited',
  EXCLUDED = 'excluded'
}

export interface DimensionWeights {
  freshness?: number;
  structure?: number;
  authority?: number;
  brandAlignment?: number;
}

export interface PageCategory {
  type: PageCategoryType;
  confidence: number;
  analysisLevel: AnalysisLevel;
  weightModifiers?: DimensionWeights;
  reason?: string;
}

export interface CategoryPattern {
  urlPatterns?: RegExp[];
  schemaTypes?: string[];
  metaPatterns?: RegExp[];
  contentPatterns?: RegExp[];
  domSelectors?: string[];
}

export interface CategoryDetectionRule {
  category: PageCategoryType;
  analysisLevel: AnalysisLevel;
  patterns: CategoryPattern;
  priority: number;
  weightModifiers?: DimensionWeights;
}