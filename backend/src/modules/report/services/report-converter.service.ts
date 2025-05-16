import { Injectable, Logger } from '@nestjs/common';
import { WeeklyBrandReport as WeeklyBrandReportEntity } from '../entities/weekly-brand-report.entity';
import { BatchReportInput } from '../interfaces/report-input.interfaces';
import { ReportTransformationService } from './report-transformation.service';
import { CompanyIdentityCard } from '@/modules/identity-card/entities/company-identity-card.entity';
/**
 * Service dedicated to converting between different report formats
 * Acts as an explicit conversion layer between batch results and report entities
 */
@Injectable()
export class ReportConverterService {
  private readonly logger = new Logger(ReportConverterService.name);

  constructor(private readonly transformationService: ReportTransformationService) {}

  /**
   * Converts batch report input data to a complete report entity
   * This is the main transformation function that explicitly shows how
   * raw batch data is converted to the structured report format
   *
   * @param input Batch report data from the batch module
   * @param identityCard Optional company identity card for additional metadata
   * @returns A fully formed report entity with both new and legacy structures
   */
  convertBatchInputToReportEntity(
    input: BatchReportInput,
    identityCard: CompanyIdentityCard,
  ): WeeklyBrandReportEntity {
    this.logger.debug(`Converting batch input to report entity for company ${input.companyId}`);

    // Get config data for models list by using the llmVersions keys
    const modelsList = Object.keys(input.llmVersions || {})
      .map((provider) => `${provider}`)
      .join(', ');

    // Transform raw data into formatted structures using the transformation service
    const formattedPulse = this.transformationService.formatPulseModelVisibility(
      input.spontaneous || { results: [], summary: { mentionRate: 0, topMentions: [] } },
      input.llmVersions || {},
    );

    const formattedTone = this.transformationService.formatToneData(
      input.sentimentAccuracy || {
        results: [],
        summary: { overallSentiment: 'neutral', averageAccuracy: 0 },
      },
    );

    const formattedArena = this.transformationService.formatArenaData(
      input.comparison || {
        results: [],
        summary: { winRate: 0, keyDifferentiators: [] },
      },
      identityCard?.competitors || [],
    );

    // Format sentiment value and status with helper methods
    const sentimentValue = this.transformationService.formatSentimentValue(
      input.sentimentAccuracy?.summary?.overallSentiment || 'neutral',
    );

    const sentimentStatus = this.transformationService.getSentimentStatus(
      input.sentimentAccuracy?.summary?.overallSentiment || 'neutral',
    ) as 'green' | 'yellow' | 'red';

    // Calculate accord score based on accuracy
    const accordValue = `${Math.round((input.sentimentAccuracy?.summary?.averageAccuracy || 0) * 10)}/10`;
    const accordStatus = (
      (input.sentimentAccuracy?.summary?.averageAccuracy || 0) > 0.6 ? 'green' : 'yellow'
    ) as 'green' | 'yellow' | 'red';

    // Apply type safety to the transformed data
    const safeTone = this.transformationService.typeSafeToneData(formattedTone);
    const safeAttributes = this.transformationService.typeSafeAttributes(
      this.transformationService.generateAttributesList(input.sentimentAccuracy, identityCard),
    );
    const safeArena = this.transformationService.typeSafeArenaData(formattedArena);

    // Construct the complete entity with both new and legacy structures
    return {
      // Base fields
      id: '', // This will be set by the persistence layer
      companyId: input.companyId,
      weekStart: input.weekStart,
      generatedAt: input.generatedAt || new Date(),

      // New structured fields
      brand: identityCard?.brandName || input.companyId,
      metadata: {
        url: identityCard?.website || `${input.companyId}.com`,
        market: identityCard?.market || 'US Market / English',
        flag: '🇺🇸', // Default flag
        competitors: identityCard?.competitors?.join(', ') || 'Key competitors',
        date: input.weekStart.toISOString().split('T')[0],
        models: modelsList,
      },
      kpi: {
        pulse: {
          value: `${input.spontaneous?.summary?.mentionRate || 0}%`,
          description: 'Global Visibility Score across all tested models',
        },
        tone: {
          value: sentimentValue,
          status: sentimentStatus,
          description: 'Overall sentiment score across all models',
        },
        accord: {
          value: accordValue,
          status: accordStatus,
          description: 'Brand compliance with provided attributes',
        },
        arena: {
          competitors: this.transformationService.getCompetitorNames(
            input.comparison,
            identityCard?.competitors,
          ),
          description: 'Top competitors mentioned by AI models',
        },
      },
      pulse: {
        promptsTested: input.spontaneous?.results?.length || 0,
        modelVisibility: formattedPulse,
      },
      tone: safeTone,
      accord: {
        attributes: safeAttributes,
        score: {
          value: accordValue,
          status: accordStatus,
        },
      },
      arena: safeArena,

      // Legacy fields for compatibility
      spontaneous: input.spontaneous || {
        results: [],
        summary: { mentionRate: 0, topMentions: [] },
      },
      sentimentAccuracy: input.sentimentAccuracy || {
        results: [],
        summary: { overallSentiment: 'neutral', averageAccuracy: 0 },
      },
      comparison: input.comparison || {
        results: [],
        summary: { winRate: 0, keyDifferentiators: [] },
      },
      llmVersions: input.llmVersions || {},
    };
  }
}
