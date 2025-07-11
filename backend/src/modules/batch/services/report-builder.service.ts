import { Injectable, Logger } from '@nestjs/common';
import {
  SentimentResults,
  AlignmentResults as AccuracyResults,
  CompetitionResults,
  VisibilityResults as SpontaneousResults,
} from '../interfaces/batch.interfaces';
import {
  ExplorerData,
  SentimentData,
  AlignmentData,
  CompetitionData,
} from '../../report/interfaces/report.interfaces';

// Define the database visibility data structure
interface DatabaseVisibilityData {
  overallMentionRate: number;
  promptsTested: number;
  modelVisibility: Array<{
    model: string;
    mentionRate: number;
  }>;
  arenaMetrics: Array<{
    name: string;
    size: 'lg' | 'md' | 'sm';
    global: string;
    modelsMentionsRate: Array<{
      model: string;
      mentionsRate: number;
    }>;
  }>;
  topMentions: Array<{
    mention: string;
    count: number;
  }>;
}

/**
 * Service responsible for building report data structures from pipeline results.
 * This centralizes all the data transformation logic to avoid duplication.
 */
@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);

  /**
   * Extract brand name from project website URL
   * @param projectWebsite The project website URL
   * @returns The extracted brand name or null
   */
  private extractBrandNameFromProject(projectWebsite?: string): string | null {
    if (!projectWebsite) return null;
    
    try {
      const url = new URL(projectWebsite);
      const domain = url.hostname.replace(/^www\./, '');
      // Extract the main part of the domain (before TLD)
      const parts = domain.split('.');
      if (parts.length >= 2) {
        return parts[0]; // Return the first part as brand name
      }
      return domain;
    } catch (e) {
      return null;
    }
  }

  /**
   * Build explorer data from all pipeline results
   */
  public buildExplorerData(
    spontaneousResults: SpontaneousResults,
    sentimentResults: SentimentResults,
    accuracyResults: AccuracyResults,
    comparisonResults: CompetitionResults,
    projectWebsite?: string,
    competitorDetails?: Array<{ name: string; website?: string }>,
  ): ExplorerData {
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
    
    // Build query-based structure
    const webSearchResults: any[] = [];
    const queryToCitationsMap = new Map<string, {
      query: string;
      timestamp?: string;
      citations: any[];
      models: Set<string>;
      promptTypes: Set<string>;
    }>();

    allCitationsData.forEach(({ modelId, modelProvider, promptIndex, promptType, citations, webSearchQueries }) => {
      // Count all citations for statistics
      citations.forEach((citation: any) => {
        totalCitations++;
        const domain = this.extractDomain(citation.url || citation.source || '');
        
        // Update source statistics
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
        }
      });
      
      // Only add to webSearchResults if we have web search queries
      if (webSearchQueries.length > 0) {
        // Process each web search query
        webSearchQueries.forEach((queryObj: any) => {
          const query = typeof queryObj === 'string' ? queryObj : (queryObj.query || queryObj);
          const timestamp = typeof queryObj === 'object' ? queryObj.timestamp : undefined;
          
          if (!queryToCitationsMap.has(query)) {
            queryToCitationsMap.set(query, {
              query,
              timestamp,
              citations: [],
              models: new Set(),
              promptTypes: new Set(),
            });
          }
          
          const entry = queryToCitationsMap.get(query)!;
          
          // Add citations for this query
          citations.forEach((citation: any) => {
            const domain = this.extractDomain(citation.url || citation.source || '');
            
            entry.citations.push({
              website: domain,
              link: citation.url,
              model: modelId,
              promptType,
              promptIndex,
              source: citation.source || domain,
            });
            
            entry.models.add(modelId);
            entry.promptTypes.add(promptType);
            
            // Add query association to existing source stats
            if (domain && sourceMap.has(domain)) {
              sourceMap.get(domain)!.associatedQueries.add(query);
            }
          });
        });
      }
    });

    // Convert map to array for webSearchResults
    webSearchResults.push(...Array.from(queryToCitationsMap.values()).map(entry => ({
      query: entry.query,
      timestamp: entry.timestamp,
      models: Array.from(entry.models),
      promptTypes: Array.from(entry.promptTypes),
      citations: entry.citations,
    })));

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

    // Calculate domain source analysis
    let domainSourceAnalysis: ExplorerData['domainSourceAnalysis'] | undefined;
    
    if (projectWebsite && totalCitations > 0) {
      // Extract brand domain without TLD
      const brandDomain = this.extractBrandDomain(projectWebsite);
      
      if (brandDomain) {
        let brandDomainCount = 0;
        let otherSourcesCount = 0;
        const competitorCounts: Record<string, number> = {};
        let unknownSourcesCount = 0;
        
        // Extract competitor domains
        const competitorDomains: Record<string, string> = {};
        if (competitorDetails && Array.isArray(competitorDetails)) {
          competitorDetails.forEach(competitor => {
            if (competitor.website) {
              const competitorDomain = this.extractBrandDomain(competitor.website);
              if (competitorDomain) {
                competitorDomains[competitorDomain] = competitor.name;
              }
            }
          });
        }
        
        // Count sources from brand domain vs competitors vs others
        sourceMap.forEach((stats, domain) => {
          if (this.isDomainMatch(domain, brandDomain)) {
            brandDomainCount += stats.totalMentions;
          } else {
            // Check if it's a competitor domain
            let isCompetitorDomain = false;
            for (const [competitorDomain, competitorName] of Object.entries(competitorDomains)) {
              if (this.isDomainMatch(domain, competitorDomain)) {
                competitorCounts[competitorName] = (competitorCounts[competitorName] || 0) + stats.totalMentions;
                isCompetitorDomain = true;
                break;
              }
            }
            
            if (!isCompetitorDomain) {
              unknownSourcesCount += stats.totalMentions;
            }
            
            otherSourcesCount += stats.totalMentions;
          }
        });
        
        const brandDomainPercentage = (brandDomainCount / totalCitations) * 100;
        const otherSourcesPercentage = (otherSourcesCount / totalCitations) * 100;
        const unknownSourcesPercentage = (unknownSourcesCount / totalCitations) * 100;
        
        // Create competitor breakdown
        const competitorBreakdown = Object.entries(competitorCounts)
          .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / totalCitations) * 1000) / 10 // Round to 1 decimal
          }))
          .sort((a, b) => b.count - a.count);
        
        domainSourceAnalysis = {
          brandDomainPercentage: Math.round(brandDomainPercentage * 10) / 10, // Round to 1 decimal
          otherSourcesPercentage: Math.round(otherSourcesPercentage * 10) / 10,
          brandDomainCount,
          otherSourcesCount,
          competitorBreakdown: competitorBreakdown.length > 0 ? competitorBreakdown : undefined,
          unknownSourcesCount,
          unknownSourcesPercentage: Math.round(unknownSourcesPercentage * 10) / 10,
        };
        
        this.logger.log(`Domain source analysis: ${brandDomainCount} from brand domain (${brandDomainPercentage.toFixed(1)}%), ${otherSourcesCount} from other sources (${otherSourcesPercentage.toFixed(1)}%)`);
        if (competitorBreakdown.length > 0) {
          this.logger.log(`Competitor breakdown: ${competitorBreakdown.map(c => `${c.name}: ${c.count} (${c.percentage}%)`).join(', ')}`);
        }
      }
    }

    // Calculate brand mention metrics
    let brandMentionMetrics: ExplorerData['brandMentionMetrics'] | undefined;
    
    // Extract brand name from project details
    const brandName = this.extractBrandNameFromProject(projectWebsite);
    
    if (brandName && totalCitations > 0) {
      let citationsWithBrandMentions = 0;
      const domainMentionCounts = new Map<string, { mentionCount: number; totalCount: number }>();
      const modelMentionCounts = new Map<string, { mentionCount: number; totalCitations: number }>();
      
      // Process all citations to check for brand mentions
      allCitationsData.forEach(({ modelId, citations }) => {
        citations.forEach((citation: any) => {
          const domain = this.extractDomain(citation.url || citation.link || citation.source || '');
          
          // Initialize domain counts if not exists
          if (domain && !domainMentionCounts.has(domain)) {
            domainMentionCounts.set(domain, { mentionCount: 0, totalCount: 0 });
          }
          
          // Initialize model counts if not exists
          if (!modelMentionCounts.has(modelId)) {
            modelMentionCounts.set(modelId, { mentionCount: 0, totalCitations: 0 });
          }
          
          // Count total citations
          if (domain) {
            domainMentionCounts.get(domain)!.totalCount++;
          }
          modelMentionCounts.get(modelId)!.totalCitations++;
          
          // Check if brand is mentioned
          if (citation.brandMentioned === true) {
            citationsWithBrandMentions++;
            
            if (domain) {
              domainMentionCounts.get(domain)!.mentionCount++;
            }
            modelMentionCounts.get(modelId)!.mentionCount++;
          }
        });
      });
      
      // Calculate brand mention rate
      const brandMentionRate = (citationsWithBrandMentions / totalCitations) * 100;
      
      // Get top domains with brand mentions
      const topDomainsWithBrandMentions = Array.from(domainMentionCounts.entries())
        .filter(([_, counts]) => counts.mentionCount > 0)
        .map(([domain, counts]) => ({
          domain,
          mentionCount: counts.mentionCount,
          totalCount: counts.totalCount,
          mentionRate: Math.round((counts.mentionCount / counts.totalCount) * 1000) / 10 // Round to 1 decimal
        }))
        .sort((a, b) => b.mentionCount - a.mentionCount)
        .slice(0, 10);
      
      // Get brand mentions by model
      const brandMentionsByModel = Array.from(modelMentionCounts.entries())
        .map(([model, counts]) => ({
          model,
          mentionCount: counts.mentionCount,
          totalCitations: counts.totalCitations,
          mentionRate: Math.round((counts.mentionCount / counts.totalCitations) * 1000) / 10 // Round to 1 decimal
        }))
        .sort((a, b) => b.mentionRate - a.mentionRate);
      
      brandMentionMetrics = {
        citationsWithBrandMentions,
        totalCitationsAnalyzed: totalCitations,
        brandMentionRate: Math.round(brandMentionRate * 10) / 10, // Round to 1 decimal
        topDomainsWithBrandMentions,
        brandMentionsByModel
      };
      
      this.logger.log(`Brand mention metrics: ${citationsWithBrandMentions}/${totalCitations} citations mention the brand (${brandMentionRate.toFixed(1)}%)`);
    }

    return {
      summary: {
        totalPrompts,
        promptsWithWebAccess,
        webAccessPercentage,
        totalCitations,
        uniqueSources: sourceMap.size,
      },
      topKeywords,
      topSources,
      webSearchResults,
      webAccess: {
        totalResponses: totalPrompts,
        successfulQueries: promptsWithWebAccess,
        failedQueries: 0,
      },
      domainSourceAnalysis,
      brandMentionMetrics,
    };
  }

  /**
   * Build visibility data from visibility results
   * Returns the structure that matches what's stored in the database
   */
  public buildVisibilityData(
    visibilityResults: SpontaneousResults, 
    brandName: string, 
    competitors: string[] = []
  ) {
    // Calculate model visibility from visibility results
    const modelMentions: Record<string, { mentioned: number; total: number }> = {};
    
    visibilityResults.results.forEach((result: any) => {
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
      (visibilityResults.summary.mentionRate || 0) * 100
    );

    // Extract competitor mentions for arena metrics
    const brandMentions: Record<string, Record<string, number>> = {};
    const models: string[] = Array.from(new Set(visibilityResults.results.map((r: any) => r.llmModel)));

    // Count only competitor mentions for arena metrics
    visibilityResults.results.forEach((result: any) => {
      if (result.topOfMind && Array.isArray(result.topOfMind)) {
        result.topOfMind.forEach((brand: any) => {
          // Handle both old format (string) and new format (TopOfMindBrand object)
          const brandNameExtracted = typeof brand === 'string' ? brand : brand.name;
          const brandType = typeof brand === 'string' ? 'unknown' : brand.type;
          
          // For backward compatibility: if type is unknown, check against configured competitors
          if (brandType === 'unknown') {
            const isConfiguredCompetitor = competitors.some(comp => 
              comp.toLowerCase() === brandNameExtracted.toLowerCase()
            );
            if (!isConfiguredCompetitor) return;
          } else if (brandType !== 'competitor') {
            // For new format, only include explicit competitors
            return;
          }
          
          // Initialize if not exists
          if (!brandMentions[brandNameExtracted]) {
            brandMentions[brandNameExtracted] = {};
            models.forEach(model => {
              brandMentions[brandNameExtracted][model] = 0;
            });
          }
          
          // Count the mention
          brandMentions[brandNameExtracted][result.llmModel] = 
            (brandMentions[brandNameExtracted][result.llmModel] || 0) + 1;
        });
      }
    });

    // Build arena metrics from competitor mentions
    const arenaMetrics = Object.entries(brandMentions).map(([brandNameMetric, modelMentionsData]) => {
      const modelsMentionsRate = models.map((model: string) => {
        const modelResults = visibilityResults.results.filter((r: any) => r.llmModel === model);
        const promptsTested = modelResults.length;
        const mentions = modelMentionsData[model] || 0;
        
        return {
          model,
          mentionsRate: promptsTested > 0 ? Math.round((mentions / promptsTested) * 100) : 0,
        };
      });

      // Calculate global mention rate
      const totalMentions = Object.values(modelMentionsData).reduce((sum: number, count: number) => sum + count, 0);
      const totalPrompts = visibilityResults.results.length;
      const globalRate = totalPrompts > 0 ? Math.round((totalMentions / totalPrompts) * 100) : 0;

      return {
        name: brandNameMetric,
        global: `${globalRate}%`,
        modelsMentionsRate,
      };
    })
    .sort((a, b) => parseInt(b.global) - parseInt(a.global)) // Sort by global rate descending
    .filter(metric => parseInt(metric.global) > 0) // Only include brands that were actually mentioned
    .slice(0, 10); // Limit to top 10 brands

    // Include topMentions from visibility results
    const topMentions = visibilityResults.summary.topMentionCounts || [];
    
    // Include topDomains from visibility results
    const topDomains = visibilityResults.summary.topDomains || [];

    // Log for debugging
    this.logger.log(`Building visibility data: ${topMentions.length} top mentions found`);
    if (topMentions.length > 0) {
      this.logger.log(`Top mentions sample: ${JSON.stringify(topMentions.slice(0, 3))}`);
    }
    if (topDomains.length > 0) {
      this.logger.log(`Top domains sample: ${JSON.stringify(topDomains.slice(0, 3))}`);
    }

    // Build detailed results with original prompts
    const detailedResults = visibilityResults.results.map((result: any) => ({
      model: result.llmModel,
      promptIndex: result.promptIndex,
      brandMentioned: result.mentioned,
      extractedCompanies: result.topOfMind.map((brand: any) => 
        typeof brand === 'string' ? brand : brand.name
      ),
      originalPrompt: result.originalPrompt || '',
      llmResponse: result.llmResponse || '',
      usedWebSearch: result.usedWebSearch || false,
      citations: result.citations || [],
      toolUsage: result.toolUsage || [],
    }));

    return {
      overallMentionRate,
      promptsTested: visibilityResults.results.length,
      modelVisibility,
      arenaMetrics,
      topMentions,
      topDomains,
      detailedResults,
    };
  }

  /**
   * Build sentiment data from sentiment results
   */
  public buildSentimentData(sentimentResults: SentimentResults): SentimentData {
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

  /**
   * Build alignment data from alignment results
   */
  public buildAlignmentData(accuracyResults: AccuracyResults): AlignmentData {
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
  public buildCompetitionData(
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

  /**
   * Extract domain from URL
   */
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

  /**
   * Count total prompts executed across all results
   */
  private countPromptsExecuted(...results: any[]): number {
    let count = 0;
    results.forEach(result => {
      if (result?.results) {
        count += result.results.length;
      }
    });
    return count;
  }

  /**
   * Extract brand domain from website URL (without TLD)
   */
  private extractBrandDomain(website: string): string {
    try {
      const url = new URL(website);
      const hostname = url.hostname.replace('www.', '');
      // Extract domain name without TLD (e.g., "sfr" from "sfr.fr")
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        return parts[0]; // Return the first part before the TLD
      }
      return hostname;
    } catch {
      return '';
    }
  }

  /**
   * Check if a domain matches the brand domain
   */
  private isDomainMatch(domain: string, brandDomain: string): boolean {
    if (!domain || !brandDomain) return false;
    
    // Remove www. prefix if present
    const cleanDomain = domain.replace('www.', '');
    
    // Check if the domain contains the brand domain
    // This will match "sfr.fr", "sfr.com", "business.sfr.fr", etc.
    return cleanDomain.includes(brandDomain + '.');
  }
}