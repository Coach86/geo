import {
  AccuracyResults,
  ComparisonResults,
  SentimentResults,
  SpontaneousResults,
} from '@/modules/batch/interfaces/batch.interfaces';
import { Injectable, Logger } from '@nestjs/common';
import { CompanyIdentityCard } from '@/modules/identity-card/entities/company-identity-card.entity';
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
  formatPulseModelVisibility(spontaneousData?: SpontaneousResults): Array<{
    model: string;
    value: number;
    isAverage?: boolean;
  }> {
    if (!spontaneousData?.brandVisibility) {
      return [];
    }

    // Calculate visibility percentage for each model
    const modelVisibility = spontaneousData.brandVisibility?.modelBreakdown.map((modelSummary) => {
      return {
        model: modelSummary.name,
        value: Math.round(modelSummary.mentionRate * 100),
      };
    });

    return modelVisibility;
  }

  /**
   * Format tone data
   */
  formatToneData(sentimentData?: SentimentResults): {
    sentiments: Array<{
      model: string;
      sentiment: string;
      status: string;
      positiveKeywords: string[];
      negativeKeywords: string[];
    }>;
    questions: Array<{
      question: string;
      results: Array<{
        model: string;
        sentiment: string;
        status: string;
        positiveKeywords: string[];
        negativeKeywords: string[];
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
    const sentiments: Array<{
      model: string;
      sentiment: string;
      status: 'green' | 'yellow' | 'red';
      positiveKeywords: string[];
      negativeKeywords: string[];
    }> = llmProviders.map((provider) => {
      const modelResults = sentimentData.results.filter((r: any) => r.llmProvider === provider);
      const sentimentValue =
        modelResults.reduce((sum: number, result: any) => {
          return (
            sum + (result.sentiment === 'positive' ? 1 : result.sentiment === 'negative' ? -1 : 0)
          );
        }, 0) / (modelResults.length || 1);
      // Get status based on sentiment
      const status = sentimentValue > 0.3 ? 'green' : sentimentValue < -0.3 ? 'red' : 'yellow';

      // Extract facts as positives/negatives
      const positives = modelResults.flatMap((r) => r.extractedPositiveKeywords || []);
      const negatives = modelResults.flatMap((r) => r.extractedNegativeKeywords || []);

      return {
        model: provider,
        sentiment: `${sentimentValue}`,
        status,
        positiveKeywords: positives || ['No positive keywords found'],
        negativeKeywords: negatives || ['No negative keywords found'],
      };
    });

    // Add global average
    const avgSentiment =
      sentiments.reduce((sum, s) => sum + parseFloat(s.sentiment), 0) / (sentiments.length || 1);
    const formattedAvgSentiment =
      avgSentiment > 0 ? `+${avgSentiment.toFixed(2)}` : avgSentiment.toFixed(2);
    /*
    sentiments.push({
      model: 'Global Avg',
      sentiment: formattedAvgSentiment,
      status: avgSentiment > 0.3 ? 'green' : avgSentiment < -0.3 ? 'red' : 'yellow',
      positives: '—',
      negatives: '—',
      isAverage: true,
    });
*/
    // Create questions from the sentiment data
    const uniquesQuestions = new Set<string>();
    for (const result of sentimentData.results) {
      uniquesQuestions.add(result.originalPrompt || '');
    }

    const questions = Array.from(uniquesQuestions).map((question) => {
      return {
        question,
        results: sentimentData.results
          .filter((r) => r.originalPrompt === question)
          .map((r) => ({
            model: r.llmProvider,
            sentiment: r.sentiment,
            status:
              r.sentiment === 'positive' ? 'green' : r.sentiment === 'negative' ? 'red' : 'yellow',
            positiveKeywords: r.extractedPositiveKeywords,
            negativeKeywords: r.extractedNegativeKeywords,
          })),
      };
    });

    return {
      sentiments,
      questions,
    };
  }

  /**
      {
        question: 'Key pros/cons of the brand?',
        results: sentiments.map((s) => ({
          model: s.model,
          sentiment: s.sentiment,
          status: s.status,
          positiveKeywords: s.positiveKeywords,
          negativeKeywords: s.negativeKeywords,
        })),
      },
    ];

    return {
      sentiments,
      questions,
    };
  }

  /**
   * Format arena data
   */
  formatArenaData(
    comparisonData?: ComparisonResults,
    competitors: string[] = [],
  ): {
    competitors: Array<{
      name: string;
      chatgpt: number;
      claude: number;
      mistral: number;
      gemini: number;
      global: string;
      size: 'lg' | 'md' | 'sm';
      sentiment: 'neutral' | 'positive' | 'negative';
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
    const competitorNames =
      competitorSet.size > 0 ? Array.from(competitorSet) : (competitors || []).slice(0, 3);

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
    const llmProviders =
      llmProviderSet.size > 0
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
        size: (index < 2 ? 'lg' : 'md') as 'lg' | 'md' | 'sm',
        sentiment: (globalPercentage > 50
          ? 'positive'
          : globalPercentage > 30
            ? 'neutral'
            : 'negative') as 'positive' | 'neutral' | 'negative',
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
   * Format accord data using the new accuracy pipeline results
   */
  formatAccordData(
    accuracyData: AccuracyResults,
    identityCard: CompanyIdentityCard,
  ): {
    attributes: Array<{ name: string; rate: string; alignment: string }>;
    score: {
      value: string;
      status: string;
    };
  } {
    // Generate attributes from identity card or default values
    const attributes = this.generateAttributesList(identityCard, accuracyData);

    // Calculate accuracy score from accuracyData if available, otherwise use sentimentData
    const averageAccuracy = accuracyData?.summary?.averageAccuracy;

    // Format as percentage
    const scoreValue = `${Math.round(averageAccuracy * 100)}%`;

    // Determine status based on accuracy score
    let status = 'yellow';
    if (averageAccuracy >= 0.75) {
      status = 'green';
    } else if (averageAccuracy < 0.4) {
      status = 'red';
    }

    return {
      attributes,
      score: {
        value: scoreValue,
        status,
      },
    };
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
  generateAttributesList(
    identityCard: CompanyIdentityCard,
    data?: SentimentResults | AccuracyResults,
  ): Array<{ name: string; rate: string; alignment: '✅' | '⚠️' | '❌' }> {
    // If we have brand attributes from identity card, use those
    if (identityCard?.keyBrandAttributes && identityCard.keyBrandAttributes.length > 0) {
      return identityCard.keyBrandAttributes.map((feature: string, index: number) => {
        // Generate a fake score based on index (higher for first features)
        const score = Math.round(80 - index * 10);
        return {
          name: `${feature}`,
          rate: `${score}%`,
          alignment: score > 60 ? '✅' : '⚠️',
        };
      });
    }

    throw new Error('No attributes found');
  }
}
