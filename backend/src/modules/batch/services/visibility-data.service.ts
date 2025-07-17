import { Injectable, Logger } from '@nestjs/common';
import { VisibilityResults as SpontaneousResults } from '../interfaces/batch.interfaces';
import { ReportDataUtilitiesService } from './report-data-utilities.service';

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
 * Service responsible for building visibility data from visibility results.
 * Handles visibility/spontaneous results processing and brand mention tracking.
 */
@Injectable()
export class VisibilityDataService {
  private readonly logger = new Logger(VisibilityDataService.name);

  constructor(
    private readonly reportDataUtilitiesService: ReportDataUtilitiesService,
  ) {}

  /**
   * Build visibility data from visibility results
   * Returns the structure that matches what's stored in the database
   */
  buildVisibilityData(
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
      queries: result.queries || [],
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
}