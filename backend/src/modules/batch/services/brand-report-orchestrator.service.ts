import { Injectable, Logger } from '@nestjs/common';
import { BatchService } from './batch.service';
import { BatchExecutionService } from './batch-execution.service';
import { BrandReportPersistenceService } from '../../report/services/brand-report-persistence.service';
import { ProjectService } from '../../project/services/project.service';
import {
  AccuracyResults,
  ProjectBatchContext,
  ComparisonResults,
  SentimentResults,
  SpontaneousResults,
} from '../interfaces/batch.interfaces';
import {
  ReportStructure,
  ExplorerData,
  VisibilityData,
  SentimentData,
  AlignmentData,
  CompetitionData,
} from '../../report/interfaces/report.interfaces';

/**
 * Service to orchestrate the creation of brand reports with the new structure
 */
@Injectable()
export class BrandReportOrchestratorService {
  private readonly logger = new Logger(BrandReportOrchestratorService.name);

  constructor(
    private readonly batchService: BatchService,
    private readonly batchExecutionService: BatchExecutionService,
    private readonly brandReportPersistenceService: BrandReportPersistenceService,
    private readonly projectService: ProjectService,
  ) {}

  /**
   * Orchestrate all projects' batches
   */
  async orchestrateAllProjectBatches() {
    this.logger.log('Orchestrating batches for all projects');

    try {
      // Get all projects from the project service
      const projects = await this.projectService.findAll();
      
      this.logger.log(`Found ${projects.length} projects to process`);

      const results = {
        successful: 0,
        failed: 0,
        details: [] as any[],
      };

      // Process each project sequentially (to avoid overloading the system)
      for (const project of projects) {
        try {
          const result = await this.orchestrateProjectBatches(project.projectId);
          results.successful++;
          results.details.push(result);
        } catch (error) {
          this.logger.error(`Failed to process project ${project.projectId}: ${error.message}`, error.stack);
          results.failed++;
          results.details.push({
            success: false,
            projectId: project.projectId,
            error: error.message,
          });
        }
      }

      this.logger.log(`Completed processing all projects. Successful: ${results.successful}, Failed: ${results.failed}`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to orchestrate all project batches: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Orchestrate the creation of a brand report for a project
   */
  async orchestrateProjectBatches(projectId: string) {
    this.logger.log(`Orchestrating brand report for project ${projectId}`);

    try {
      // Get the project context
      const projectContext = await this.batchService.getProjectBatchContext(projectId);
      if (!projectContext) {
        throw new Error(`Project ${projectId} not found or has insufficient data`);
      }

      // Get project details
      const project = await this.projectService.findById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Create a new batch execution
      const batchExecution = await this.batchExecutionService.createBatchExecution(projectId);
      const batchExecutionId = batchExecution.id;

      // Inject the batchExecutionId into the context
      const contextWithBatchExecId = { ...projectContext, batchExecutionId };

      // Run the four pipelines in parallel
      const pipelineResults = await Promise.all([
        this.batchService.runVisibilityPipeline(contextWithBatchExecId),
        this.batchService.runSentimentPipeline(contextWithBatchExecId),
        this.batchService.runAlignmentPipeline(contextWithBatchExecId),
        this.batchService.runCompetitionPipeline(contextWithBatchExecId),
      ]);
      
      const spontaneousResults = pipelineResults[0] as SpontaneousResults;
      const sentimentResults = pipelineResults[1] as SentimentResults;
      const accuracyResults = pipelineResults[2] as AccuracyResults;
      const comparisonResults = pipelineResults[3] as ComparisonResults;

      // Save batch results
      await Promise.all([
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'visibility', spontaneousResults),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'sentiment', sentimentResults),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'alignment', accuracyResults),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'competition', comparisonResults),
      ]);

      // Create the new report structure
      const reportDate = new Date();
      const brandReport: ReportStructure = {
        id: batchExecutionId, // Use batch execution ID as report ID
        projectId: project.projectId,
        reportDate,
        generatedAt: new Date(),
        batchExecutionId,
        brandName: project.brandName,
        metadata: {
          url: project.website || '',
          market: project.market || '',
          countryCode: project.market || 'US', // Default to US if not specified
          competitors: project.competitors || [],
          modelsUsed: this.extractModelsUsed(spontaneousResults, sentimentResults, accuracyResults, comparisonResults),
          promptsExecuted: this.countPromptsExecuted(spontaneousResults, sentimentResults, accuracyResults, comparisonResults),
          executionContext: {
            batchId: batchExecutionId,
            pipeline: 'brand-report',
            version: '2.0.0',
          },
        },
        explorer: this.buildExplorerData(spontaneousResults, sentimentResults, accuracyResults, comparisonResults),
        visibility: this.buildVisibilityData(spontaneousResults, project.brandName, project.competitors || []),
        sentiment: this.buildSentimentData(sentimentResults),
        alignment: this.buildAlignmentData(accuracyResults),
        competition: this.buildCompetitionData(comparisonResults, project.brandName, project.competitors || []),
      };

      // Save the report
      const savedReport = await this.brandReportPersistenceService.saveReport(brandReport);

      // Mark the batch execution as completed
      await this.batchExecutionService.updateBatchExecutionStatus(batchExecutionId, 'completed');

      this.logger.log(`Successfully created brand report ${savedReport.id} for project ${projectId}`);

      return {
        success: true,
        projectId,
        batchExecutionId,
        reportId: savedReport.id,
        message: `Successfully created brand report for ${project.brandName}`,
      };
    } catch (error) {
      this.logger.error(`Failed to create brand report for project ${projectId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private extractModelsUsed(...results: any[]): string[] {
    const models = new Set<string>();
    results.forEach(result => {
      if (result?.results) {
        result.results.forEach((r: any) => {
          if (r.llmModel) models.add(r.llmModel);
        });
      }
    });
    return Array.from(models);
  }

  private countPromptsExecuted(...results: any[]): number {
    let count = 0;
    results.forEach(result => {
      if (result?.results) {
        count += result.results.length;
      }
    });
    return count;
  }

  private buildExplorerData(
    spontaneousResults: SpontaneousResults,
    sentimentResults: SentimentResults,
    accuracyResults: AccuracyResults,
    comparisonResults: ComparisonResults,
  ): ExplorerData {
    // Extract top mentions from spontaneous results
    const mentionCounts: Record<string, number> = {};
    spontaneousResults.results.forEach(result => {
      if (result.mentioned && result.topOfMind) {
        result.topOfMind.forEach(brand => {
          mentionCounts[brand] = (mentionCounts[brand] || 0) + 1;
        });
      }
    });

    const topMentions = Object.entries(mentionCounts)
      .map(([mention, count]) => ({ mention, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Build citations data
    const allCitationsData: Array<{
      modelId: string;
      modelProvider: string;
      promptIndex: number;
      promptType: string;
      citations: any[];
      webSearchQueries: any[];
    }> = [];

    // Collect citations from all pipeline results
    const collectCitations = (results: any[] | undefined, promptType: string) => {
      if (!results) return;

      results.forEach((result, index) => {
        // Extract web search queries
        let webSearchQueries: any[] = [];

        // Check if webSearchQueries is already extracted
        if (result.webSearchQueries && Array.isArray(result.webSearchQueries)) {
          webSearchQueries = result.webSearchQueries;
        }
        // Fallback to extracting from toolUsage
        else if (result.toolUsage && Array.isArray(result.toolUsage)) {
          const extractedQueries: any[] = [];
          result.toolUsage.forEach((tool: any) => {
            if (tool.type === 'web_search' || tool.type === 'search' || tool.type?.includes('search')) {
              const query = tool.input?.query || tool.parameters?.query || tool.parameters?.q || tool.query;
              if (query) {
                extractedQueries.push({
                  query: query,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          });
          webSearchQueries = extractedQueries;
        }

        // Add entry if we have citations OR web search queries
        if ((result.citations && result.citations.length > 0) || webSearchQueries.length > 0) {
          allCitationsData.push({
            modelId: result.llmModel || 'unknown',
            modelProvider: result.llmProvider || 'unknown',
            promptIndex: result.promptIndex ?? index,
            promptType,
            citations: result.citations || [],
            webSearchQueries: webSearchQueries,
          });
        }
      });
    };

    // Collect from all pipelines
    collectCitations(spontaneousResults?.results, 'visibility');
    collectCitations(sentimentResults?.results, 'sentiment');
    collectCitations(accuracyResults?.results, 'alignment');
    collectCitations(comparisonResults?.results, 'competition');

    // Calculate statistics
    const totalPrompts = this.countPromptsExecuted(spontaneousResults, sentimentResults, accuracyResults, comparisonResults);
    const promptsWithWebAccess = allCitationsData.length;
    const webAccessPercentage = totalPrompts > 0 ? (promptsWithWebAccess / totalPrompts) * 100 : 0;

    // Aggregate source statistics
    const sourceMap = new Map<string, {
      totalMentions: number;
      citedByModels: Set<string>;
      associatedQueries: Set<string>;
    }>();

    let totalCitations = 0;
    const allCitations: any[] = [];

    allCitationsData.forEach(({ modelId, modelProvider, promptIndex, promptType, citations, webSearchQueries }) => {
      const queriesForThisModel = webSearchQueries.map((q: any) =>
        typeof q === 'string' ? q : (q.query || q)
      );

      citations.forEach((citation: any) => {
        totalCitations++;
        const domain = this.extractDomain(citation.url || citation.source || '');

        // Add to citations array for the response
        allCitations.push({
          website: domain,
          link: citation.url,
          model: modelId,
          promptType,
          promptIndex,
          promptText: '', // Would need to be passed from result.originalPrompt
          webSearchQueries: webSearchQueries,
        });

        if (domain) {
          if (!sourceMap.has(domain)) {
            sourceMap.set(domain, {
              totalMentions: 0,
              citedByModels: new Set(),
              associatedQueries: new Set(),
            });
          }

          const stats = sourceMap.get(domain)!;
          stats.totalMentions++;
          stats.citedByModels.add(modelId);

          // Add all web search queries that led to this citation
          queriesForThisModel.forEach((query: string) => {
            if (query) {
              stats.associatedQueries.add(query);
            }
          });
        }
      });
    });

    // Get top sources
    const topSources = Array.from(sourceMap.entries())
      .map(([domain, stats]) => ({
        domain,
        count: stats.totalMentions,
        percentage: totalCitations > 0 ? (stats.totalMentions / totalCitations) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Extract keywords from web search queries
    const keywordMap = new Map<string, number>();
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
      'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'done',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'this', 'that', 'these', 'those', 'with', 'from', 'for', 'about',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'under', 'over', 'then', 'than', 'when', 'where', 'what',
      'who', 'whom', 'whose', 'which', 'why', 'how'
    ]);

    allCitationsData.forEach(({ webSearchQueries }) => {
      webSearchQueries.forEach((queryObj: any) => {
        const query = typeof queryObj === 'string' ? queryObj : (queryObj.query || queryObj);
        if (query) {
          // Simple split by spaces and filter stop words
          const words = query.toLowerCase().split(/\s+/).filter((word: string) => 
            word.trim() !== '' && !stopWords.has(word) && word.length > 2
          );
          
          words.forEach((word: string) => {
            keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
          });
        }
      });
    });

    // Count total web search queries for percentage calculation
    const totalWebSearchQueries = allCitationsData.reduce(
      (sum, item) => sum + item.webSearchQueries.length,
      0
    );

    // Get top keywords
    const topKeywords = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({
        keyword,
        count,
        percentage: totalWebSearchQueries > 0 ? (count / totalWebSearchQueries) * 100 : 0,
      }));

    return {
      summary: {
        totalPrompts,
        promptsWithWebAccess,
        webAccessPercentage,
        totalCitations,
        uniqueSources: sourceMap.size,
      },
      topMentions,
      topKeywords,
      topSources,
      citations: allCitations,
      webAccess: {
        totalResponses: totalPrompts,
        successfulQueries: promptsWithWebAccess,
        failedQueries: 0, // Would need error tracking
      },
    };
  }

  private buildVisibilityData(spontaneousResults: SpontaneousResults, brandName: string, competitors: string[] = []): VisibilityData {
    // Calculate model visibility from spontaneous results
    const modelMentions: Record<string, { mentioned: number; total: number }> = {};
    
    spontaneousResults.results.forEach(result => {
      const model = result.llmModel;
      if (!modelMentions[model]) {
        modelMentions[model] = { mentioned: 0, total: 0 };
      }
      modelMentions[model].total++;
      if (result.mentioned) {
        modelMentions[model].mentioned++;
      }
    });

    const modelVisibility = Object.entries(modelMentions).map(([model, stats]) => ({
      model,
      mentionRate: Math.round((stats.mentioned / stats.total) * 100),
    }));

    const overallMentionRate = Math.round(
      (spontaneousResults.summary.mentionRate || 0) * 100
    );

    // Build arena metrics for configured competitors only
    const competitorMentions: Record<string, Record<string, number>> = {};
    const models: string[] = Array.from(new Set(spontaneousResults.results.map((r: any) => r.llmModel)));

    // Initialize competitor mentions only for configured competitors
    competitors.forEach(competitor => {
      competitorMentions[competitor] = {};
      models.forEach(model => {
        competitorMentions[competitor][model] = 0;
      });
    });

    // Count mentions of configured competitors only
    spontaneousResults.results.forEach(result => {
      if (result.topOfMind && Array.isArray(result.topOfMind)) {
        result.topOfMind.forEach((brand: string) => {
          // Only count if this brand is in the configured competitors list
          const matchingCompetitor = competitors.find(comp => 
            comp.toLowerCase() === brand.toLowerCase()
          );
          if (matchingCompetitor && competitorMentions[matchingCompetitor]) {
            competitorMentions[matchingCompetitor][result.llmModel] = 
              (competitorMentions[matchingCompetitor][result.llmModel] || 0) + 1;
          }
        });
      }
    });

    // Build arena metrics from configured competitor mentions
    const arenaMetrics = Object.entries(competitorMentions).map(([competitorName, modelMentionsData]) => {
      const modelsMentionsRate = models.map(model => {
        const modelResults = spontaneousResults.results.filter(r => r.llmModel === model);
        const promptsTested = modelResults.length;
        const mentions = modelMentionsData[model] || 0;
        
        return {
          model,
          mentionsRate: promptsTested > 0 ? Math.round((mentions / promptsTested) * 100) : 0,
        };
      });

      // Calculate global mention rate
      const totalMentions = Object.values(modelMentionsData).reduce((sum: number, count: number) => sum + count, 0);
      const totalPrompts = spontaneousResults.results.length;
      const globalRate = totalPrompts > 0 ? Math.round((totalMentions / totalPrompts) * 100) : 0;

      return {
        name: competitorName,
        size: globalRate > 20 ? 'lg' : globalRate > 10 ? 'md' : 'sm' as 'lg' | 'md' | 'sm',
        global: `${globalRate}%`,
        modelsMentionsRate,
      };
    }).sort((a, b) => parseInt(b.global) - parseInt(a.global)); // Sort by global rate descending

    return {
      overallMentionRate,
      promptsTested: spontaneousResults.results.length,
      modelVisibility,
      arenaMetrics,
    };
  }

  private buildSentimentData(sentimentResults: SentimentResults): SentimentData {
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
    const overallScore = sentimentResults.summary.overallSentimentPercentage || 0;

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

    return {
      overallScore,
      overallSentiment,
      distribution,
      modelSentiments: modelSentimentsList,
      heatmapData,
    };
  }

  private buildAlignmentData(accuracyResults: AccuracyResults): AlignmentData {
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
      overallAlignmentScore,
      averageAttributeScores: finalAverageScores,
      attributeAlignmentSummary,
      detailedResults,
    };
  }

  private buildCompetitionData(
    comparisonResults: ComparisonResults,
    brandName: string,
    competitors: string[]
  ): CompetitionData {
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

    return {
      brandName,
      competitors,
      competitorAnalyses,
      competitorMetrics,
      commonStrengths,
      commonWeaknesses,
    };
  }

  private extractDomain(url: string): string {
    try {
      if (!url) return '';
      // Handle URLs that might not have protocol
      const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(urlWithProtocol);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url; // Return as-is if not a valid URL
    }
  }
}