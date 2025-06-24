import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FreePlanActivatedEvent } from '../../organization/events/free-plan-activated.event';
import { ProjectCreatedEvent } from '../../project/events/project-created.event';
import { ProjectService } from '../../project/services/project.service';

@Injectable()
export class FreePlanActivatedListener {
  private readonly logger = new Logger(FreePlanActivatedListener.name);

  constructor(
    @Inject(forwardRef(() => ProjectService))
    private readonly projectService: ProjectService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('free-plan.activated', { async: true })
  async handleFreePlanActivated(event: FreePlanActivatedEvent) {
    try {
      this.logger.log(`Handling free plan activation for organization ${event.organizationId}`);
      
      // Get all projects for the organization
      const projects = await this.projectService.findByOrganizationId(event.organizationId);
      
      if (projects.length === 0) {
        this.logger.warn(`No projects found for organization ${event.organizationId}`);
        return;
      }
      
      // Trigger batch processing for each project
      for (const project of projects) {
        this.logger.log(`Emitting project.created event for project ${project.projectId} after free plan activation`);
        this.eventEmitter.emit('project.created', new ProjectCreatedEvent(project.projectId));
      }
      
      this.logger.log(`Successfully triggered batch processing for ${projects.length} projects`);
    } catch (error) {
      this.logger.error(`Failed to handle free plan activation: ${error.message}`, error.stack);
    }
  }
}