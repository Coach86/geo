import { 
  CategoryDetectionRule, 
  PageCategoryType, 
  AnalysisLevel,
  DimensionWeights 
} from '../interfaces/page-category.interface';

export const CATEGORY_DETECTION_RULES: CategoryDetectionRule[] = [
  // Homepage - Highest priority
  {
    category: PageCategoryType.HOMEPAGE,
    analysisLevel: AnalysisLevel.FULL,
    priority: 100,
    patterns: {
      urlPatterns: [/^\/$/],
      metaPatterns: [/company overview/i, /welcome to/i],
      domSelectors: ['.hero-section', '.homepage-hero']
    },
    weightModifiers: {
      brandAlignment: 1.5
    }
  },

  // Error Pages - High priority to exclude early
  {
    category: PageCategoryType.ERROR_404,
    analysisLevel: AnalysisLevel.EXCLUDED,
    priority: 95,
    patterns: {
      urlPatterns: [/\/404/, /\/error/],
      contentPatterns: [/page not found/i, /404 error/i, /sorry.*can't find/i]
    }
  },

  // Login/Account Pages - Exclude
  {
    category: PageCategoryType.LOGIN_ACCOUNT,
    analysisLevel: AnalysisLevel.EXCLUDED,
    priority: 90,
    patterns: {
      urlPatterns: [/\/login/, /\/signin/, /\/signup/, /\/register/, /\/account/, /\/dashboard/, /\/admin/],
      domSelectors: ['form[action*="login"]', 'input[type="password"]'],
      metaPatterns: [/noindex/i]
    }
  },

  // Legal/Policy Pages - Exclude
  {
    category: PageCategoryType.LEGAL_POLICY,
    analysisLevel: AnalysisLevel.EXCLUDED,
    priority: 85,
    patterns: {
      urlPatterns: [/\/terms/, /\/privacy/, /\/legal/, /\/policy/, /\/disclaimer/, /\/tos/, /\/gdpr/],
      contentPatterns: [/terms of service/i, /privacy policy/i, /legal disclaimer/i]
    }
  },

  // Contact Pages - Exclude
  {
    category: PageCategoryType.CONTACT,
    analysisLevel: AnalysisLevel.EXCLUDED,
    priority: 80,
    patterns: {
      urlPatterns: [/\/contact/, /\/get-in-touch/],
      schemaTypes: ['ContactPage'],
      domSelectors: ['form.contact-form', 'input[name="email"]']
    }
  },

  // Search Results - Exclude
  {
    category: PageCategoryType.SEARCH_RESULTS,
    analysisLevel: AnalysisLevel.EXCLUDED,
    priority: 75,
    patterns: {
      urlPatterns: [/\/search/, /[?&]q=/, /[?&]query=/, /[?&]s=/],
      contentPatterns: [/search results for/i, /results? found/i]
    }
  },

  // Documentation/Help - Full analysis
  {
    category: PageCategoryType.DOCUMENTATION_HELP,
    analysisLevel: AnalysisLevel.FULL,
    priority: 70,
    patterns: {
      urlPatterns: [/\/docs/, /\/documentation/, /\/help/, /\/support/, /\/guide/, /\/tutorial/, /\/how-to/],
      schemaTypes: ['HowTo', 'TechArticle'],
      contentPatterns: [/step \d+/i, /how to/i, /getting started/i]
    },
    weightModifiers: {
      snippetExtractability: 1.5,
      authority: 0.7
    }
  },

  // FAQ Pages - Full analysis
  {
    category: PageCategoryType.FAQ,
    analysisLevel: AnalysisLevel.FULL,
    priority: 65,
    patterns: {
      urlPatterns: [/\/faq/, /\/faqs/, /\/questions/],
      schemaTypes: ['FAQPage'],
      contentPatterns: [/frequently asked/i, /common questions/i],
      domSelectors: ['.faq-item', '.question-answer', 'dl.faq']
    },
    weightModifiers: {
      snippetExtractability: 2.0
    }
  },

  // Blog/Article - Full analysis
  {
    category: PageCategoryType.BLOG_ARTICLE,
    analysisLevel: AnalysisLevel.FULL,
    priority: 60,
    patterns: {
      urlPatterns: [/\/blog/, /\/article/, /\/post/, /\/news/, /\/insights/],
      schemaTypes: ['Article', 'BlogPosting', 'NewsArticle'],
      metaPatterns: [/article:published_time/i],
      domSelectors: ['.author', '.publish-date', '.article-content']
    },
    weightModifiers: {
      authority: 1.5,
      freshness: 1.2
    }
  },

  // Product/Service Pages - Full analysis
  {
    category: PageCategoryType.PRODUCT_SERVICE,
    analysisLevel: AnalysisLevel.FULL,
    priority: 55,
    patterns: {
      urlPatterns: [/\/product/, /\/service/, /\/solution/, /\/feature/, /\/offering/],
      schemaTypes: ['Product', 'Service', 'SoftwareApplication'],
      contentPatterns: [/features/i, /benefits/i, /pricing/i, /buy now/i]
    },
    weightModifiers: {
      brandAlignment: 1.3,
      snippetExtractability: 1.2
    }
  },

  // Case Study - Full analysis
  {
    category: PageCategoryType.CASE_STUDY,
    analysisLevel: AnalysisLevel.FULL,
    priority: 50,
    patterns: {
      urlPatterns: [/\/case-study/, /\/success-story/, /\/customer/, /\/testimonial/],
      schemaTypes: ['Review', 'Testimonial'],
      contentPatterns: [/results/i, /achieved/i, /success/i, /testimonial/i]
    },
    weightModifiers: {
      authority: 1.3,
      brandAlignment: 1.2
    }
  },

  // Landing/Campaign Pages - Full analysis
  {
    category: PageCategoryType.LANDING_CAMPAIGN,
    analysisLevel: AnalysisLevel.FULL,
    priority: 45,
    patterns: {
      urlPatterns: [/\/lp\//, /\/campaign/, /[?&]utm_/],
      contentPatterns: [/limited time/i, /special offer/i, /get started/i],
      domSelectors: ['.cta-button', '.hero-cta', 'form.lead-capture']
    }
  },

  // Pricing Pages - Partial analysis
  {
    category: PageCategoryType.PRICING,
    analysisLevel: AnalysisLevel.PARTIAL,
    priority: 40,
    patterns: {
      urlPatterns: [/\/pricing/, /\/plans/, /\/packages/, /\/subscribe/],
      schemaTypes: ['Offer', 'PriceSpecification'],
      contentPatterns: [/\$\d+/, /per month/i, /annual/i, /free trial/i],
      domSelectors: ['.pricing-table', '.price-card', '.plan-comparison']
    },
    weightModifiers: {
      freshness: 0.5,
      authority: 0.5,
      structure: 1.0,
      snippetExtractability: 0.5,
      brandAlignment: 2.0
    }
  },

  // About/Company Pages - Partial analysis
  {
    category: PageCategoryType.ABOUT_COMPANY,
    analysisLevel: AnalysisLevel.PARTIAL,
    priority: 35,
    patterns: {
      urlPatterns: [/\/about/, /\/company/, /\/team/, /\/mission/, /\/values/, /\/history/],
      schemaTypes: ['AboutPage', 'Organization'],
      contentPatterns: [/founded in/i, /our mission/i, /our team/i, /our story/i]
    },
    weightModifiers: {
      freshness: 0.5,
      authority: 0.5,
      brandAlignment: 2.0
    }
  },

  // Navigation/Category Pages - Limited analysis
  {
    category: PageCategoryType.NAVIGATION_CATEGORY,
    analysisLevel: AnalysisLevel.LIMITED,
    priority: 20,
    patterns: {
      urlPatterns: [/\/category/, /\/categories/, /\/topics/, /[?&]page=\d+/],
      contentPatterns: [/showing \d+ of \d+/i, /page \d+ of/i],
      domSelectors: ['.pagination', '.category-list', 'nav.breadcrumb']
    }
  }
];

// Helper function to get analysis level for a category
export function getAnalysisLevel(category: PageCategoryType): AnalysisLevel {
  const rule = CATEGORY_DETECTION_RULES.find(r => r.category === category);
  return rule?.analysisLevel || AnalysisLevel.FULL;
}

// Helper function to get weight modifiers for a category
export function getCategoryWeightModifiers(category: PageCategoryType): DimensionWeights | undefined {
  const rule = CATEGORY_DETECTION_RULES.find(r => r.category === category);
  return rule?.weightModifiers;
}