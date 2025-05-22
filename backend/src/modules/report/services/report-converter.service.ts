import { Injectable, Logger } from '@nestjs/common';
import { ComparisonResults } from '@/modules/batch/interfaces/batch.interfaces';
import { BatchReportInput } from '../interfaces/report-input.interfaces';
import { ReportTransformationService } from './report-transformation.service';
import { CompanyIdentityCard } from '@/modules/identity-card/entities/company-identity-card.entity';
import { getMarketFlag } from '@/common/constants/markets';
import {
  WeeklyBrandReportEntity,
  ApiSentimentResult,
  ApiQuestionResult,
  DatabaseSentimentResult,
  DatabaseQuestionResult,
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
    identityCard: CompanyIdentityCard,
  ): WeeklyBrandReportEntity['accord'] {
    // Calculate average of attribute scores
    const attributeScores = input.accord?.summary?.averageAttributeScores || {};
    const scores = Object.values(attributeScores);
    const avgScore =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0.5;

    const accordValue = `${Math.round(avgScore * 10)}/10`;
    const accordStatus = (avgScore > 0.6 ? 'green' : 'yellow') as 'green' | 'yellow' | 'red';

    const safeAttributes = this.transformationService.generateAttributesList(
      identityCard,
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
    identityCard: CompanyIdentityCard,
  ): WeeklyBrandReportEntity['arena'] {
    // Only pass the comparison data, regardless of format
    const formattedArena = this.transformationService.formatArenaData(
      input.spontaneous,
      identityCard?.competitors || [],
    );
    return formattedArena;
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
      companyId: input.companyId,
      generatedAt: input.generatedAt || new Date(),
      weekStart: input.weekStart,
      batchExecutionId: input.batchExecutionId,
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
          competitors: this.getArenaDataForReport(input, identityCard)?.competitors,
          description: 'Top competitors mentioned by AI models',
        },
      },
      pulse: this.getPulseDataForReport(input),
      tone: this.getToneDataForReport(input),
      accord: this.getAccordDataForReport(input, identityCard),
      arena: this.getArenaDataForReport(input, identityCard),
      brandBattle: this.getBrandBattleDataForReport(input),
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
   * @param identityCard The identity card for additional context
   * @returns A properly formatted WeeklyBrandReportEntity
   */
  convertDocumentToEntity(
    document: Record<string, any>,
    identityCard: CompanyIdentityCard,
  ): WeeklyBrandReportEntity {
    // For MongoDB documents that already have formatted data, use it directly
    if (document.brand && document.metadata && document.kpi) {
      const entity: WeeklyBrandReportEntity = {
        id: document.id,
        companyId: document.companyId,
        brand: document.brand,
        weekStart: document.weekStart,
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
        llmVersions: document.llmVersions,
      };

      return entity;
    }

    // Otherwise, convert from raw batch data
    const batchInput: BatchReportInput = {
      companyId: document.companyId,
      weekStart: document.weekStart,
      llmVersions: document.llmVersions || {},
      generatedAt: document.generatedAt,
      batchExecutionId: document.batchExecutionId,
      spontaneous: document.spontaneous,
      sentiment: document.sentiment,
      comparison: document.comparison,
      brandBattle: document.brandBattle,
    };

    return this.convertBatchInputToReportEntity(batchInput, identityCard);
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
      companyId: reportEntity.companyId,
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
      // Only include raw data in development mode
      ...(process.env.NODE_ENV === 'development' &&
        reportEntity.rawData && {
          rawData: reportEntity.rawData,
        }),
    };

    return responseDto;
  }
}
