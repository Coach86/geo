import { ScoringRulesConfig } from '../interfaces/scoring-rules.interface';

export const DEFAULT_SCORING_RULES: ScoringRulesConfig = {
  dimensions: {
    authority: {
      name: 'Authority & Evidence',
      weight: 1.0,
      description: 'Evaluates credibility signals like author bylines and outbound citations',
      thresholds: [
        { min: 0, max: 20, score: 20, description: 'No authority signals' },
        { min: 21, max: 40, score: 40, description: 'Little trust; generic links; vague author' },
        { min: 41, max: 60, score: 60, description: 'Moderate authority (niche site) or 1 credible citation' },
        { min: 61, max: 80, score: 80, description: 'Any two of the above' },
        { min: 81, max: 100, score: 100, description: 'High-authority domain, strong credentials and ≥ 2 reputable citations' },
      ],
      criteria: {
        authorRequired: true,
        minOutboundCitations: 2,
        trustedDomains: [
          'wikipedia.org',
          'gov',
          'edu',
          'ieee.org',
          'acm.org',
          'nature.com',
          'sciencedirect.com',
          'pubmed.ncbi.nlm.nih.gov',
          'arxiv.org',
          'springer.com',
          'wiley.com',
        ],
        authorCredentialKeywords: [
          'PhD',
          'Dr.',
          'Professor',
          'Expert',
          'Specialist',
          'Certified',
          'Licensed',
          'Author',
          'Contributor',
          'Editor',
        ],
      },
    },
    freshness: {
      name: 'Freshness',
      weight: 2.5,
      description: 'How recently content was updated',
      thresholds: [
        { min: 0, max: 20, score: 20, description: 'No date signals' },
        { min: 21, max: 40, score: 40, description: '> 365 days' },
        { min: 41, max: 60, score: 60, description: '181-365 days' },
        { min: 61, max: 80, score: 80, description: '91-180 days' },
        { min: 81, max: 100, score: 100, description: '≤ 90 days' },
      ],
      criteria: {
        dateSignalRequired: true,
        dayRanges: [
          { maxDays: 90, score: 100 },
          { maxDays: 180, score: 80 },
          { maxDays: 365, score: 60 },
          { maxDays: Infinity, score: 40 },
        ],
      },
    },
    structure: {
      name: 'Structure / Schema / Readability',
      weight: 1.5,
      description: 'Clarity of hierarchy and schema markup',
      thresholds: [
        { min: 0, max: 20, score: 20, description: 'No meaningful structure or schema' },
        { min: 21, max: 40, score: 40, description: 'Multiple <h1> or messy HTML, minimal schema; avg > 30 words' },
        { min: 41, max: 60, score: 60, description: 'Some hierarchy issues or only basic schema; avg ≤ 30 words' },
        { min: 61, max: 80, score: 80, description: 'Minor heading gaps or partial schema; avg ≤ 25 words' },
        { min: 81, max: 100, score: 100, description: 'Perfect hierarchy and full Article schema with all properties; avg ≤ 20 words' },
      ],
      criteria: {
        requireSingleH1: true,
        requireSchema: true,
        schemaTypes: ['Article', 'BlogPosting', 'NewsArticle', 'FAQPage', 'HowTo', 'Recipe', 'Review'],
        maxAvgSentenceWords: 20,
        sentenceWordThresholds: [
          { maxWords: 20, score: 100 },
          { maxWords: 25, score: 80 },
          { maxWords: 30, score: 60 },
          { maxWords: Infinity, score: 40 },
        ],
      },
    },
    snippet: {
      name: 'Snippet Extractability',
      weight: 1.0,
      description: 'How easily AI can extract concise, answer-ready content',
      thresholds: [
        { min: 0, max: 20, score: 20, description: 'Wall of text; no lists, headings, or question patterns' },
        { min: 21, max: 40, score: 40, description: 'Long paragraphs with few lists/Q&A; no obvious snippet targets' },
        { min: 41, max: 60, score: 60, description: 'Some lists or short Q&A lines, but large narrative chunks still dominate' },
        { min: 61, max: 80, score: 80, description: 'At least one strong extractable block plus good list/heading structure; minor issues' },
        { min: 81, max: 100, score: 100, description: 'Multiple direct-answer blocks and most key facts in ≤ 25-word sentences' },
      ],
      criteria: {
        maxSentenceWords: 25,
        requireLists: true,
        requireQA: true,
        minExtractableBlocks: 2,
      },
    },
    brand: {
      name: 'Brand Alignment',
      weight: 1.0,
      description: 'Tone, consistency, and domain trust',
      thresholds: [
        { min: 0, max: 20, score: 20, description: 'Completely off-brand' },
        { min: 21, max: 40, score: 40, description: 'Significant mismatch' },
        { min: 41, max: 60, score: 60, description: 'Some outdated or missing elements' },
        { min: 61, max: 80, score: 80, description: 'Minor tone/terminology drift' },
        { min: 81, max: 100, score: 100, description: 'Flawless alignment (or N/A if page isn\'t brand-centric)' },
      ],
      criteria: {
        brandKeywords: [], // Will be populated from project data
        requiredTerms: [], // Will be populated from project data
        outdatedTerms: [], // Will be populated from project data
        currentYear: new Date().getFullYear(),
      },
    },
  },
  globalScoreFormula: {
    weights: {
      freshness: 2.5,
      structure: 1.5,
      authority: 1.0,
      brand: 1.0,
      snippet: 1.0,
    },
  },
};

// Helper function to calculate global score
export function calculateGlobalScore(scores: Record<string, number>, config: ScoringRulesConfig): number {
  const weights = config.globalScoreFormula.weights;
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  
  let weightedSum = 0;
  for (const [dimension, score] of Object.entries(scores)) {
    const weight = weights[dimension as keyof typeof weights] || 0;
    weightedSum += score * weight;
  }
  
  return Math.round(weightedSum / totalWeight);
}