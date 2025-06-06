import { Injectable, Logger } from '@nestjs/common';
import { ComparisonResults, WebSearchSummary } from '@/modules/batch/interfaces/batch.interfaces';
import { BatchReportInput } from '../interfaces/report-input.interfaces';
import { ReportTransformationService } from './report-transformation.service';
import { Project } from '@/modules/project/entities/project.entity';
import { getMarketFlag } from '@/common/constants/markets';
import {
  WeeklyBrandReportEntity,
  ApiSentimentResult,
  ApiQuestionResult,
  DatabaseSentimentResult,
  DatabaseQuestionResult,
  CitationsData,
} from '../interfaces/report-types';
import { WeeklyBrandReportDocument } from '../schemas/weekly-brand-report.schema';
import { ReportContentResponseDto } from '../dto/report-content-response.dto';
/**
 * Service dedicated to converting between different report formats
 * Acts as an explicit conversion layer between batch results and report entities
 */
@Injectable()
export class ReportConverterService {
  private readonly logger = new Logger(ReportConverterService.name);

  constructor(private readonly transformationService: ReportTransformationService) {}

  private formatPercentage(value?: number): number {
    return value ? Math.round(value * 100) : 0;
  }

  private normalizeUrl(url: string): string {
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');
  }

  private getTraceDataForReport(input: BatchReportInput): {
    consultedWebsites: Array<{ url: string; count: number }>;
  } {
    const urlCounts = new Map<string, number>();

    const processWebsites = (webSearchSummary: WebSearchSummary) => {
      if (
        webSearchSummary?.consultedWebsites &&
        Array.isArray(webSearchSummary.consultedWebsites)
      ) {
        webSearchSummary.consultedWebsites.forEach((url: string) => {
          const normalizedUrl = this.normalizeUrl(url);
          urlCounts.set(normalizedUrl, (urlCounts.get(normalizedUrl) || 0) + 1);
        });
      }
    };

    if (input.spontaneous?.webSearchSummary) {
      processWebsites(input.spontaneous.webSearchSummary);
    }

    if (input.sentiment?.webSearchSummary) {
      processWebsites(input.sentiment.webSearchSummary);
    }

    if (input.comparison?.webSearchSummary) {
      processWebsites(input.comparison.webSearchSummary);
    }

    if (input.accord?.webSearchSummary) {
      processWebsites(input.accord.webSearchSummary);
    }

    const sortedWebsites = Array.from(urlCounts.entries())
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count);

    return { consultedWebsites: sortedWebsites };
  }

  private getPulseDataForReport(input: BatchReportInput): WeeklyBrandReportEntity['pulse'] {
    const formattedPulse = this.transformationService.formatPulseModelVisibility(input.spontaneous);
    return {
      promptsTested: input.spontaneous?.results
        ? new Set(input.spontaneous.results.map((r) => r.promptIndex)).size
        : 0,
      modelVisibility: formattedPulse,
    };
  }

  private getToneDataForReport(input: BatchReportInput): WeeklyBrandReportEntity['tone'] {
    const formattedTone = this.transformationService.formatToneData(input.sentiment);
    return formattedTone;
  }

  private getAccordDataForReport(
    input: BatchReportInput,
    project: Project,
  ): WeeklyBrandReportEntity['accord'] {
    // Calculate average of attribute scores
    const attributeScores = input.accord?.summary?.averageAttributeScores || {};
    const scores = Object.values(attributeScores);
    const avgScore =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0.5;

    const accordValue = `${Math.round(avgScore * 10)}/10`;
    const accordStatus = (avgScore > 0.6 ? 'green' : 'yellow') as 'green' | 'yellow' | 'red';

    const safeAttributes = this.transformationService.generateAttributesList(
      project,
      input.accord,
    );
    return {
      attributes: safeAttributes,
      score: {
        value: accordValue,
        status: accordStatus,
      },
    };
  }

  private getArenaDataForReport(
    input: BatchReportInput,
    project: Project,
  ): WeeklyBrandReportEntity['arena'] {
    // Only pass the comparison data, regardless of format
    const formattedArena = this.transformationService.formatArenaData(
      input.spontaneous,
      project?.competitors || [],
    );
    return formattedArena;
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  private extractKeywordsFromQuery(query: string): string[] {
    // Remove common stop words and extract meaningful keywords
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'what', 'when', 'where', 'who', 'why',
      'how', 'which', 'or', 'but', 'if', 'then', 'so', 'than', 'this',
      'these', 'those', 'there', 'their', 'them', 'they', 'we', 'you',
      'your', 'our', 'us', 'me', 'my', 'i', 'vs', 'versus', 'compared'
    ]);

    // Split by spaces and common delimiters, convert to lowercase
    const words = query.toLowerCase()
      .replace(/[^\w\s-]/g, ' ') // Replace non-word chars (except hyphens) with spaces
      .split(/\s+/)
      .filter(word => word.length > 2) // Filter out very short words
      .filter(word => !stopWords.has(word)) // Filter out stop words
      .filter(word => !word.match(/^\d+$/)); // Filter out pure numbers

    return words;
  }

  private getCitationsDataForReport(input: BatchReportInput): CitationsData {
    const citationsByModel: CitationsData['citationsByModel'] = [];
    const sourceFrequency = new Map<string, Set<string>>();
    const queryToSources = new Map<string, Set<string>>();
    const sourceCitationCount = new Map<string, number>();
    const keywordFrequency = new Map<string, number>();
    
    let totalPrompts = 0;
    let promptsWithWebAccess = 0;
    let totalCitations = 0;

    // Process all result types
    const processResults = (results: any[] | undefined, promptType: string) => {
      if (!results) return;
      results.forEach((result, index) => {
        totalPrompts++;
        
        if (result.usedWebSearch) {
          promptsWithWebAccess++;
          
          const modelCitation: CitationsData['citationsByModel'][0] = {
            modelId: result.llmModel,
            modelProvider: result.llmProvider,
            promptIndex: result.promptIndex,
            promptType,
            usedWebSearch: true,
            webSearchQueries: [],
            citations: []
          };
          
          // Process web search queries
          if (result.webSearchQueries || result.toolUsage) {
            // Check multiple possible locations for queries
            const queries = result.webSearchQueries || 
                          result.toolUsage?.filter((tool: any) => tool.type === 'web_search').map((tool: any) => tool.query) || 
                          [];
            
            if (index === 0 && promptType === 'spontaneous') {
              this.logger.debug(`First result webSearchQueries: ${JSON.stringify(result.webSearchQueries?.slice(0, 2))}`);
            }
            
            modelCitation.webSearchQueries = queries.map((query: any) => {
              const queryText = typeof query === 'string' ? query : (query.query || query.parameters?.query || query);
              
              // Extract keywords from query
              if (queryText && typeof queryText === 'string') {
                const keywords = this.extractKeywordsFromQuery(queryText);
                keywords.forEach(keyword => {
                  keywordFrequency.set(keyword, (keywordFrequency.get(keyword) || 0) + 1);
                });
              }
              
              return {
                query: queryText,
                timestamp: typeof query === 'object' ? (query.timestamp || query.execution_details?.timestamp) : undefined
              };
            });
          }
          
          // Process citations
          if (result.citations && Array.isArray(result.citations)) {
            result.citations.forEach((citation: any) => {
              const domain = this.extractDomain(citation.url);
              if (domain) {
                totalCitations++;
                
                modelCitation.citations.push({
                  source: domain,
                  url: citation.url || '',
                  title: citation.title || '',
                  snippet: citation.snippet || '',
                  relevanceScore: citation.relevanceScore
                });
                
                // Track source statistics
                if (!sourceFrequency.has(domain)) {
                  sourceFrequency.set(domain, new Set());
                }
                sourceFrequency.get(domain)!.add(result.llmModel);
                
                // Track citation count per source
                sourceCitationCount.set(domain, (sourceCitationCount.get(domain) || 0) + 1);
                
                // Track query associations
                result.webSearchQueries?.forEach((query: any) => {
                  const queryText = typeof query === 'string' ? query : query.query;
                  if (!queryToSources.has(domain)) {
                    queryToSources.set(domain, new Set());
                  }
                  queryToSources.get(domain)!.add(queryText);
                });
              }
            });
          }
          
          if (modelCitation.citations.length > 0 || modelCitation.webSearchQueries.length > 0) {
            citationsByModel.push(modelCitation);
          }
        }
      });
    };

    // Process all pipeline results
    processResults(input.spontaneous?.results, 'spontaneous');
    processResults(input.sentiment?.results, 'sentiment');
    processResults(input.comparison?.results, 'comparison');
    processResults(input.accord?.results, 'accuracy');

    // Generate source statistics
    const sourceStatistics: CitationsData['sourceStatistics'] = Array.from(sourceFrequency.entries()).map(([domain, models]) => ({
      domain,
      totalMentions: sourceCitationCount.get(domain) || 0,
      citedByModels: Array.from(models),
      associatedQueries: Array.from(queryToSources.get(domain) || [])
    }));

    // Generate top sources
    const topSources: CitationsData['topSources'] = sourceStatistics
      .sort((a, b) => b.totalMentions - a.totalMentions)
      .slice(0, 10)
      .map(source => ({
        domain: source.domain,
        count: source.totalMentions,
        percentage: totalCitations > 0 ? Math.round((source.totalMentions / totalCitations) * 100) : 0
      }));

    // Generate top keywords
    const totalKeywordOccurrences = Array.from(keywordFrequency.values()).reduce((sum, count) => sum + count, 0);
    const topKeywords: CitationsData['topKeywords'] = Array.from(keywordFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({
        keyword,
        count,
        percentage: totalKeywordOccurrences > 0 ? Math.round((count / totalKeywordOccurrences) * 100) : 0
      }));

    this.logger.debug(`Extracted ${keywordFrequency.size} unique keywords from web searches`);
    this.logger.debug(`Top 5 keywords: ${topKeywords.slice(0, 5).map(k => `${k.keyword}(${k.count})`).join(', ')}`);

    return {
      summary: {
        totalPrompts,
        promptsWithWebAccess,
        webAccessPercentage: totalPrompts > 0 ? Math.round((promptsWithWebAccess / totalPrompts) * 100) : 0,
        totalCitations,
        uniqueSources: sourceFrequency.size
      },
      citationsByModel,
      sourceStatistics,
      topSources,
      topKeywords
    };
  }

  /**
   * Converts batch report input data to a complete report entity
   * This is the main transformation function that explicitly shows how
   * raw batch data is converted to the structured report format
   *
   * @param input Batch report data from the batch module
   * @param project Optional company project for additional metadata
   * @returns A fully formed report entity with both new and legacy structures
   */
  convertBatchInputToReportEntity(
    input: BatchReportInput,
    project: Project,
  ): WeeklyBrandReportEntity {
    this.logger.debug(`Converting batch input to report entity for project ${input.projectId}`);
    // Get config data for models list by using the llmVersions keys
    const modelsList = Object.keys(input.llmVersions || {})
      .map((provider) => `${provider}`)
      .join(', ');
    // Format sentiment value and status with helper methods
    const sentimentValue = input.sentiment?.summary?.overallSentimentPercentage;

    const sentimentStatus = this.transformationService.getSentimentStatus(
      input.sentiment?.summary?.overallSentiment || 'neutral',
    ) as 'green' | 'yellow' | 'red';

    // Calculate accord score based on attribute scores
    const attributeScores =
      input.accord?.summary && (input.accord.summary as any).averageAttributeScores
        ? (Object.values((input.accord.summary as any).averageAttributeScores) as number[])
        : [];
    const avgScore =
      attributeScores.length > 0
        ? attributeScores.reduce((sum, score) => sum + score, 0) / attributeScores.length
        : 0;

    const accordValue = `${Math.round(avgScore * 10)}/10`;
    const accordStatus = (avgScore > 0.6 ? 'green' : 'yellow') as 'green' | 'yellow' | 'red';

    return {
      // Base fields
      id: '', // This will be set by the persistence layer
      projectId: input.projectId,
      generatedAt: input.generatedAt || new Date(),
      date: input.date,
      batchExecutionId: input.batchExecutionId,
      // New structured fields
      brand: project?.brandName || input.projectId,
      metadata: {
        url: project?.website || `Unknown Website`,
        market: project?.market || 'Unknown Market',
        flag: getMarketFlag(project?.market),
        competitors: project?.competitors?.join(', ') || 'Unknown Competitors',
        date: input.date.toISOString().split('T')[0],
        models: modelsList,
      },
      kpi: {
        pulse: {
          value: `${this.formatPercentage(input.spontaneous?.summary?.mentionRate)}`,
          description: 'Global Visibility Score across all tested models',
        },
        tone: {
          value: `${this.formatPercentage(sentimentValue)}`,
          status: sentimentStatus,
          description: 'Overall sentiment score across all models',
        },
        accord: {
          value: accordValue,
          status: accordStatus,
          description: 'Brand compliance with provided attributes',
        },
        arena: {
          competitors: this.getArenaDataForReport(input, project)?.competitors,
          description: 'Top competitors mentioned by AI models',
        },
      },
      pulse: this.getPulseDataForReport(input),
      tone: this.getToneDataForReport(input),
      accord: this.getAccordDataForReport(input, project),
      arena: this.getArenaDataForReport(input, project),
      brandBattle: this.getBrandBattleDataForReport(input),
      trace: this.getTraceDataForReport(input),
      citationsData: this.getCitationsDataForReport(input),
      llmVersions: input.llmVersions || {},
    };
  }

  private getBrandBattleDataForReport(
    input: BatchReportInput,
  ): WeeklyBrandReportEntity['brandBattle'] {
    return this.transformationService.getBrandBattleData(input.comparison);
  }

  /**
   * Convert a report entity to the API response DTO
   *
   * @param reportEntity Report entity to convert to API response
   * @returns ReportContentResponseDto for API response
   */
  /**
   * Convert a MongoDB document to a fully formatted entity
   * @param document The MongoDB document from the database
   * @param project The project for additional context
   * @returns A properly formatted WeeklyBrandReportEntity
   */
  convertDocumentToEntity(
    document: Record<string, any>,
    project: Project,
  ): WeeklyBrandReportEntity {
    // For MongoDB documents that already have formatted data, use it directly
    if (document.brand && document.metadata && document.kpi) {
      const entity: WeeklyBrandReportEntity = {
        id: document.id,
        projectId: document.projectId,
        brand: document.brand,
        date: document.date,
        generatedAt: document.generatedAt,
        batchExecutionId: document.batchExecutionId,
        metadata: document.metadata,
        kpi: document.kpi,
        pulse: {
          promptsTested: document.pulse?.promptsTested || 0,
          modelVisibility: document.pulse?.modelVisibility || [],
        },
        tone: {
          sentiments: document.tone?.sentiments || [],
          questions: document.tone?.questions || [],
        },
        accord: document.accord || {
          attributes: [],
          score: { value: '0/10', status: 'yellow' },
        },
        arena: document.arena || {
          competitors: [],
          battle: { competitors: [] },
        },
        brandBattle: document.brandBattle || {
          competitorAnalyses: [],
          commonStrengths: [],
          commonWeaknesses: [],
        },
        trace: document.trace || {
          consultedWebsites: [],
        },
        citationsData: document.citationsData,
        llmVersions: document.llmVersions,
      };

      return entity;
    }

    // Otherwise, convert from raw batch data
    const batchInput: BatchReportInput = {
      projectId: document.projectId,
      date: document.date,
      llmVersions: document.llmVersions || {},
      generatedAt: document.generatedAt,
      batchExecutionId: document.batchExecutionId,
      spontaneous: document.spontaneous,
      sentiment: document.sentiment,
      comparison: document.comparison,
      brandBattle: document.brandBattle,
    };

    return this.convertBatchInputToReportEntity(batchInput, project);
  }

  /**
   * Convert a report entity to a response DTO for the API
   * @param entity The report entity to convert
   * @returns A properly formatted ReportContentResponseDto
   */
  convertEntityToResponseDto(reportEntity: WeeklyBrandReportEntity): ReportContentResponseDto {
    // Create a response DTO that matches the entity structure
    const responseDto: ReportContentResponseDto = {
      id: reportEntity.id,
      projectId: reportEntity.projectId,
      generatedAt: reportEntity.generatedAt,
      batchExecutionId: reportEntity.batchExecutionId,
      brand: reportEntity.brand,
      metadata: reportEntity.metadata,
      kpi: reportEntity.kpi,
      pulse: reportEntity.pulse,
      tone: reportEntity.tone,
      accord: reportEntity.accord,
      arena: reportEntity.arena,
      brandBattle: reportEntity.brandBattle,
      trace: reportEntity.trace,
      citationsData: reportEntity.citationsData,
      // Only include raw data in development mode
      ...(process.env.NODE_ENV === 'development' &&
        reportEntity.rawData && {
          rawData: reportEntity.rawData,
        }),
    };

    return responseDto;
  }
}
