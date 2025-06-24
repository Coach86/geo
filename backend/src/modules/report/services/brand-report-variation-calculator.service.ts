import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { AggregatedReportQueryDto } from '../dto/aggregated-report-query.dto';
import { 
  ModelVisibilityItem, 
  DetailedAlignmentResult, 
  AttributeScore,
  BrandReportVisibilitySelect,
  BrandReportAlignmentSelect,
  ArenaMetric
} from '../types/brand-report.types';

/**
 * Service for calculating variations in report metrics over time
 * Handles period comparisons and trend analysis
 */
@Injectable()
export class BrandReportVariationCalculatorService {
  private readonly logger = new Logger(BrandReportVariationCalculatorService.name);

  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
  ) {}

  async calculateVariation(
    projectId: string,
    query: AggregatedReportQueryDto,
    selectedModels: string[],
    type: 'visibility' | 'alignment'
  ): Promise<number> {
    this.logger.log(`[calculateVariation] Starting for type: ${type}, projectId: ${projectId}`);
    
    const dateFilter = this.buildDateFilter(projectId, query);
    const allReports = await this.brandReportModel
      .find(dateFilter)
      .select(`reportDate ${type}`)
      .sort({ reportDate: 1 })
      .lean();

    if (allReports.length === 0) return 0;

    const { previousStartDate, previousEndDate } = this.calculatePeriodDates(
      query, 
      allReports
    );

    if (!previousStartDate || !previousEndDate) {
      return await this.handleSinglePointVariation(
        projectId,
        query,
        allReports,
        selectedModels,
        type
      );
    }

    const previousReports = await this.brandReportModel
      .find({
        projectId,
        reportDate: { $gte: previousStartDate, $lt: previousEndDate }
      })
      .select(`reportDate ${type}`)
      .lean();

    if (previousReports.length === 0) return 0;

    const currentScore = this.calculatePeriodScore(allReports, selectedModels, type);
    const previousScore = this.calculatePeriodScore(previousReports, selectedModels, type);

    if (previousScore === 0) return 0;

    return Math.round(currentScore - previousScore);
  }

  async calculateCompetitorVariation(
    projectId: string,
    query: AggregatedReportQueryDto,
    competitorName: string,
    selectedModels?: string[]
  ): Promise<number> {
    this.logger.log(`[calculateCompetitorVariation] Starting for: ${competitorName}`, {
      selectedModels: selectedModels || 'all'
    });
    
    const dateFilter = this.buildDateFilter(projectId, query);
    const allReports = await this.brandReportModel
      .find(dateFilter)
      .select('reportDate visibility')
      .sort({ reportDate: 1 })
      .lean();

    if (allReports.length === 0) return 0;

    const { previousStartDate, previousEndDate } = this.calculatePeriodDates(
      query,
      allReports
    );

    if (!previousStartDate || !previousEndDate) {
      return await this.handleSinglePointCompetitorVariation(
        projectId,
        query,
        allReports,
        competitorName,
        selectedModels
      );
    }

    const previousReports = await this.brandReportModel
      .find({
        projectId,
        reportDate: { $gte: previousStartDate, $lt: previousEndDate }
      })
      .select('reportDate visibility')
      .lean();

    if (previousReports.length === 0) return 0;

    const currentScore = this.calculateCompetitorPeriodScore(allReports, competitorName, selectedModels);
    const previousScore = this.calculateCompetitorPeriodScore(previousReports, competitorName, selectedModels);

    if (previousScore === 0) return 0;

    return Math.round(currentScore - previousScore);
  }

  async calculateSentimentVariation(
    projectId: string,
    query: AggregatedReportQueryDto,
    selectedModels: string[]
  ): Promise<number> {
    return this.calculateVariation(projectId, query, selectedModels, 'alignment');
  }

  private buildDateFilter(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Record<string, unknown> {
    const dateFilter: Record<string, unknown> = { projectId };
    
    if (query.startDate || query.endDate) {
      dateFilter.reportDate = {};
      if (query.startDate) {
        (dateFilter.reportDate as Record<string, unknown>).$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setDate(endDate.getDate() + 1);
        (dateFilter.reportDate as Record<string, unknown>).$lt = endDate;
      }
    }
    
    return dateFilter;
  }

  private calculatePeriodDates(
    query: AggregatedReportQueryDto,
    allReports: BrandReportDocument[]
  ): { previousStartDate?: Date; previousEndDate?: Date } {
    let periodLength: number;
    let previousStartDate: Date | undefined;
    let previousEndDate: Date | undefined;

    if (query.startDate && query.endDate) {
      const queryStart = new Date(query.startDate);
      const queryEnd = new Date(query.endDate);
      periodLength = queryEnd.getTime() - queryStart.getTime();
      
      if (periodLength > 0) {
        previousEndDate = queryStart;
        previousStartDate = new Date(queryStart.getTime() - periodLength);
      }
    } else {
      const startDate = allReports[0].reportDate;
      const endDate = allReports[allReports.length - 1].reportDate;
      periodLength = endDate.getTime() - startDate.getTime();

      if (periodLength > 0) {
        previousEndDate = startDate;
        previousStartDate = new Date(startDate.getTime() - periodLength);
      }
    }

    return { previousStartDate, previousEndDate };
  }

  private async handleSinglePointVariation(
    projectId: string,
    query: AggregatedReportQueryDto,
    allReports: BrandReportDocument[],
    selectedModels: string[],
    type: 'visibility' | 'alignment'
  ): Promise<number> {
    const referenceDate = query.startDate 
      ? new Date(query.startDate)
      : allReports[0].reportDate;

    const previousReport = await this.brandReportModel
      .findOne({ projectId, reportDate: { $lt: referenceDate } })
      .select(`reportDate ${type}`)
      .sort({ reportDate: -1 })
      .lean();

    if (!previousReport) return 0;

    const currentScore = this.calculatePeriodScore(allReports, selectedModels, type);
    const previousScore = this.calculatePeriodScore([previousReport], selectedModels, type);

    if (previousScore === 0) return 0;

    return Math.round(currentScore - previousScore);
  }

  private async handleSinglePointCompetitorVariation(
    projectId: string,
    query: AggregatedReportQueryDto,
    allReports: BrandReportDocument[],
    competitorName: string,
    selectedModels?: string[]
  ): Promise<number> {
    const referenceDate = query.startDate
      ? new Date(query.startDate)
      : allReports[0].reportDate;

    const previousReport = await this.brandReportModel
      .findOne({ projectId, reportDate: { $lt: referenceDate } })
      .select('reportDate visibility')
      .sort({ reportDate: -1 })
      .lean();

    if (!previousReport) return 0;

    const currentScore = this.calculateCompetitorPeriodScore(allReports, competitorName, selectedModels);
    const previousScore = this.calculateCompetitorPeriodScore([previousReport], competitorName, selectedModels);

    if (previousScore === 0) return 0;

    return Math.round(currentScore - previousScore);
  }

  private calculatePeriodScore(
    reports: (BrandReportVisibilitySelect | BrandReportAlignmentSelect)[],
    selectedModels: string[],
    type: 'visibility' | 'alignment'
  ): number {
    let total = 0;
    let count = 0;

    reports.forEach(report => {
      if (type === 'visibility' && 'visibility' in report && report.visibility?.modelVisibility) {
        const filtered = report.visibility.modelVisibility.filter((mv: ModelVisibilityItem) =>
          selectedModels.includes(mv.model)
        );
        if (filtered.length > 0) {
          const avg = filtered.reduce(
            (sum: number, mv: ModelVisibilityItem) => sum + mv.mentionRate, 
            0
          ) / filtered.length;
          total += avg;
          count++;
        }
      } else if (type === 'alignment' && 'alignment' in report && report.alignment?.detailedResults) {
        const filtered = report.alignment.detailedResults.filter((r: DetailedAlignmentResult) =>
          selectedModels.includes(r.model)
        );
        let scoreSum = 0;
        let scoreCount = 0;
        filtered.forEach((result: DetailedAlignmentResult) => {
          result.attributeScores?.forEach((as: AttributeScore) => {
            scoreSum += as.score;
            scoreCount++;
          });
        });
        if (scoreCount > 0) {
          total += (scoreSum / scoreCount) * 100;
          count++;
        }
      }
    });

    return count > 0 ? total / count : 0;
  }

  private calculateCompetitorPeriodScore(
    reports: BrandReportDocument[],
    competitorName: string,
    selectedModels?: string[]
  ): number {
    let totalScore = 0;
    let scoreCount = 0;

    reports.forEach(report => {
      if (report.visibility?.arenaMetrics && Array.isArray(report.visibility.arenaMetrics)) {
        const competitor = report.visibility.arenaMetrics.find(
          (metric: ArenaMetric) => metric.name === competitorName
        );
        
        if (competitor) {
          let score: number;
          
          // If models are selected and modelsMentionsRate is available, calculate filtered score
          if (selectedModels && selectedModels.length > 0 && competitor.modelsMentionsRate) {
            const filteredRates = competitor.modelsMentionsRate.filter(mmr => 
              selectedModels.includes(mmr.model)
            );
            
            if (filteredRates.length > 0) {
              const totalRate = filteredRates.reduce((sum, mmr) => sum + (mmr.mentionsRate || 0), 0);
              score = Math.round(totalRate / filteredRates.length);
            } else {
              score = 0;
            }
          } else {
            // Otherwise use the global score
            score = parseInt(competitor.global.replace('%', ''), 10);
          }
          
          if (!isNaN(score)) {
            totalScore += score;
            scoreCount++;
          }
        }
      }
    });

    return scoreCount > 0 ? totalScore / scoreCount : 0;
  }
}