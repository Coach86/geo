export enum PageCategoryType {
  // Tier 1: Core Business & High-Impact Pages
  HOMEPAGE = 'homepage',
  PRODUCT_CATEGORY_PAGE = 'product_category_page', // PLP
  PRODUCT_DETAIL_PAGE = 'product_detail_page', // PDP
  SERVICES_FEATURES_PAGE = 'services_features_page',
  PRICING_PAGE = 'pricing_page',
  COMPARISON_PAGE = 'comparison_page',
  BLOG_POST_ARTICLE = 'blog_post_article',
  BLOG_CATEGORY_TAG_PAGE = 'blog_category_tag_page',
  
  // Tier 2: Strategic Content & Resources
  PILLAR_PAGE_TOPIC_HUB = 'pillar_page_topic_hub',
  PRODUCT_ROUNDUP_REVIEW_ARTICLE = 'product_roundup_review_article',
  HOW_TO_GUIDE_TUTORIAL = 'how_to_guide_tutorial',
  CASE_STUDY_SUCCESS_STORY = 'case_study_success_story',
  WHAT_IS_X_DEFINITIONAL_PAGE = 'what_is_x_definitional_page',
  IN_DEPTH_GUIDE_WHITE_PAPER = 'in_depth_guide_white_paper',
  FAQ_GLOSSARY_PAGES = 'faq_glossary_pages',
  PUBLIC_FORUM_UGC_PAGES = 'public_forum_ugc_pages',
  
  // Tier 3: Supporting Page Groups
  CORPORATE_CONTACT_PAGES = 'corporate_contact_pages', // About Us, Team Page, Contact Us, Careers, Press/Media Room, Store Locator
  PRIVATE_USER_ACCOUNT_PAGES = 'private_user_account_pages', // Login/Sign-up, User Profile/Dashboard, Order History, Wishlist
  SEARCH_RESULTS_ERROR_PAGES = 'search_results_error_pages', // Search Results Page, 404 Error Page  
  LEGAL_PAGES = 'legal_pages', // Privacy Policy, Terms of Service, Cookie Policy, Accessibility Statement
  
  UNKNOWN = 'unknown'
}

export enum AnalysisLevel {
  FULL = 'full',
  PARTIAL = 'partial',
  LIMITED = 'limited',
  EXCLUDED = 'excluded'
}

export interface PageCategory {
  type: PageCategoryType;
  confidence: number;
  analysisLevel: AnalysisLevel;
  reason?: string;
}