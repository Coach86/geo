import { Injectable, Logger } from '@nestjs/common';
import {
  AlignmentResults as AccuracyResults,
  CompetitionResults,
} from '../interfaces/batch.interfaces';
import {
  AlignmentData,
  CompetitionData,
} from '../../report/interfaces/report.interfaces';

/**
 * Service responsible for building alignment and competition data from pipeline results.
 * Handles alignment (accuracy) analysis and competition analysis processing.
 */
@Injectable()
export class AlignmentCompetitionDataService {
  private readonly logger = new Logger(AlignmentCompetitionDataService.name);

  /**
   * Build alignment data from alignment results
   */
  buildAlignmentData(accuracyResults: AccuracyResults): AlignmentData {
    // Extract attribute scores
    const attributeScores: Record<string, number[]> = {};
    const detailedResults: any[] = [];

    accuracyResults.results.forEach(result => {
      // Process attribute scores for aggregation
      result.attributeScores?.forEach(attrScore => {
        if (!attributeScores[attrScore.attribute]) {
          attributeScores[attrScore.attribute] = [];
        }
        attributeScores[attrScore.attribute].push(attrScore.score);
      });

      // Map the result to the alignment format with all available data
      const modelResult = {
        model: result.llmModel,
        promptIndex: result.promptIndex,
        originalPrompt: result.originalPrompt || '',
        llmResponse: result.llmResponse || '',
        attributeScores: result.attributeScores || [],
        usedWebSearch: result.usedWebSearch || false,
        citations: result.citations || [],
        toolUsage: result.toolUsage || [],
        error: result.error || undefined,
      };

      detailedResults.push(modelResult);
    });

    // Calculate averages from processed attribute scores
    const averageAttributeScores: Record<string, number> = {};
    Object.entries(attributeScores).forEach(([attr, scores]) => {
      if (scores.length > 0) {
        averageAttributeScores[attr] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    });

    // Use processed averages or fall back to summary averages
    const finalAverageScores = Object.keys(averageAttributeScores).length > 0 
      ? averageAttributeScores 
      : accuracyResults.summary.averageAttributeScores || {};

    const overallAlignmentScore = Math.round(
      Object.values(finalAverageScores)
        .reduce((sum, score) => sum + score, 0) / 
      Object.keys(finalAverageScores).length * 100 || 0
    );

    // Create attribute alignment summary
    const attributeAlignmentSummary = Object.entries(finalAverageScores).map(([attribute, avgScore]) => {
      const mentionCount = accuracyResults.results.filter(r => 
        r.attributeScores?.some(s => s.attribute === attribute)
      ).length;
      const mentionRate = `${Math.round((mentionCount / accuracyResults.results.length) * 100)}%`;
      
      // Convert score to alignment level
      let alignment = "❌ Low";
      if (avgScore >= 0.8) {
        alignment = "✅ High";
      } else if (avgScore >= 0.6) {
        alignment = "⚠️ Medium";
      }

      return {
        name: attribute,
        mentionRate,
        alignment,
      };
    });

    return {
      summary: {
        overallAlignmentScore,
        averageAttributeScores: finalAverageScores,
        attributeAlignmentSummary,
      },
      detailedResults,
    };
  }

  /**
   * Build competition data from competition results
   */
  buildCompetitionData(
    comparisonResults: CompetitionResults,
    brandName: string,
    competitors: string[]
  ): CompetitionData {
    this.logger.log(`[BUILDER-COMP-001] Building competition data with ${comparisonResults?.results?.length || 0} results`);
    
    // Use the summary data which already has the analysis
    const commonStrengths = comparisonResults.summary.commonStrengths || [];
    const commonWeaknesses = comparisonResults.summary.commonWeaknesses || [];

    // Transform competitorAnalyses to match expected structure
    const competitorAnalysesMap: Record<string, any> = {};
    
    // Group results by competitor
    comparisonResults.results.forEach(result => {
      if (!competitorAnalysesMap[result.competitor]) {
        competitorAnalysesMap[result.competitor] = {
          competitor: result.competitor,
          analysisByModel: [],
        };
      }
      
      competitorAnalysesMap[result.competitor].analysisByModel.push({
        model: result.llmModel,
        strengths: result.brandStrengths || [],
        weaknesses: result.brandWeaknesses || [],
      });
    });

    const competitorAnalyses = Object.values(competitorAnalysesMap);

    // Build competitor metrics
    const competitorMetrics = competitors.map((competitor, index) => ({
      competitor,
      overallRank: index + 1,
      mentionRate: 0, // This would need to be calculated from other data
      modelMentions: [],
    }));

    // Include detailed results with llmResponse and citations
    const detailedResults = comparisonResults.results.map((result, index) => {
      this.logger.log(`[BUILDER-COMP-002] Processing result ${index}: ${JSON.stringify({
        model: result.llmModel,
        competitor: result.competitor,
        hasLlmResponse: !!result.llmResponse,
        llmResponseLength: result.llmResponse?.length || 0,
      })}`);
      
      return {
        model: result.llmModel,
        promptIndex: result.promptIndex,
        competitor: result.competitor,
        originalPrompt: result.originalPrompt || '',
        llmResponse: result.llmResponse || '',
        brandStrengths: result.brandStrengths || [],
        brandWeaknesses: result.brandWeaknesses || [],
        usedWebSearch: result.usedWebSearch || false,
        citations: (result.citations || []).map((citation: any) => {
          if (typeof citation === 'string') {
            return { url: citation };
          }
          return {
            url: citation?.url || citation?.source || '',
            title: citation?.title || undefined,
            text: citation?.text || citation?.snippet || undefined,
          };
        }),
        toolUsage: (result.toolUsage || []).map((tool: any) => {
          return {
            type: tool?.type || 'unknown',
            parameters: tool?.parameters || {},
            execution_details: tool?.execution_details ? {
              status: tool.execution_details.status || 'unknown',
              result: tool.execution_details.result,
              error: tool.execution_details.error,
            } : undefined,
          };
        }),
      };
    });

    this.logger.log(`[BUILDER-COMP-003] Built competition data with ${detailedResults.length} detailed results`);

    return {
      brandName,
      competitors,
      competitorAnalyses,
      competitorMetrics,
      commonStrengths,
      commonWeaknesses,
      detailedResults,
    };
  }
}