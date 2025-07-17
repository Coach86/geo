import { Injectable, Logger } from '@nestjs/common';
import { BaseAnalyzer } from './base-analyzer';
import { BrandReport } from '../../report/schemas/brand-report.schema';
import {
  RecommendationCandidate,
  RecommendationType,
  Evidence,
  DataPoint,
} from '../interfaces/recommendation.interfaces';

@Injectable()
export class SentimentImprovementAnalyzer extends BaseAnalyzer {
  private readonly logger = new Logger(SentimentImprovementAnalyzer.name);
  protected readonly confidenceThreshold: number = 0.4; // Lower threshold for sentiment improvement

  async analyzeProject(
    projectId: string,
    brandReport: BrandReport
  ): Promise<RecommendationCandidate[]> {
    const candidates: RecommendationCandidate[] = [];

    if (!brandReport.sentiment) {
      return candidates;
    }

    const sentimentIssues = this.analyzeSentimentPatterns(brandReport);
    const modelSpecificIssues = this.analyzeModelSentiment(brandReport);
    const categoryIssues = this.analyzeCategorySentiment(brandReport);
    const competitorComparison = this.compareWithCompetitors(brandReport);

    const evidence: Evidence[] = [];

    if (sentimentIssues.overallLow) {
      evidence.push(
        this.createEvidence(
          'sentiment_data',
          'Overall sentiment analysis',
          [
            this.createDataPoint(
              'average_sentiment',
              sentimentIssues.averageScore,
              `Low average sentiment score: ${sentimentIssues.averageScore.toFixed(2)}/1.0`
            ),
          ],
          [],
          0.9
        )
      );
    }

    if (modelSpecificIssues.length > 0) {
      const dataPoints: DataPoint[] = modelSpecificIssues.map(issue =>
        this.createDataPoint(
          'model_sentiment',
          issue.score,
          `${issue.model} sentiment: ${issue.score.toFixed(2)}/1.0`
        )
      );

      evidence.push(
        this.createEvidence(
          'sentiment_data',
          'Model-specific sentiment',
          dataPoints,
          [],
          modelSpecificIssues.length / (brandReport.sentiment.modelSentiments?.length || 1)
        )
      );
    }

    if (categoryIssues.length > 0) {
      const dataPoints: DataPoint[] = categoryIssues.map(issue =>
        this.createDataPoint(
          'category_sentiment',
          issue.score,
          `${issue.category} sentiment: ${issue.score.toFixed(2)}/1.0`
        )
      );

      evidence.push(
        this.createEvidence(
          'sentiment_data',
          'Category sentiment analysis',
          dataPoints,
          [],
          Math.min(categoryIssues.length / 5, 0.8)
        )
      );
    }

    if (competitorComparison.gap > 0.1) {
      evidence.push(
        this.createEvidence(
          'competition_data',
          'Competitor sentiment comparison',
          [
            this.createDataPoint(
              'sentiment_gap',
              competitorComparison.gap,
              `Competitors have ${(competitorComparison.gap * 100).toFixed(0)}% higher average sentiment`
            ),
          ],
          [],
          0.7
        )
      );
    }

    if (sentimentIssues.negativeThemes.length > 0) {
      const dataPoints: DataPoint[] = sentimentIssues.negativeThemes.map(theme =>
        this.createDataPoint(
          'negative_theme',
          theme.frequency,
          `Negative theme: ${theme.theme} (${theme.frequency} mentions)`
        )
      );

      evidence.push(
        this.createEvidence(
          'sentiment_data',
          'Negative theme analysis',
          dataPoints.slice(0, 5),
          sentimentIssues.negativeThemes.slice(0, 3).map(t => t.example),
          0.8
        )
      );
    }

    if (evidence.length > 0) {
      const confidenceScore = this.calculateConfidenceScore(evidence);
      const impactScore = this.calculateImpactScore(
        RecommendationType.SENTIMENT_IMPROVEMENT,
        evidence,
        brandReport
      );

      const candidate: RecommendationCandidate = {
        type: RecommendationType.SENTIMENT_IMPROVEMENT,
        title: this.generateTitle(sentimentIssues, modelSpecificIssues, competitorComparison),
        description: this.generateDescription(
          sentimentIssues,
          modelSpecificIssues,
          categoryIssues,
          competitorComparison
        ),
        evidence,
        confidenceScore,
        impactScore,
        suggestedActions: this.generateSuggestedActions(
          sentimentIssues,
          categoryIssues,
          competitorComparison
        ),
        methodology: this.generateMethodology(),
      };

      candidates.push(candidate);
    }

    return candidates;
  }

  getAnalyzerType(): RecommendationType {
    return RecommendationType.SENTIMENT_IMPROVEMENT;
  }

  private analyzeSentimentPatterns(brandReport: BrandReport): {
    overallLow: boolean;
    averageScore: number;
    negativeThemes: Array<{ theme: string; frequency: number; example: string }>;
    volatility: number;
  } {
    const sentiment = brandReport.sentiment;
    const averageScore = sentiment.overallScore || 0;
    const negativeThemes: Array<{ theme: string; frequency: number; example: string }> = [];

    if (sentiment.detailedResults) {
      const themeFrequency = new Map<string, { count: number; example: string }>();
      
      sentiment.detailedResults.forEach(result => {
        // Determine sentiment score from sentiment string
        const score = this.sentimentToScore(result.overallSentiment);
        if (score < 0.4 && result.llmResponse) {
          const themes = this.extractNegativeThemes(result.llmResponse);
          themes.forEach(theme => {
            if (!themeFrequency.has(theme)) {
              themeFrequency.set(theme, { count: 0, example: result.llmResponse });
            }
            themeFrequency.get(theme)!.count++;
          });
        }
      });

      themeFrequency.forEach((data, theme) => {
        if (data.count >= 2) {
          negativeThemes.push({
            theme,
            frequency: data.count,
            example: data.example,
          });
        }
      });
    }

    const scores = sentiment.detailedResults?.map(r => this.sentimentToScore(r.overallSentiment)) || [];
    const volatility = this.calculateVolatility(scores);

    return {
      overallLow: averageScore < 0.5,
      averageScore,
      negativeThemes: negativeThemes.sort((a, b) => b.frequency - a.frequency),
      volatility,
    };
  }

  private analyzeModelSentiment(
    brandReport: BrandReport
  ): Array<{ model: string; score: number }> {
    const issues: Array<{ model: string; score: number }> = [];

    // Calculate model scores from detailed results
    const modelScores = this.calculateModelScores(brandReport);
    
    Object.entries(modelScores).forEach(([model, score]) => {
      if (score < 0.4) {
        issues.push({ model, score });
      }
    });

    return issues.sort((a, b) => a.score - b.score);
  }

  private analyzeCategorySentiment(
    brandReport: BrandReport
  ): Array<{ category: string; score: number }> {
    const issues: Array<{ category: string; score: number }> = [];

    // Calculate category sentiment from heatmap data
    const categoryScores = this.calculateCategoryScores(brandReport);
    
    Object.entries(categoryScores).forEach(([category, score]) => {
      if (score < 0.5) {
        issues.push({
          category: this.formatCategoryName(category),
          score,
        });
      }
    });

    return issues.sort((a, b) => a.score - b.score);
  }

  private compareWithCompetitors(brandReport: BrandReport): {
    gap: number;
    betterCompetitors: number;
    averageCompetitorScore: number;
  } {
    let competitorScores: number[] = [];
    let brandScore = brandReport.sentiment.overallScore || 0;

    if (brandReport.competition?.detailedResults) {
      brandReport.competition.detailedResults.forEach(result => {
        // Extract sentiment from competitor analysis
        if (result.brandStrengths && result.brandStrengths.length > 0) {
          competitorScores.push(0.7); // Positive sentiment if strengths mentioned
        }
        if (result.brandWeaknesses && result.brandWeaknesses.length > 0) {
          competitorScores.push(0.3); // Negative sentiment if weaknesses mentioned
        }
      });
    }

    if (competitorScores.length === 0) {
      return { gap: 0, betterCompetitors: 0, averageCompetitorScore: 0 };
    }

    const averageCompetitorScore = 
      competitorScores.reduce((sum, score) => sum + score, 0) / competitorScores.length;
    
    const betterCompetitors = competitorScores.filter(score => score > brandScore).length;

    return {
      gap: Math.max(0, averageCompetitorScore - brandScore),
      betterCompetitors,
      averageCompetitorScore,
    };
  }

  private extractNegativeThemes(explanation: string): string[] {
    const themes: string[] = [];
    const negativeKeywords = {
      pricing: ['expensive', 'costly', 'overpriced', 'price', 'cost'],
      complexity: ['complex', 'complicated', 'difficult', 'confusing', 'hard to use'],
      reliability: ['unreliable', 'buggy', 'crashes', 'errors', 'issues'],
      support: ['support', 'customer service', 'help', 'response time'],
      features: ['lacking', 'missing features', 'limited', 'basic'],
      performance: ['slow', 'performance', 'speed', 'lag', 'delay'],
    };

    const lowerExplanation = explanation.toLowerCase();

    Object.entries(negativeKeywords).forEach(([theme, keywords]) => {
      if (keywords.some(keyword => lowerExplanation.includes(keyword))) {
        themes.push(theme);
      }
    });

    return themes;
  }

  private calculateVolatility(scores: number[]): number {
    if (scores.length < 2) return 0;

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    
    return Math.sqrt(variance);
  }

  private formatCategoryName(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private generateTitle(
    sentimentIssues: {
      overallLow: boolean;
      averageScore: number;
      negativeThemes: Array<{ theme: string; frequency: number; example: string }>;
      volatility: number;
    },
    modelSpecificIssues: Array<{ model: string; score: number }>,
    competitorComparison: {
      gap: number;
      betterCompetitors: number;
      averageCompetitorScore: number;
    }
  ): string {
    if (sentimentIssues.averageScore < 0.3) {
      return `Critical sentiment issues: ${(sentimentIssues.averageScore * 100).toFixed(0)}% positive`;
    } else if (competitorComparison.gap > 0.2) {
      return `Sentiment ${(competitorComparison.gap * 100).toFixed(0)}% below competitor average`;
    } else if (sentimentIssues.negativeThemes.length >= 3) {
      return `Recurring negative themes in ${sentimentIssues.negativeThemes.length} areas`;
    } else if (modelSpecificIssues.length >= 3) {
      return `Low sentiment scores across ${modelSpecificIssues.length} AI models`;
    }
    
    return 'Sentiment improvement opportunities identified';
  }

  private generateDescription(
    sentimentIssues: {
      overallLow: boolean;
      averageScore: number;
      negativeThemes: Array<{ theme: string; frequency: number; example: string }>;
      volatility: number;
    },
    modelSpecificIssues: Array<{ model: string; score: number }>,
    categoryIssues: Array<{ category: string; score: number }>,
    competitorComparison: {
      gap: number;
      betterCompetitors: number;
      averageCompetitorScore: number;
    }
  ): string {
    const issues: string[] = [];

    if (sentimentIssues.overallLow) {
      issues.push(`Overall sentiment is ${(sentimentIssues.averageScore * 100).toFixed(0)}% positive`);
    }

    if (competitorComparison.gap > 0.1) {
      issues.push(`trailing competitors by ${(competitorComparison.gap * 100).toFixed(0)}%`);
    }

    if (sentimentIssues.negativeThemes.length > 0) {
      const themes = sentimentIssues.negativeThemes.slice(0, 3).map((t: { theme: string; frequency: number; example: string }) => t.theme).join(', ');
      issues.push(`with recurring concerns about ${themes}`);
    }

    return issues.join(', ') + '. Addressing these sentiment drivers can significantly improve brand perception and AI recommendations.';
  }

  private generateSuggestedActions(
    sentimentIssues: {
      overallLow: boolean;
      averageScore: number;
      negativeThemes: Array<{ theme: string; frequency: number; example: string }>;
      volatility: number;
    },
    categoryIssues: Array<{ category: string; score: number }>,
    competitorComparison: {
      gap: number;
      betterCompetitors: number;
      averageCompetitorScore: number;
    }
  ): string[] {
    const actions: string[] = [];

    if (sentimentIssues.negativeThemes.length > 0) {
      const topThemes = sentimentIssues.negativeThemes.slice(0, 2);
      topThemes.forEach(({ theme }: { theme: string; frequency: number; example: string }) => {
        const themeActions = {
          pricing: 'Review and communicate value proposition more effectively',
          complexity: 'Simplify user experience and create better onboarding',
          reliability: 'Address technical issues and improve stability',
          support: 'Enhance customer support and response times',
          features: 'Expand feature set based on user feedback',
          performance: 'Optimize performance and reduce latency',
        };
        
        if ((themeActions as Record<string, string>)[theme]) {
          actions.push((themeActions as Record<string, string>)[theme]);
        }
      });
    }

    if (categoryIssues.length > 0) {
      const topCategory = categoryIssues[0];
      actions.push(`Focus improvements on ${topCategory.category} use cases`);
    }

    if (competitorComparison.gap > 0.1) {
      actions.push(
        'Study competitor strengths and differentiate value proposition',
        'Amplify positive customer testimonials and success stories'
      );
    }

    actions.push(
      'Implement systematic feedback collection and response',
      'Create content addressing common concerns and misconceptions'
    );

    return actions.slice(0, 5);
  }

  private generateMethodology(): string {
    return 'Analyzed sentiment scores across models, categories, and in comparison to competitors. Identified recurring negative themes through text analysis. Calculated statistical significance based on score disparities and theme frequency.';
  }

  private sentimentToScore(sentiment: string): number {
    if (!sentiment || typeof sentiment !== 'string') {
      return 0.5; // Default neutral score for undefined/invalid sentiment
    }
    
    const sentimentScores = {
      'very positive': 1.0,
      'positive': 0.75,
      'neutral': 0.5,
      'negative': 0.25,
      'very negative': 0.0,
    };
    
    return (sentimentScores as Record<string, number>)[sentiment.toLowerCase()] || 0.5;
  }

  private calculateModelScores(brandReport: BrandReport): Record<string, number> {
    const modelScores: Record<string, number> = {};
    const modelCounts: Record<string, number> = {};
    
    if (brandReport.sentiment?.detailedResults) {
      brandReport.sentiment.detailedResults.forEach(result => {
        const score = this.sentimentToScore(result.overallSentiment);
        
        if (!modelScores[result.model]) {
          modelScores[result.model] = 0;
          modelCounts[result.model] = 0;
        }
        
        modelScores[result.model] += score;
        modelCounts[result.model]++;
      });
    }
    
    // Calculate averages
    Object.keys(modelScores).forEach(model => {
      modelScores[model] = modelScores[model] / modelCounts[model];
    });
    
    return modelScores;
  }

  private calculateCategoryScores(brandReport: BrandReport): Record<string, number> {
    const categoryScores: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    
    if (brandReport.sentiment?.heatmapData) {
      brandReport.sentiment.heatmapData.forEach(item => {
        const category = this.extractCategoryFromQuestion(item.question);
        
        if (!categoryScores[category]) {
          categoryScores[category] = 0;
          categoryCounts[category] = 0;
        }
        
        item.results.forEach(result => {
          const score = this.sentimentToScore(result.sentiment);
          categoryScores[category] += score;
          categoryCounts[category]++;
        });
      });
    }
    
    // Calculate averages
    Object.keys(categoryScores).forEach(category => {
      if (categoryCounts[category] > 0) {
        categoryScores[category] = categoryScores[category] / categoryCounts[category];
      }
    });
    
    return categoryScores;
  }

  private extractCategoryFromQuestion(question: string): string {
    // Simple categorization based on keywords
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('price') || questionLower.includes('cost')) {
      return 'pricing';
    } else if (questionLower.includes('feature') || questionLower.includes('capability')) {
      return 'features';
    } else if (questionLower.includes('support') || questionLower.includes('help')) {
      return 'support';
    } else if (questionLower.includes('performance') || questionLower.includes('speed')) {
      return 'performance';
    } else if (questionLower.includes('secure') || questionLower.includes('privacy')) {
      return 'security';
    } else if (questionLower.includes('easy') || questionLower.includes('use')) {
      return 'usability';
    }
    
    return 'general';
  }
}