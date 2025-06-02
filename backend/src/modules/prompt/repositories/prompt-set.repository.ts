import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptSet, PromptSetDocument } from '../schemas/prompt-set.schema';

/**
 * Repository for PromptSet MongoDB documents
 * Handles all direct interactions with the MongoDB model
 */
@Injectable()
export class PromptSetRepository {
  private readonly logger = new Logger(PromptSetRepository.name);

  constructor(
    @InjectModel(PromptSet.name)
    private promptSetModel: Model<PromptSetDocument>,
  ) {}

  /**
   * Create a new prompt set
   * @param promptSetData Data to create the prompt set with
   * @returns The created prompt set document
   */
  async create(promptSetData: Partial<PromptSet>): Promise<PromptSetDocument> {
    this.logger.debug(`Creating new prompt set for project ${promptSetData.projectId}`);
    const newPromptSet = new this.promptSetModel(promptSetData);
    return newPromptSet.save();
  }

  /**
   * Find prompt sets by project ID
   * @param projectId The project ID
   * @returns The prompt set document or null if not found
   */
  async findByProjectId(projectId: string): Promise<PromptSetDocument | null> {
    this.logger.debug(`Finding prompt set by project ID: ${projectId}`);
    return this.promptSetModel.findOne({ projectId: projectId }).exec();
  }


  /**
   * Find all prompt sets
   * @returns Array of all prompt sets
   */
  async findAll(): Promise<PromptSetDocument[]> {
    this.logger.debug('Finding all prompt sets');
    return this.promptSetModel.find().exec();
  }

  /**
   * Update a prompt set by project ID
   * @param projectId The project ID
   * @param promptSetData The data to update
   * @returns The updated prompt set
   */
  async updateByProjectId(
    projectId: string,
    promptSetData: Partial<PromptSet>,
  ): Promise<PromptSetDocument | null> {
    this.logger.debug(`Updating prompt set for project: ${projectId}`);
    return this.promptSetModel
      .findOneAndUpdate({ projectId: projectId }, promptSetData, { new: true })
      .exec();
  }


  /**
   * Upsert a prompt set by project ID
   * @param projectId The project ID
   * @param promptSetData The data to upsert
   * @returns The upserted prompt set
   */
  async upsertByProjectId(
    projectId: string,
    promptSetData: Partial<PromptSet>,
  ): Promise<PromptSetDocument | null> {
    this.logger.debug(`Upserting prompt set for project: ${projectId}`);
    return this.promptSetModel
      .findOneAndUpdate(
        { projectId: projectId }, 
        promptSetData, 
        { new: true, upsert: true }
      )
      .exec();
  }


  /**
   * Delete a prompt set by project ID
   * @param projectId The project ID
   * @returns True if deleted, false if not found
   */
  async deleteByProjectId(projectId: string): Promise<boolean> {
    this.logger.debug(`Deleting prompt set for project: ${projectId}`);
    const result = await this.promptSetModel.deleteOne({ projectId: projectId }).exec();
    return result.deletedCount > 0;
  }

}