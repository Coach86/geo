import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WeeklyBrandReport,
  WeeklyBrandReportDocument,
} from '../schemas/weekly-brand-report.schema';
import { WeeklyBrandReportEntity } from '../interfaces/report-types';

/**
 * Repository for WeeklyBrandReport MongoDB documents
 * Handles all direct interactions with the MongoDB model
 */
@Injectable()
export class WeeklyBrandReportRepository {
  private readonly logger = new Logger(WeeklyBrandReportRepository.name);

  constructor(
    @InjectModel(WeeklyBrandReport.name)
    private weeklyReportModel: Model<WeeklyBrandReportDocument>,
  ) {}

  /**
   * Create a new weekly brand report
   * @param report Data to create the report with
   * @returns The created report document
   */
  async create(reportData: Record<string, any>): Promise<WeeklyBrandReportDocument> {
    this.logger.debug(`Creating new report for project ${reportData.projectId}`);
    const newReport = new this.weeklyReportModel(reportData);
    return newReport.save();
  }

  /**
   * Find a report by its ID
   * @param reportId The unique ID of the report
   * @returns The report document or null if not found
   */
  async findById(reportId: string): Promise<WeeklyBrandReportDocument | null> {
    this.logger.debug(`Finding report by ID: ${reportId}`);
    const report = await this.weeklyReportModel.findOne({ id: reportId }).exec();
    return report;
  }

  /**
   * Find a report by its ID as a lean document (plain JS object)
   * @param reportId The unique ID of the report
   * @returns The report document as a plain object
   */
  async findByIdLean(reportId: string): Promise<Record<string, any> | null> {
    this.logger.debug(`Finding report by ID (lean): ${reportId}`);
    const report = await this.weeklyReportModel.findOne({ id: reportId }).lean().exec();
    return report;
  }

  /**
   * Get the latest report for a project
   * @param projectId The project ID
   * @returns The most recent report or null if none found
   */
  async findLatestByProjectId(projectId: string): Promise<WeeklyBrandReportDocument | null> {
    this.logger.debug(`Finding latest report for project: ${projectId}`);
    const report = await this.weeklyReportModel.findOne({ projectId: projectId }).sort({ date: -1 }).exec();
    return report;
  }


  /**
   * Get the latest report for a project as a lean document
   * @param projectId The project ID
   * @returns The most recent report as a plain object
   */
  async findLatestByProjectIdLean(projectId: string): Promise<Record<string, any> | null> {
    this.logger.debug(`Finding latest report for project (lean): ${projectId}`);
    const report = await this.weeklyReportModel
      .findOne({ projectId: projectId })
      .sort({ date: -1 })
      .lean()
      .exec();
    return report;
  }


  /**
   * Get all reports for a project
   * @param projectId The project ID
   * @returns Array of reports sorted by date (newest first)
   */
  async findByProjectId(projectId: string): Promise<WeeklyBrandReportDocument[]> {
    this.logger.debug(`Finding all reports for project: ${projectId}`);
    const reports = await this.weeklyReportModel.find({ projectId: projectId }).sort({ date: -1 }).exec();
    return reports;
  }


  /**
   * Count how many reports exist for a project
   * @param projectId The project ID
   * @returns The number of reports
   */
  async countByProjectId(projectId: string): Promise<number> {
    this.logger.debug(`Counting reports for project: ${projectId}`);
    return this.weeklyReportModel.countDocuments({ projectId: projectId }).exec();
  }


  /**
   * Update a report by ID
   * @param reportId The unique ID of the report
   * @param reportData The data to update
   * @returns The updated report
   */
  async updateById(
    reportId: string,
    reportData: Partial<WeeklyBrandReport>,
  ): Promise<WeeklyBrandReportDocument | null> {
    this.logger.debug(`Updating report: ${reportId}`);
    return this.weeklyReportModel
      .findOneAndUpdate({ id: reportId }, reportData, { new: true })
      .exec();
  }

  /**
   * Delete a report by ID
   * @param reportId The unique ID of the report
   * @returns True if deleted, false if not found
   */
  async deleteById(reportId: string): Promise<boolean> {
    this.logger.debug(`Deleting report: ${reportId}`);
    const result = await this.weeklyReportModel.deleteOne({ id: reportId }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Delete all reports for a project
   * @param projectId The project ID
   * @returns The number of reports deleted
   */
  async deleteByProjectId(projectId: string): Promise<number> {
    this.logger.debug(`Deleting all reports for project: ${projectId}`);
    const result = await this.weeklyReportModel.deleteMany({ projectId: projectId }).exec();
    return result.deletedCount;
  }

}
