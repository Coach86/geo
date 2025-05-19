import { Injectable, Logger } from '@nestjs/common';
import { WeeklyBrandReport as WeeklyBrandReportEntity } from '../entities/weekly-brand-report.entity';
import { BatchReportInput } from '../interfaces/report-input.interfaces';
import { ReportTransformationService } from './report-transformation.service';
import { CompanyIdentityCard } from '@/modules/identity-card/entities/company-identity-card.entity';
import { getMarketFlag } from '@/common/constants/markets';
/**
 * Service dedicated to converting between different report formats
 * Acts as an explicit conversion layer between batch results and report entities
 */
@Injectable()
export class ReportConverterService {
  private readonly logger = new Logger(ReportConverterService.name);

  constructor(private readonly transformationService: ReportTransformationService) {}

  private formatPercentage(value: number): number {
    return value ? Math.round(value * 100) : 0;
  }

  private getPulseDataForReport(input: BatchReportInput): WeeklyBrandReportEntity['pulse'] {
    const formattedPulse = this.transformationService.formatPulseModelVisibility(
      input.spontaneous || { results: [], summary: { mentionRate: 0, topMentions: [] } },
    );
    return {
      promptsTested: input.spontaneous?.results
        ? new Set(input.spontaneous.results.map((r) => r.promptIndex)).size
        : 0,
      modelVisibility: formattedPulse,
      globalAverage: this.formatPercentage(input.spontaneous?.summary?.mentionRate || 0),
    };
  }

  private getToneDataForReport(input: BatchReportInput): WeeklyBrandReportEntity['tone'] {
    const formattedTone = this.transformationService.formatToneData(
      input.sentimentAccuracy || {
        results: [],
        summary: { overallSentiment: 'neutral', averageAccuracy: 0 },
      },
    );
    return this.transformationService.typeSafeToneData(formattedTone);
  }

  private getAccordDataForReport(
    input: BatchReportInput,
    identityCard: CompanyIdentityCard,
  ): WeeklyBrandReportEntity['accord'] {
    const accordValue = `${Math.round((input.sentimentAccuracy?.summary?.averageAccuracy || 0) * 10)}/10`;
    const accordStatus = (
      (input.sentimentAccuracy?.summary?.averageAccuracy || 0) > 0.6 ? 'green' : 'yellow'
    ) as 'green' | 'yellow' | 'red';
    const safeAttributes = this.transformationService.typeSafeAttributes(
      this.transformationService.generateAttributesList(input.sentimentAccuracy, identityCard),
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
    identityCard: CompanyIdentityCard,
  ): WeeklyBrandReportEntity['arena'] {
    const formattedArena = this.transformationService.formatArenaData(
      input.comparison || {
        results: [],
        summary: { winRate: 0, keyDifferentiators: [] },
      },
      identityCard?.competitors || [],
    );
    return this.transformationService.typeSafeArenaData(formattedArena);
  }

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

    return {
      // Base fields
      id: '', // This will be set by the persistence layer
      companyId: input.companyId,
      generatedAt: input.generatedAt || new Date(),

      // New structured fields
      brand: identityCard?.brandName || input.companyId,
      metadata: {
        url: identityCard?.website || `Unknown Website`,
        market: identityCard?.market || 'Unknown Market',
        flag: getMarketFlag(identityCard?.market),
        competitors: identityCard?.competitors?.join(', ') || 'Unknown Competitors',
        date: input.weekStart.toISOString().split('T')[0],
        models: modelsList,
      },
      kpi: {
        pulse: {
          value: `${this.formatPercentage(input.spontaneous?.summary?.mentionRate)}%`,
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
      pulse: this.getPulseDataForReport(input),
      tone: this.getToneDataForReport(input),
      accord: this.getAccordDataForReport(input, identityCard),
      arena: this.getArenaDataForReport(input, identityCard),
      llmVersions: input.llmVersions || {},
    };
  }
}
