import {
  AccuracyResults,
  ComparisonResults,
  SentimentResults,
  SpontaneousResults,
} from '@/modules/batch/interfaces/batch.interfaces';
import { Injectable, Logger } from '@nestjs/common';
import { CompanyIdentityCard } from '@/modules/identity-card/entities/company-identity-card.entity';
import { WeeklyBrandReportEntity } from '../interfaces/report-types';
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
    spontaneousData?: SpontaneousResults,
    competitors: string[] = [],
  ): {
    competitors: Array<{
      name: string;
      size: 'lg' | 'md' | 'sm';
      global: string;
      modelsMentionsRate: Array<{
        model: string;
        mentionsRate: number;
      }>;
    }>;
  } {
    const allCompetitorNames = new Set([...competitors]);

    const models = Array.from(new Set(spontaneousData?.results?.map((r) => r.llmProvider) ?? []));

    const competitorsArray = Array.from(allCompetitorNames).map((name) => {
      const modelsMentionsRate = models.map((model) => {
        const modelResults = spontaneousData?.results?.filter((r) => r.llmProvider === model) ?? [];
        const promptsTested = modelResults.length;
        this.logger.debug(`name ${name}`);
        const mentions = modelResults.filter((r) =>
          r.topOfMind?.some((top) => top && name && name.toLowerCase().includes(top.toLowerCase())),
        ).length;
        this.logger.debug(`mentions ${mentions}`);
        return {
          model,
          mentionsRate: promptsTested > 0 ? Math.round((mentions / promptsTested) * 100) : 0,
        };
      });
      return {
        name,
        size: 'lg' as 'lg' | 'md' | 'sm',
        modelsMentionsRate,
        global: `${Math.round(modelsMentionsRate?.reduce((sum, m) => sum + m.mentionsRate, 0) / modelsMentionsRate?.length)}%`,
      };
    });

    return { competitors: competitorsArray };
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

    // Calculate overall accuracy score by averaging all attribute scores
    const allScores = Object.values(accuracyData?.summary?.averageAttributeScores || {});
    const averageScore =
      allScores.length > 0
        ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        : 0.5; // Default if no scores available

    // Format as percentage
    const scoreValue = `${Math.round(averageScore * 100)}%`;

    // Determine status based on accuracy score
    let status = 'yellow';
    if (averageScore >= 0.75) {
      status = 'green';
    } else if (averageScore < 0.4) {
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
    data?: AccuracyResults,
  ): Array<{ name: string; rate: string; alignment: '✅' | '⚠️' | '❌' }> {
    // If we have brand attributes from identity card, use those
    if (identityCard?.keyBrandAttributes && identityCard.keyBrandAttributes.length > 0) {
      return identityCard.keyBrandAttributes.map((feature: string) => {
        // If we have accuracy data with attribute scores
        if (data && 'summary' in data && data.summary && data.summary.averageAttributeScores) {
          const attributeScores = data.summary.averageAttributeScores;
          // Try to find this attribute in the scores (might need fuzzy matching in the future)
          let score = attributeScores[feature] || 0;
          score = Math.round(score * 100); // Convert to percentage

          return {
            name: `${feature}`,
            rate: `${score}%`,
            alignment: score > 70 ? '✅' : score > 40 ? '⚠️' : '❌',
          };
        } else {
          // Fallback if no attribute scores
          const score = 0; // Random score between 45-75%
          return {
            name: `An error occurred`,
            rate: `${score}%`,
            alignment: score > 60 ? '✅' : '⚠️',
          };
        }
      });
    }

    throw new Error('No attributes found');
  }

  /**
   * Helper to get brand battle data
   */
  getBrandBattleData(comparison?: ComparisonResults): WeeklyBrandReportEntity['brandBattle'] {
    if (!comparison) {
      return {
        competitorAnalyses: [],
        commonStrengths: [],
        commonWeaknesses: [],
      };
    }
    this.logger.debug(`comparison ${JSON.stringify(comparison)}`);
    const uniqueCompetitors = new Set<string>();
    comparison.results.forEach((result) => {
      uniqueCompetitors.add(result.competitor);
    });
    this.logger.debug(`uniqueCompetitors ${JSON.stringify(uniqueCompetitors)}`);

    /*[
  {
    analysisByModel: [
      { model: 'OpenAI', strengths: [], weaknesses: [] },
      { model: 'OpenAI', strengths: [], weaknesses: [] },
      { model: 'OpenAI', strengths: [], weaknesses: [] },
      { model: 'OpenAI', strengths: [], weaknesses: [] },
      { model: 'OpenAI', strengths: [], weaknesses: [] },
      { model: 'OpenAI', strengths: [], weaknesses: [] },
      { model: 'OpenAI', strengths: [], weaknesses: [] },
      { model: 'OpenAI', strengths: [], weaknesses: [] },
      { model: 'Anthropic', strengths: [], weaknesses: [] },
      { model: 'Anthropic', strengths: [], weaknesses: [] },
      { model: 'Anthropic', strengths: [], weaknesses: [] },
      { model: 'Anthropic', strengths: [], weaknesses: [] },
      { model: 'Anthropic', strengths: [], weaknesses: [] },
      { model: 'Anthropic', strengths: [], weaknesses: [] },
      { model: 'Anthropic', strengths: [], weaknesses: [] },
      { model: 'Anthropic', strengths: [], weaknesses: [] },
      { model: 'Perplexity', strengths: [], weaknesses: [] },
      { model: 'Perplexity', strengths: [], weaknesses: [] },
      { model: 'Perplexity', strengths: [], weaknesses: [] },
      { model: 'Perplexity', strengths: [], weaknesses: [] },
      { model: 'Perplexity', strengths: [], weaknesses: [] },
      { model: 'Perplexity', strengths: [], weaknesses: [] },
      { model: 'Perplexity', strengths: [], weaknesses: [] },
      { model: 'Perplexity', strengths: [], weaknesses: [] },
    ],
  },
];*/
    const competitorAnalyses = Array.from(uniqueCompetitors).map((competitor) => {
      const analysisByModel = comparison.results
        .filter((result) => result.competitor === competitor)
        .map((result) => ({
          model: result.llmProvider,
          strengths: result.brandStrengths || [],
          weaknesses: result.brandWeaknesses || [],
        }));

      return {
        competitor: competitor,
        analysisByModel: analysisByModel,
      };
    });

    this.logger.debug(`competitorAnalyses ${JSON.stringify(competitorAnalyses)}`);

    const commonStrengths = comparison.summary.commonStrengths;
    const commonWeaknesses = comparison.summary.commonWeaknesses;

    return {
      competitorAnalyses: competitorAnalyses,
      commonStrengths: commonStrengths,
      commonWeaknesses: commonWeaknesses,
    };
  }
}
