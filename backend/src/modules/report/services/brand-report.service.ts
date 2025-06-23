import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { BrandReportResponseDto } from '../dto/brand-report-response.dto';
import { AggregatedReportQueryDto } from '../dto/aggregated-report-query.dto';
import { AggregatedVisibilityResponseDto } from '../dto/aggregated-visibility-response.dto';
import { AggregatedAlignmentResponseDto } from '../dto/aggregated-alignment-response.dto';
import { AggregatedSentimentResponseDto } from '../dto/aggregated-sentiment-response.dto';
import { AggregatedExplorerResponseDto } from '../dto/aggregated-explorer-response.dto';
import { AggregatedCompetitionResponseDto } from '../dto/aggregated-competition-response.dto';
import { AggregatedCitationsDto } from '../dto/citation-item.dto';

// Import the new services
import { BrandReportQueryService } from './brand-report-query.service';
import { BrandReportMapperService } from './brand-report-mapper.service';
import { BrandReportCitationExtractorService } from './brand-report-citation-extractor.service';
import { BrandReportVariationCalculatorService } from './brand-report-variation-calculator.service';
import { BrandReportVisibilityAggregationService } from './brand-report-visibility-aggregation.service';
import { BrandReportAlignmentAggregationService } from './brand-report-alignment-aggregation.service';
import { BrandReportSentimentAggregationService } from './brand-report-sentiment-aggregation.service';
import { BrandReportCompetitionAggregationService } from './brand-report-competition-aggregation.service';
import { BrandReportExplorerAggregationService } from './brand-report-explorer-aggregation.service';

/**
 * Main service for brand report operations
 * Orchestrates the various specialized services
 */
@Injectable()
export class BrandReportService {
  private readonly logger = new Logger(BrandReportService.name);

  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
    private queryService: BrandReportQueryService,
    private mapperService: BrandReportMapperService,
    private citationExtractor: BrandReportCitationExtractorService,
    private variationCalculator: BrandReportVariationCalculatorService,
    private visibilityAggregation: BrandReportVisibilityAggregationService,
    private alignmentAggregation: BrandReportAlignmentAggregationService,
    private sentimentAggregation: BrandReportSentimentAggregationService,
    private competitionAggregation: BrandReportCompetitionAggregationService,
    private explorerAggregation: BrandReportExplorerAggregationService,
  ) {}

  // Delegate to query service
  async getProjectReports(
    projectId: string,
    limit: number = 10
  ): Promise<BrandReportResponseDto[]> {
    return this.queryService.getProjectReports(projectId, limit);
  }

  async getReport(reportId: string): Promise<BrandReportResponseDto> {
    return this.queryService.getReport(reportId);
  }

  async getExplorerData(reportId: string) {
    return this.queryService.getExplorerData(reportId);
  }

  async getVisibilityData(reportId: string) {
    return this.queryService.getVisibilityData(reportId);
  }

  async getSentimentData(reportId: string) {
    return this.queryService.getSentimentData(reportId);
  }

  async getAlignmentData(reportId: string) {
    return this.queryService.getAlignmentData(reportId);
  }

  async getCompetitionData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('competition')
      .lean();

    if (!report || !report.competition) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    // Extract citations if detailed results exist
    let citations: AggregatedCitationsDto | undefined;
    if (report.competition.detailedResults) {
      citations = this.citationExtractor.extractCitationsFromCompetition(
        report.competition.detailedResults
      );
    }

    return {
      ...report.competition,
      citations
    };
  }

  // Delegate to visibility aggregation service
  async getAggregatedVisibility(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedVisibilityResponseDto> {
    return this.visibilityAggregation.getAggregatedVisibility(projectId, query);
  }

  // Delegate to aggregation services
  async getAggregatedAlignment(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedAlignmentResponseDto> {
    return this.alignmentAggregation.getAggregatedAlignment(projectId, query);
  }

  async getAggregatedSentiment(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedSentimentResponseDto> {
    return this.sentimentAggregation.getAggregatedSentiment(projectId, query);
  }

  async getAggregatedCompetition(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedCompetitionResponseDto> {
    return this.competitionAggregation.getAggregatedCompetition(projectId, query);
  }

  async getAggregatedExplorer(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedExplorerResponseDto> {
    return this.explorerAggregation.getAggregatedExplorer(projectId, query);
  }

  @OnEvent('project.deleted')
  async handleProjectDeleted(event: { projectId: string }) {
    const { projectId } = event;
    try {
      const result = await this.brandReportModel.deleteMany({ projectId });
      this.logger.log(`Deleted ${result.deletedCount} brand reports for project ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to delete brand reports for project ${projectId}`, error);
    }
  }
}