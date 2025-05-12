import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../services/prisma.service';
import { WeeklyBrandReport } from '../entities/weekly-brand-report.entity';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getLatestReport(companyId: string): Promise<WeeklyBrandReport> {
    try {
      // Get the latest report for the company
      const report = await this.prisma.weeklyReport.findFirst({
        where: { companyId },
        orderBy: { weekStart: 'desc' },
      });

      if (!report) {
        throw new NotFoundException(`No reports found for company ${companyId}`);
      }

      return {
        id: report.id,
        companyId: report.companyId,
        weekStart: report.weekStart,
        spontaneous: typeof report.spontaneous === 'string' ? JSON.parse(report.spontaneous) : report.spontaneous,
        sentimentAccuracy: typeof report.sentiment === 'string' ? JSON.parse(report.sentiment) : report.sentiment,
        comparison: typeof report.comparison === 'string' ? JSON.parse(report.comparison) : report.comparison,
        llmVersions: typeof report.llmVersions === 'string' ? JSON.parse(report.llmVersions) : report.llmVersions,
        generatedAt: report.generatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get latest report: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve report: ${error.message}`);
    }
  }

  async saveReport(report: WeeklyBrandReport): Promise<WeeklyBrandReport> {
    try {
      // Check if a report already exists for this company and week
      const existingReport = await this.prisma.weeklyReport.findUnique({
        where: {
          companyId_weekStart: {
            companyId: report.companyId,
            weekStart: report.weekStart,
          },
        },
      });

      if (existingReport) {
        // Update existing report
        const updated = await this.prisma.weeklyReport.update({
          where: { id: existingReport.id },
          data: {
            spontaneous: JSON.stringify(report.spontaneous),
            sentiment: JSON.stringify(report.sentimentAccuracy),
            comparison: JSON.stringify(report.comparison),
            llmVersions: JSON.stringify(report.llmVersions),
            generatedAt: report.generatedAt,
          },
        });

        return {
          id: updated.id,
          companyId: updated.companyId,
          weekStart: updated.weekStart,
          spontaneous: typeof updated.spontaneous === 'string' ? JSON.parse(updated.spontaneous) : updated.spontaneous,
          sentimentAccuracy: typeof updated.sentiment === 'string' ? JSON.parse(updated.sentiment) : updated.sentiment,
          comparison: typeof updated.comparison === 'string' ? JSON.parse(updated.comparison) : updated.comparison,
          llmVersions: typeof updated.llmVersions === 'string' ? JSON.parse(updated.llmVersions) : updated.llmVersions,
          generatedAt: updated.generatedAt,
        };
      } else {
        // Create new report
        const created = await this.prisma.weeklyReport.create({
          data: {
            companyId: report.companyId,
            weekStart: report.weekStart,
            spontaneous: JSON.stringify(report.spontaneous),
            sentiment: JSON.stringify(report.sentimentAccuracy),
            comparison: JSON.stringify(report.comparison),
            llmVersions: JSON.stringify(report.llmVersions),
            generatedAt: report.generatedAt,
          },
        });

        return {
          id: created.id,
          companyId: created.companyId,
          weekStart: created.weekStart,
          spontaneous: typeof created.spontaneous === 'string' ? JSON.parse(created.spontaneous) : created.spontaneous,
          sentimentAccuracy: typeof created.sentiment === 'string' ? JSON.parse(created.sentiment) : created.sentiment,
          comparison: typeof created.comparison === 'string' ? JSON.parse(created.comparison) : created.comparison,
          llmVersions: typeof created.llmVersions === 'string' ? JSON.parse(created.llmVersions) : created.llmVersions,
          generatedAt: created.generatedAt,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to save report: ${error.message}`, error.stack);
      throw new Error(`Failed to save report: ${error.message}`);
    }
  }
}