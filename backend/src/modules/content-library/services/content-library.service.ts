import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContentItemRepository } from '../repositories/content-item.repository';
import { ContentItem } from '../entities/content-item.entity';
import { CreateContentItemDto } from '../dto/create-content-item.dto';
import { UpdateContentItemDto } from '../dto/update-content-item.dto';
import { ProjectService } from '../../project/services/project.service';

@Injectable()
export class ContentLibraryService {
  private readonly logger = new Logger(ContentLibraryService.name);

  constructor(
    private readonly contentItemRepository: ContentItemRepository,
    private readonly projectService: ProjectService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createContentItem(createDto: CreateContentItemDto): Promise<ContentItem> {
    // Verify project exists
    const project = await this.projectService.findById(createDto.projectId);
    if (!project) {
      throw new NotFoundException(`Project ${createDto.projectId} not found`);
    }

    // Check if URL already exists for this project
    const existing = await this.contentItemRepository.findByUrl(createDto.url, createDto.projectId);
    if (existing) {
      throw new BadRequestException(`URL ${createDto.url} already exists in content library for this project`);
    }

    // Create content item
    const contentItem = await this.contentItemRepository.create({
      projectId: createDto.projectId,
      url: createDto.url,
      title: createDto.title,
      content: createDto.content,
      metadata: createDto.metadata,
      status: 'pending',
    });

    // Emit event for potential processing
    this.eventEmitter.emit('content-item.created', {
      contentItemId: contentItem.id,
      projectId: contentItem.projectId,
    });

    this.logger.log(`Created content item ${contentItem.id} for project ${contentItem.projectId}`);
    return contentItem;
  }

  async findByProjectId(projectId: string): Promise<ContentItem[]> {
    // Verify project exists
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return this.contentItemRepository.findByProjectId(projectId);
  }

  async findById(id: string): Promise<ContentItem> {
    const contentItem = await this.contentItemRepository.findById(id);
    if (!contentItem) {
      throw new NotFoundException(`Content item ${id} not found`);
    }
    return contentItem;
  }

  async updateContentItem(id: string, updateDto: UpdateContentItemDto): Promise<ContentItem> {
    const existing = await this.findById(id);
    
    const updated = await this.contentItemRepository.update(id, updateDto);
    if (!updated) {
      throw new NotFoundException(`Content item ${id} not found`);
    }

    this.logger.log(`Updated content item ${id}`);
    return updated;
  }

  async updateStatus(id: string, status: ContentItem['status']): Promise<ContentItem> {
    const existing = await this.findById(id);
    
    const updated = await this.contentItemRepository.updateStatus(id, status);
    if (!updated) {
      throw new NotFoundException(`Content item ${id} not found`);
    }

    this.logger.log(`Updated content item ${id} status to ${status}`);
    return updated;
  }

  async deleteContentItem(id: string): Promise<void> {
    const existing = await this.findById(id);
    
    const deleted = await this.contentItemRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Content item ${id} not found`);
    }

    // Emit event
    this.eventEmitter.emit('content-item.deleted', {
      contentItemId: id,
      projectId: existing.projectId,
    });

    this.logger.log(`Deleted content item ${id}`);
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    const count = await this.contentItemRepository.deleteByProjectId(projectId);
    
    if (count > 0) {
      this.eventEmitter.emit('content-items.deleted', {
        projectId,
        count,
      });
    }

    this.logger.log(`Deleted ${count} content items for project ${projectId}`);
    return count;
  }

  async getContentStatistics(projectId: string): Promise<{
    total: number;
    pending: number;
    processed: number;
    failed: number;
  }> {
    // Verify project exists
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const [total, pending, processed, failed] = await Promise.all([
      this.contentItemRepository.countByProjectId(projectId),
      this.contentItemRepository.countByProjectIdAndStatus(projectId, 'pending'),
      this.contentItemRepository.countByProjectIdAndStatus(projectId, 'processed'),
      this.contentItemRepository.countByProjectIdAndStatus(projectId, 'failed'),
    ]);

    return { total, pending, processed, failed };
  }

  async getProcessedContent(projectId: string): Promise<ContentItem[]> {
    // Verify project exists
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return this.contentItemRepository.findByProjectIdAndStatus(projectId, 'processed');
  }
}