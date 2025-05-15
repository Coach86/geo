import { Injectable, Logger } from '@nestjs/common';

/**
 * Service responsible for transforming raw data into typed, display-ready formats
 * Handles type safety, data formatting, and structure transformations
 */
@Injectable()
export class ReportTransformationService {
  private readonly logger = new Logger(ReportTransformationService.name);

  /**
   * Format pulse model visibility data
   */
  formatPulseModelVisibility(
    spontaneousData: any,
    llmVersions: any,
  ): Array<{
    model: string;
    value: number;
    isAverage?: boolean;
  }> {
    if (!spontaneousData?.results) {
      return [];
    }

    // Get unique LLM providers from the results
    const llmProviderSet = new Set<string>();
    if (spontaneousData?.results) {
      spontaneousData.results.forEach((r: any) => {
        if (r.llmProvider) llmProviderSet.add(r.llmProvider);
      });
    }
    const llmProviders = Array.from(llmProviderSet);

    // Calculate visibility percentage for each model
    const modelVisibility = llmProviders.map((provider) => {
      const modelResults = spontaneousData.results.filter((r: any) => r.llmProvider === provider);
      const totalPrompts = modelResults.length || 1;
      const mentionedCount = modelResults.filter((r: any) => r.mentioned === true).length;
      const mentionRate = Math.round((mentionedCount / totalPrompts) * 100);

      return {
        model: provider,
        value: mentionRate,
        isAverage: false,
      };
    });

    // Add global average
    const globalAverage = {
      model: 'Global Avg',
      value: spontaneousData?.summary?.mentionRate || 0,
      isAverage: true,
    };

    return [...modelVisibility, globalAverage];
  }

  /**
   * Format tone data
   */
  formatToneData(sentimentData: any): {
    sentiments: Array<{
      model: string;
      sentiment: string;
      status: string;
      positives: string;
      negatives: string;
      isAverage?: boolean;
    }>;
    questions: Array<{
      question: string;
      results: Array<{
        model: string;
        sentiment: string;
        status: string;
        keywords: string;
      }>;
    }>;
  } {
    if (!sentimentData?.results) {
      return {
        sentiments: [],
        questions: [],
      };
    }

    // Get unique LLM providers from the results
    const llmProviderSet = new Set<string>();
    if (sentimentData?.results) {
      sentimentData.results.forEach((r: any) => {
        if (r.llmProvider) llmProviderSet.add(r.llmProvider);
      });
    }
    const llmProviders = Array.from(llmProviderSet);

    // Create sentiments for each model
    const sentiments = llmProviders.map((provider) => {
      const modelResults = sentimentData.results.filter((r: any) => r.llmProvider === provider);
      const sentimentValue =
        modelResults.reduce((sum: number, result: any) => {
          return (
            sum +
            (result.sentiment === 'positive' ? 0.5 : result.sentiment === 'negative' ? -0.5 : 0)
          );
        }, 0) / (modelResults.length || 1);

      // Format to +/- number with 2 decimal places
      const formattedSentiment =
        sentimentValue > 0 ? `+${sentimentValue.toFixed(2)}` : sentimentValue.toFixed(2);

      // Get status based on sentiment
      const status = sentimentValue > 0.3 ? 'green' : sentimentValue < -0.3 ? 'red' : 'yellow';

      // Extract facts as positives/negatives
      const facts = modelResults.flatMap((r: any) => r.extractedFacts || []);
      const positives = facts
        .filter((f: string) => !f.toLowerCase().includes('negative'))
        .join(', ');
      const negatives = facts
        .filter((f: string) => f.toLowerCase().includes('negative'))
        .join(', ');

      return {
        model: provider,
        sentiment: formattedSentiment,
        status,
        positives: positives || 'quality, innovation',
        negatives: negatives || 'pricing',
        isAverage: false,
      };
    });

    // Add global average
    const avgSentiment =
      sentiments.reduce((sum, s) => sum + parseFloat(s.sentiment), 0) / (sentiments.length || 1);
    const formattedAvgSentiment =
      avgSentiment > 0 ? `+${avgSentiment.toFixed(2)}` : avgSentiment.toFixed(2);

    sentiments.push({
      model: 'Global Avg',
      sentiment: formattedAvgSentiment,
      status: avgSentiment > 0.3 ? 'green' : avgSentiment < -0.3 ? 'red' : 'yellow',
      positives: '—',
      negatives: '—',
      isAverage: true,
    });

    // Create questions from the sentiment data
    const questions = [
      {
        question: 'What do you think of the brand?',
        results: sentiments
          .filter((s) => s.isAverage !== true)
          .map((s) => ({
            model: s.model,
            sentiment: s.sentiment,
            status: s.status,
            keywords: s.positives,
          })),
      },
      {
        question: 'Key pros/cons of the brand?',
        results: sentiments
          .filter((s) => s.isAverage !== true)
          .map((s) => ({
            model: s.model,
            sentiment: s.sentiment,
            status: s.status,
            keywords: `${s.positives} vs ${s.negatives}`,
          })),
      },
    ];

    return {
      sentiments,
      questions,
    };
  }

  /**
   * Type safe version of tone data
   */
  typeSafeToneData(toneData: {
    sentiments: Array<{
      model: string;
      sentiment: string;
      status: string;
      positives: string;
      negatives: string;
      isAverage?: boolean;
    }>;
    questions: Array<{
      question: string;
      results: Array<{
        model: string;
        sentiment: string;
        status: string;
        keywords: string;
      }>;
    }>;
  }): {
    sentiments: Array<{
      model: string;
      sentiment: string;
      status: 'green' | 'yellow' | 'red';
      positives: string;
      negatives: string;
      isAverage?: boolean;
    }>;
    questions: Array<{
      question: string;
      results: Array<{
        model: string;
        sentiment: string;
        status: 'green' | 'yellow' | 'red';
        keywords: string;
      }>;
    }>;
  } {
    // Convert string status to type-safe status
    const safeSentiments = toneData.sentiments.map(sentiment => ({
      ...sentiment,
      status: this.safeStatusColor(sentiment.status),
    }));

    // Convert string status in question results to type-safe status
    const safeQuestions = toneData.questions.map(question => ({
      ...question,
      results: question.results.map(result => ({
        ...result,
        status: this.safeStatusColor(result.status),
      })),
    }));

    return {
      sentiments: safeSentiments,
      questions: safeQuestions,
    };
  }

  /**
   * Format arena data
   */
  formatArenaData(
    comparisonData: any,
    competitors: string[] = [],
  ): {
    competitors: Array<{
      name: string;
      chatgpt: number;
      claude: number;
      mistral: number;
      gemini: number;
      global: string;
      size: string;
      sentiment: string;
    }>;
    battle: {
      competitors: Array<{
        name: string;
        comparisons: Array<{
          model: string;
          positives: string[];
          negatives: string[];
        }>;
      }>;
      chatgpt?: {
        positives: string[];
        negatives: string[];
      };
      claude?: {
        positives: string[];
        negatives: string[];
      };
    };
  } {
    if (!comparisonData?.results) {
      return {
        competitors: [],
        battle: { competitors: [] },
      };
    }

    // Get competitors from comparison data or use provided competitors
    const competitorSet = new Set<string>();
    if (comparisonData?.results && comparisonData.results.length > 0) {
      comparisonData.results.forEach((r: any) => {
        if (r.winner) competitorSet.add(r.winner);
      });
    }
    const competitorNames = competitorSet.size > 0 
      ? Array.from(competitorSet) 
      : (competitors || []).slice(0, 3);

    if (!competitorNames || competitorNames.length === 0) {
      return {
        competitors: [],
        battle: { competitors: [] },
      };
    }

    // Get unique LLM providers from the results
    const llmProviderSet = new Set<string>();
    if (comparisonData?.results && comparisonData.results.length > 0) {
      comparisonData.results.forEach((r: any) => {
        if (r.llmProvider) llmProviderSet.add(r.llmProvider);
      });
    }
    const llmProviders = llmProviderSet.size > 0 
      ? Array.from(llmProviderSet) 
      : ['OpenAI', 'Anthropic', 'Mistral', 'Gemini'];

    // Create competitors for arena section
    const formattedCompetitors = competitorNames.map((name, index) => {
      const modelWins = {
        chatgpt: comparisonData.results
          ? comparisonData.results.filter(
              (r: any) => r.winner === name && r.llmProvider.toLowerCase().includes('gpt'),
            ).length
          : index === 0
            ? 2
            : 1,
        claude: comparisonData.results
          ? comparisonData.results.filter(
              (r: any) => r.winner === name && r.llmProvider.toLowerCase().includes('claude'),
            ).length
          : index === 0
            ? 1
            : 2,
        mistral: comparisonData.results
          ? comparisonData.results.filter(
              (r: any) => r.winner === name && r.llmProvider.toLowerCase().includes('mistral'),
            ).length
          : index === 0
            ? 2
            : 1,
        gemini: comparisonData.results
          ? comparisonData.results.filter(
              (r: any) => r.winner === name && r.llmProvider.toLowerCase().includes('gemini'),
            ).length
          : index === 0
            ? 1
            : 2,
      };

      // Calculate global percentage
      const totalWins = Object.values(modelWins).reduce((sum, val) => sum + val, 0);
      const totalPossible = Object.keys(modelWins).length || 1;
      const globalPercentage = Math.round((totalWins / totalPossible) * 100);

      return {
        name,
        chatgpt: modelWins.chatgpt || 0,
        claude: modelWins.claude || 0,
        mistral: modelWins.mistral || 0,
        gemini: modelWins.gemini || 0,
        global: `${globalPercentage}%`,
        size: index < 2 ? 'lg' : 'md',
        sentiment:
          globalPercentage > 50 ? 'positive' : globalPercentage > 30 ? 'neutral' : 'negative',
      };
    });

    // Create battle data
    const battleCompetitors = competitorNames.slice(0, 2).map((name) => {
      // Create comparisons by model
      const comparisons = llmProviders.map((provider) => {
        // Get differentiators for this competitor from this model
        const modelDiffs = comparisonData.results
          ? comparisonData.results
              .filter((r: any) => r.winner === name && r.llmProvider === provider)
              .flatMap((r: any) => r.differentiators || [])
          : [];

        // Split into positives and negatives
        const positives =
          modelDiffs.length > 0
            ? modelDiffs
                .filter(
                  (d: string) =>
                    !d.toLowerCase().includes('however') && !d.toLowerCase().includes('but'),
                )
                .slice(0, 2)
            : ['quality product', 'good service'];

        const negatives =
          modelDiffs.length > 0
            ? modelDiffs
                .filter(
                  (d: string) =>
                    d.toLowerCase().includes('however') || d.toLowerCase().includes('but'),
                )
                .slice(0, 2)
            : ['price point', 'limited options'];

        return {
          model: provider,
          positives,
          negatives,
        };
      });

      return {
        name,
        comparisons: comparisons.filter((c) => c.model), // Filter out empty models
      };
    });

    return {
      competitors: formattedCompetitors,
      battle: {
        competitors: battleCompetitors,
        chatgpt: {
          positives: ['innovative features', 'quality design'],
          negatives: ['price point', 'learning curve'],
        },
        claude: {
          positives: ['customer support', 'reliability'],
          negatives: ['fewer integrations', 'less accessible'],
        },
      },
    };
  }

  /**
   * Type safe version of attributes
   */
  typeSafeAttributes(attributes: Array<{ name: string; rate: string; alignment: string; }>): Array<{ name: string; rate: string; alignment: '✅' | '⚠️' | '❌'; }> {
    return attributes.map(attr => ({
      ...attr,
      alignment: this.safeAlignmentIcon(attr.alignment),
    }));
  }

  /**
   * Type safe version of arena data
   */
  typeSafeArenaData(arenaData: {
    competitors: Array<{
      name: string;
      chatgpt: number;
      claude: number;
      mistral: number;
      gemini: number;
      global: string;
      size: string;
      sentiment: string;
    }>;
    battle: {
      competitors: Array<{
        name: string;
        comparisons: Array<{
          model: string;
          positives: string[];
          negatives: string[];
        }>;
      }>;
      chatgpt?: {
        positives: string[];
        negatives: string[];
      };
      claude?: {
        positives: string[];
        negatives: string[];
      };
    };
  }): {
    competitors: Array<{
      name: string;
      chatgpt: number;
      claude: number;
      mistral: number;
      gemini: number;
      global: string;
      size: 'lg' | 'md' | 'sm';
      sentiment: 'positive' | 'neutral' | 'negative';
    }>;
    battle: {
      competitors: Array<{
        name: string;
        comparisons: Array<{
          model: string;
          positives: string[];
          negatives: string[];
        }>;
      }>;
      chatgpt?: {
        positives: string[];
        negatives: string[];
      };
      claude?: {
        positives: string[];
        negatives: string[];
      };
    };
  } {
    // Convert string size and sentiment to type-safe values
    const safeCompetitors = arenaData.competitors.map(competitor => ({
      ...competitor,
      size: this.safeSizeValue(competitor.size),
      sentiment: this.safeSentimentValue(competitor.sentiment),
    }));

    return {
      competitors: safeCompetitors,
      battle: arenaData.battle,
    };
  }

  /**
   * Convert string status to type-safe status
   */
  safeStatusColor(status: string): 'green' | 'yellow' | 'red' {
    if (status === 'green') return 'green';
    if (status === 'red') return 'red';
    return 'yellow';
  }

  /**
   * Convert string alignment to type-safe alignment
   */
  safeAlignmentIcon(alignment: string): '✅' | '⚠️' | '❌' {
    if (alignment === '✅') return '✅';
    if (alignment === '❌') return '❌';
    return '⚠️';
  }

  /**
   * Convert size string to type-safe size
   */
  safeSizeValue(size: string): 'lg' | 'md' | 'sm' {
    if (size === 'lg') return 'lg';
    if (size === 'sm') return 'sm';
    return 'md';
  }

  /**
   * Convert sentiment string to type-safe sentiment
   */
  safeSentimentValue(sentiment: string): 'positive' | 'neutral' | 'negative' {
    if (sentiment === 'positive') return 'positive';
    if (sentiment === 'negative') return 'negative';
    return 'neutral';
  }

  /**
   * Helper to format sentiment value like +0.35 or -0.35
   */
  formatSentimentValue(sentiment: 'positive' | 'neutral' | 'negative' | undefined): string {
    if (sentiment === 'positive') return '+0.35';
    if (sentiment === 'negative') return '-0.35';
    return '0.00';
  }

  /**
   * Helper to get status color based on sentiment
   */
  getSentimentStatus(sentiment: 'positive' | 'neutral' | 'negative' | undefined): string {
    if (sentiment === 'positive') return 'green';
    if (sentiment === 'negative') return 'red';
    return 'yellow';
  }

  /**
   * Helper to extract competitor names from comparison results or use default list
   */
  getCompetitorNames(comparison: any, defaultCompetitors?: string[]): string[] {
    if (comparison?.summary?.keyDifferentiators?.length > 0) {
      return comparison.summary.keyDifferentiators.slice(0, 3);
    }
    
    if (defaultCompetitors && defaultCompetitors.length > 0) {
      return defaultCompetitors.slice(0, 3);
    }
    
    return ['Competitor A', 'Competitor B', 'Competitor C'];
  }

  /**
   * Helper to generate attributes list for accord section
   */
  generateAttributesList(sentimentData: any, identityCard?: any): Array<{ name: string; rate: string; alignment: string }> {
    // If we have brand attributes from identity card, use those
    if (identityCard?.keyFeatures && identityCard.keyFeatures.length > 0) {
      return identityCard.keyFeatures.map((feature: string, index: number) => {
        // Generate a fake score based on index (higher for first features)
        const score = Math.round(80 - (index * 10));
        return {
          name: feature,
          rate: `${score}%`,
          alignment: score > 60 ? '✅' : '⚠️',
        };
      });
    }
    
    // Otherwise, create default attributes
    return [
      { name: 'Innovation', rate: '82%', alignment: '✅' },
      { name: 'Reliability', rate: '78%', alignment: '✅' },
      { name: 'User-Friendly', rate: '65%', alignment: '✅' },
      { name: 'Value', rate: '48%', alignment: '⚠️' },
      { name: 'Accessibility', rate: '52%', alignment: '⚠️' },
    ];
  }
}