import { Injectable, Logger } from '@nestjs/common';
import { SentimentResults } from '../interfaces/batch.interfaces';
import { SentimentData } from '../../report/interfaces/report.interfaces';

/**
 * Service responsible for building sentiment data from sentiment results.
 * Handles sentiment analysis results processing and sentiment distribution calculation.
 */
@Injectable()
export class SentimentDataService {
  private readonly logger = new Logger(SentimentDataService.name);

  /**
   * Build sentiment data from sentiment results
   */
  buildSentimentData(sentimentResults: SentimentResults): SentimentData {
    // Count sentiment distribution
    const distribution = { positive: 0, neutral: 0, negative: 0, total: 0 };
    const modelSentiments: Record<string, any> = {};
    const questionResults: Record<string, any[]> = {};

    sentimentResults.results.forEach(result => {
      distribution.total++;
      switch (result.sentiment) {
        case 'positive':
          distribution.positive++;
          break;
        case 'neutral':
          distribution.neutral++;
          break;
        case 'negative':
          distribution.negative++;
          break;
      }

      // Aggregate by model
      if (!modelSentiments[result.llmModel]) {
        modelSentiments[result.llmModel] = {
          model: result.llmModel,
          sentiments: [],
          positiveKeywords: new Set<string>(),
          negativeKeywords: new Set<string>(),
        };
      }
      
      modelSentiments[result.llmModel].sentiments.push(result.sentiment);
      result.extractedPositiveKeywords?.forEach(k => modelSentiments[result.llmModel].positiveKeywords.add(k));
      result.extractedNegativeKeywords?.forEach(k => modelSentiments[result.llmModel].negativeKeywords.add(k));

      // Group by question (originalPrompt)
      const question = result.originalPrompt || `Question ${result.promptIndex + 1}`;
      if (!questionResults[question]) {
        questionResults[question] = [];
      }
      questionResults[question].push({
        model: result.llmModel,
        sentiment: result.sentiment,
        status: result.sentiment === 'positive' ? 'green' : result.sentiment === 'negative' ? 'red' : 'yellow',
        llmResponse: result.llmResponse,
      });
    });

    // Calculate overall sentiment
    const overallSentiment = sentimentResults.summary.overallSentiment;
    const overallScore = Math.round(sentimentResults.summary.overallSentimentPercentage || 0);

    // Transform model sentiments
    const modelSentimentsList = Object.values(modelSentiments).map((ms: any) => {
      // Determine most common sentiment for this model
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      ms.sentiments.forEach((s: string) => sentimentCounts[s as keyof typeof sentimentCounts]++);
      
      const dominantSentiment = Object.entries(sentimentCounts)
        .sort(([, a], [, b]) => b - a)[0][0] as 'positive' | 'neutral' | 'negative';
      
      const status: 'green' | 'yellow' | 'red' = dominantSentiment === 'positive' ? 'green' : 
                     dominantSentiment === 'negative' ? 'red' : 'yellow';

      return {
        model: ms.model,
        sentiment: dominantSentiment,
        status,
        positiveKeywords: Array.from(ms.positiveKeywords) as string[],
        negativeKeywords: Array.from(ms.negativeKeywords) as string[],
      };
    });

    // Build heatmap data from question results
    const heatmapData = Object.entries(questionResults).map(([question, results]) => ({
      question,
      results: results as any[],
    }));

    // Include detailed results
    const detailedResults = sentimentResults.results.map(result => ({
      model: result.llmModel,
      promptIndex: result.promptIndex,
      originalPrompt: result.originalPrompt || '',
      llmResponse: result.llmResponse || '',
      sentiment: result.sentiment,
      extractedPositiveKeywords: result.extractedPositiveKeywords || [],
      extractedNegativeKeywords: result.extractedNegativeKeywords || [],
      usedWebSearch: result.usedWebSearch || false,
      citations: result.citations || [],
      toolUsage: result.toolUsage || [],
    }));

    return {
      overallScore,
      overallSentiment,
      distribution,
      modelSentiments: modelSentimentsList,
      heatmapData,
      detailedResults,
    };
  }
}