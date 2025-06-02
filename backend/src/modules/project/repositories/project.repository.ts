import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project as ProjectSchema, ProjectDocument } from '../schemas/project-base.schema';
import { Project } from '../entities/project.entity';
import { UserRepository } from '../../user/repositories/user.repository';

@Injectable()
export class ProjectRepository {
  private readonly logger = new Logger(ProjectRepository.name);

  constructor(
    @InjectModel('Project') private projectModel: Model<ProjectDocument>,
    private userRepository: UserRepository,
  ) {}

  /**
   * Save a project to the database
   */
  async save(projectData: any): Promise<ProjectDocument> {
    const newProject = new this.projectModel(projectData);
    return await newProject.save();
  }

  /**
   * Find a user by ID
   */
  async findUserById(userId: string): Promise<any> {
    try {
      return await this.userRepository.findById(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Find a project by project ID
   */
  async findById(projectId: string): Promise<ProjectDocument> {
    const project = await this.projectModel.findOne({ id: projectId }).exec();

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return project;
  }

  /**
   * Find all projects, optionally filtered by user ID
   */
  async findAll(userId?: string): Promise<ProjectDocument[]> {
    const query: any = {};

    if (userId) {
      query.userId = userId;
    }

    return await this.projectModel.find(query).sort({ updatedAt: -1 }).exec();
  }

  /**
   * Update a project
   */
  async update(projectId: string, updateData: any): Promise<ProjectDocument> {
    const updatedProject = await this.projectModel
      .findOneAndUpdate(
        { id: projectId },
        { $set: updateData },
        { new: true }, // Return the updated document
      )
      .exec();

    if (!updatedProject) {
      throw new NotFoundException(`Project with ID ${projectId} not found after update`);
    }

    return updatedProject;
  }

  /**
   * Delete a project
   */
  async remove(projectId: string): Promise<void> {
    await this.projectModel.deleteOne({ id: projectId }).exec();
  }

  /**
   * Map database document to entity
   */
  mapToEntity(document: ProjectDocument): Project {
    return {
      projectId: document.id,
      brandName: document.brandName,
      website: document.website,
      industry: document.industry,
      market: document.market,
      shortDescription: document.shortDescription,
      fullDescription: document.fullDescription,
      keyBrandAttributes: document.keyBrandAttributes,
      competitors: document.competitors,
      updatedAt: document.updatedAt instanceof Date ? document.updatedAt : new Date(),
      userId: document.userId,
      language: document.language,
    };
  }
}
