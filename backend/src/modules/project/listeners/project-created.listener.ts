import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProjectCreatedEvent } from '../events/project-created.event';
import { ProjectService } from '../services/project.service';
import { FaviconService } from '../services/favicon.service';
import { ProjectRepository } from '../repositories/project.repository';

@Injectable()
export class ProjectCreatedListener {
  private readonly logger = new Logger(ProjectCreatedListener.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly faviconService: FaviconService,
    private readonly projectRepository: ProjectRepository,
  ) {}

  @OnEvent('project.created', { async: true })
  async handleProjectCreated(event: ProjectCreatedEvent) {
    try {
      this.logger.log(`Handling project.created event for project: ${event.projectId}`);
      
      // Fetch the project to get its website
      const project = await this.projectService.findById(event.projectId);
      
      if (!project.website) {
        this.logger.log(`No website found for project ${event.projectId}, skipping favicon fetch`);
        return;
      }

      // Check if favicon already exists
      if (project.favicon) {
        this.logger.log(`Favicon already exists for project ${event.projectId}, skipping fetch`);
        return;
      }

      // Build the full website URL
      const websiteUrl = this.faviconService.buildWebsiteUrl(project.website);
      
      // Extract favicon asynchronously
      this.logger.log(`Starting favicon extraction for project ${event.projectId} from ${websiteUrl}`);
      const favicon = await this.faviconService.extractFavicon(websiteUrl);
      
      if (favicon) {
        // Update the project with the favicon
        await this.projectRepository.update(project.projectId, { favicon });
        this.logger.log(`Successfully updated favicon for project ${event.projectId}`);
      } else {
        this.logger.log(`No favicon found for project ${event.projectId}`);
      }
    } catch (error) {
      // Don't throw - we don't want favicon fetching failures to affect the system
      this.logger.error(
        `Failed to fetch favicon for project ${event.projectId}: ${error.message}`,
        error.stack
      );
    }
  }
}