/**
 * Centralized configuration for all scoring constants, weights, thresholds, and ratios
 * This file contains all hardcoded values used across different analyzers
 */

// ============================================
// SHARED CONSTANTS ACROSS MULTIPLE ANALYZERS
// ============================================

export const SCORING_CONSTANTS = {
  // Base scores used across analyzers
  BASE_SCORE: {
    DEFAULT: 20,
    MINIMAL: 0,
    LOW: 20,
    MEDIUM: 40,
    HIGH: 60,
    VERY_HIGH: 80,
    PERFECT: 100,
  },

  // Common text analysis thresholds
  TEXT_ANALYSIS: {
    MIN_PARAGRAPH_LENGTH: 20,
    MIN_SUBSTANTIAL_PARAGRAPH_LENGTH: 50,
    MIN_SENTENCE_LENGTH: 10,
    MIN_CONTENT_LENGTH: 500, // For early content checks
  },

  // Sentence word count thresholds (shared by Structure & Snippet)
  SENTENCE_WORDS: {
    OPTIMAL: 20,
    GOOD: 25,
    ACCEPTABLE: 30,
    POOR: 40,
  },

  // Common abbreviations for sentence splitting
  ABBREVIATIONS: [
    'Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Sr', 'Jr', 
    'Ph.D', 'M.D', 'B.A', 'M.A', 'B.S', 'M.S', 
    'i.e', 'e.g', 'etc', 'vs', 'Inc', 'Ltd', 'Co'
  ],
};

// ============================================
// AUTHORITY ANALYZER CONSTANTS
// ============================================

export const AUTHORITY_CONSTANTS = {
  // Score weights for sub-components
  WEIGHTS: {
    BASE: 0.2,
    AUTHOR_PRESENCE: 0.2,
    AUTHOR_CREDENTIALS: 0.2,
    CITATION_COUNT: 0.2,
    TRUSTED_CITATIONS: 0.2,
  },

  // Score values for each component
  SCORES: {
    BASE: 20,
    AUTHOR_PRESENT: 20,
    AUTHOR_CREDENTIALS: 20,
    CITATIONS_MET: 20,
    TRUSTED_CITATIONS_FULL: 20,
    TRUSTED_CITATIONS_PARTIAL: 10,
  },

  // Thresholds
  THRESHOLDS: {
    MIN_TRUSTED_CITATIONS_RATIO: 0.5, // Half of minOutboundCitations
    MIN_TRUSTED_CITATIONS: 1,
    CITATIONS_MAX_FOR_DISPLAY: 10, // Limit stored citations
  },

  // Domain authority scoring (for LLM-based analysis)
  DOMAIN_AUTHORITY_SCORES: {
    HIGH: 20,
    MEDIUM: 10,
    LOW: 0,
    UNKNOWN: 0,
  },

  // Citation calculation
  CITATION_MULTIPLIER: 10, // For calculation details
  CITATION_MAX_CONTRIBUTION: 20,
};

// ============================================
// FRESHNESS ANALYZER CONSTANTS
// ============================================

export const FRESHNESS_CONSTANTS = {
  // Score weights
  WEIGHTS: {
    DATE_SIGNALS_FOUND: 0.2,
    AGE_CATEGORY: 0.8,
  },

  // Future date tolerance (timezone differences)
  FUTURE_DATE_TOLERANCE_MS: 24 * 60 * 60 * 1000, // 1 day

  // Date validation
  DATE_VALIDATION: {
    MIN_YEAR: 2000,
    MAX_FUTURE_YEARS: 1, // Allow dates up to 1 year in future
  },

  // Score for no date signals
  NO_DATE_SCORE: 20,
  
  // Age thresholds for issues
  AGE_THRESHOLDS: {
    YEAR_OLD: 365,
    SIX_MONTHS: 180,
    THREE_MONTHS: 90,
  },
};

// ============================================
// STRUCTURE ANALYZER CONSTANTS
// ============================================

export const STRUCTURE_CONSTANTS = {
  // Score weights for sub-components
  WEIGHTS: {
    BASE: 0.2,
    H1_TAG: 0.2,
    HEADING_HIERARCHY: 0.2,
    SCHEMA_MARKUP: 0.3,
    READABILITY: 0.2,
  },

  // Score values
  SCORES: {
    BASE: 20,
    H1_SINGLE: 20,
    H1_MULTIPLE: 10, // Partial credit for multiple H1s
    HIERARCHY_VALID: 20,
    HIERARCHY_PARTIAL: 10,
    SCHEMA_PRESENT: 20,
    SCHEMA_COMPLETE_BONUS: 10,
    SCHEMA_PARTIAL: 10,
    READABILITY_MAX: 20,
  },

  // Heading hierarchy scoring
  HIERARCHY_SCORING: {
    H1_WEIGHT: 40,
    H2_WEIGHT: 30,
    H3_WEIGHT: 30,
  },

  // Readability score factor
  READABILITY_FACTOR: 0.2, // Converts threshold score to structure score
};

// ============================================
// SNIPPET ANALYZER CONSTANTS
// ============================================

export const SNIPPET_CONSTANTS = {
  // Score weights for sub-components
  WEIGHTS: {
    BASE: 0.2,
    SENTENCE_LENGTH: 0.2,
    LISTS: 0.2,
    QA_BLOCKS: 0.2,
    EXTRACTABLE_BLOCKS: 0.2,
    WALL_OF_TEXT_PENALTY: -0.2,
  },

  // Score values
  SCORES: {
    BASE: 20,
    SENTENCE_LENGTH_GOOD: 20,
    LISTS_PRESENT: 15,
    LISTS_MULTIPLE_BONUS: 5,
    QA_PRESENT: 15,
    QA_MULTIPLE_BONUS: 5,
    EXTRACTABLE_SUFFICIENT: 20,
    EXTRACTABLE_SOME: 10,
    WALL_OF_TEXT_PENALTY: 20,
  },

  // Thresholds
  THRESHOLDS: {
    MIN_LISTS_FOR_BONUS: 3,
    MIN_QA_FOR_BONUS: 3,
    MIN_EXTRACTABLE_BLOCKS: 2,
    
    // Wall of text detection
    LONG_PARAGRAPH_WORDS: 100,
    VERY_LONG_PARAGRAPH_WORDS: 200,
    WALL_OF_TEXT_RATIO: 0.4,
    WALL_OF_TEXT_AVG_WORDS: 80,
    WALL_OF_TEXT_MIN_PARAGRAPHS: 5,

    // Extractable blocks
    SHORT_PARAGRAPH_MIN_WORDS: 15,
    SHORT_PARAGRAPH_MAX_WORDS: 50,
    SHORT_PARAGRAPH_DIVISOR: 2, // Every 2 short paragraphs = 1 extractable
    DEFINITION_MAX_LENGTH: 200,
  },

  // Q&A patterns
  QA_PATTERNS: {
    QUESTION_STARTERS: /^(what|how|why|when|where|who|which|can|should|is|are|do|does)/i,
    QUESTION_MARK: /\?$/,
    MIN_ANSWER_LENGTH: 20,
  },

  // FAQ selectors
  FAQ_SELECTORS: ['.faq', '#faq', '.faqs', '.qa', '.question-answer'],
};

// ============================================
// BRAND ANALYZER CONSTANTS
// ============================================

export const BRAND_CONSTANTS = {
  // Score weights for sub-components
  WEIGHTS: {
    BRAND_MENTIONS: 0.4,
    CONSISTENCY: 0.3,
    REQUIRED_TERMS: 0.2,
    OUTDATED_TERMS_PENALTY: -0.1,
  },

  // Score values
  SCORES: {
    // Non-brand pages
    NON_BRAND_NO_MENTIONS: 20,
    NON_BRAND_FEW_MENTIONS: 60,
    NON_BRAND_GOOD_MENTIONS: 80,

    // Brand-relevant pages
    BRAND_PAGE_NO_MENTIONS: 20,
    BRAND_PAGE_FEW_MENTIONS: 40,
    BRAND_PAGE_GOOD_MENTIONS: 80,
    CONSISTENCY_BONUS: 20,

    // Penalties
    OUTDATED_TERMS_PENALTY: 20,
    MISSING_REQUIRED_PENALTY: 10,
    YEAR_REFERENCE_PENALTY: 10,
  },

  // Thresholds
  THRESHOLDS: {
    MIN_BRAND_MENTIONS_NON_BRAND: 2,
    MIN_BRAND_MENTIONS_BRAND_PAGE: 3,
    MIN_CONSISTENCY_FOR_PENALTY: 50,
    MIN_CONSISTENCY_FOR_BONUS: 80,
    OLD_YEAR_THRESHOLD: 2, // Years older than current - 2

    // Brand keyword density
    IDEAL_DENSITY_MIN: 1, // 1%
    IDEAL_DENSITY_MAX: 3, // 3%
    DENSITY_FALLBACK_MULTIPLIER: 100,
    DENSITY_OVEROPTIMIZATION_FACTOR: 10,
    MIN_DENSITY_SCORE: 50,
  },

  // Calculation details
  BRAND_MENTIONS_MAX: 10, // For display purposes
  OUTDATED_TERMS_MAX: 5, // For penalty calculation
  MISSING_KEYWORDS_PENALTY_EACH: 20,
  MISSING_KEYWORDS_CONTRIBUTION_EACH: 4,

  // Brand page indicators
  BRAND_PAGE_INDICATORS: [
    'about', 'features', 'pricing', 'product', 'service',
    'solution', 'case study', 'testimonial', 'customer',
    'success story', 'comparison', 'vs', 'alternative'
  ],

  // Year detection
  YEAR_CONTEXT_KEYWORDS: [
    'copyright', '©', '\\(c\\)', 'updated', 'modified',
    'published', 'since', 'in', 'from', 'year', 'dated?'
  ],
};

// ============================================
// HYBRID ANALYZER CONSTANTS
// ============================================

export const HYBRID_CONSTANTS = {
  // LLM configuration
  LLM: {
    MODEL: 'gpt-3.5-turbo-0125',
    TEMPERATURE: 0,
    MAX_TOKENS: 600,
    CONTENT_TRUNCATION_LENGTH: 2000,
  },

  // Domain authority caching
  DOMAIN_CACHE: {
    // No expiration - cache persists for session
  },

  // Perplexity configuration for domain research
  PERPLEXITY: {
    MODEL: 'llama-3.1-sonar-small-128k-online',
    TEMPERATURE: 0,
    MAX_TOKENS: 300,
  },

  // Static analysis scoring (simplified calculations)
  STATIC_SCORING: {
    // Structure scoring
    H1_SINGLE_SCORE: 25,
    H1_MULTIPLE_SCORE: 10,
    H2_PRESENT_SCORE: 15,
    H3_PRESENT_SCORE: 10,
    SCHEMA_PRESENT_SCORE: 25,
    READABILITY_OPTIMAL_SCORE: 25,
    READABILITY_GOOD_SCORE: 15,
    READABILITY_ACCEPTABLE_SCORE: 10,

    // Snippet scoring
    LISTS_MANY_SCORE: 30,
    LISTS_SOME_SCORE: 20,
    QA_MANY_SCORE: 25,
    QA_SOME_SCORE: 15,
    PARAGRAPHS_SHORT_SCORE: 25,
    PARAGRAPHS_MEDIUM_SCORE: 15,
    TABLES_PRESENT_SCORE: 20,

    // Thresholds
    LISTS_MANY_THRESHOLD: 3,
    LISTS_SOME_THRESHOLD: 1,
    QA_MANY_THRESHOLD: 3,
    QA_SOME_THRESHOLD: 1,
    PARAGRAPH_SHORT_THRESHOLD: 50,
    PARAGRAPH_MEDIUM_THRESHOLD: 100,
  },

  // Fallback scores
  FALLBACK_SCORES: {
    AUTHORITY: 50,
    BRAND: 50,
  },

  // Response parsing
  MAX_RESPONSE_PREVIEW_LENGTH: 500,
};

// ============================================
// CONTENT SCORE SCHEMA CONSTANTS
// ============================================

export const CONTENT_SCORE_CONSTANTS = {
  // Global score calculation version
  SCORING_VERSION: '3.0.0-hybrid',
  
  // Analysis types
  ANALYSIS_TYPES: {
    UNIFIED: 'unified',
    HYBRID: 'hybrid',
  },
};