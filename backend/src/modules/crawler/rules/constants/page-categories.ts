/**
 * Page category constants for rule applicability
 * These match the PageCategoryType enum values
 */
export const PAGE_CATEGORIES = {
  HOMEPAGE: 'homepage',
  PRODUCT_SERVICE: 'product_service',
  BLOG_ARTICLE: 'blog_article',
  DOCUMENTATION_HELP: 'documentation_help',
  ABOUT_COMPANY: 'about_company',
  CONTACT: 'contact',
  LEGAL_POLICY: 'legal_policy',
  NAVIGATION_CATEGORY: 'navigation_category',
  LANDING_CAMPAIGN: 'landing_campaign',
  FAQ: 'faq',
  CASE_STUDY: 'case_study',
  PRICING: 'pricing',
  ERROR_404: 'error_404',
  LOGIN_ACCOUNT: 'login_account',
  SEARCH_RESULTS: 'search_results',
  UNKNOWN: 'unknown'
} as const;

export type PageCategoryValue = typeof PAGE_CATEGORIES[keyof typeof PAGE_CATEGORIES];