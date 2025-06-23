import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProjectCreatedEvent } from '../events/project-created.event';
import { ProjectCompetitorsUpdatedEvent } from '../events/project-competitors-updated.event';
import { ProjectService } from '../services/project.service';
import { CompetitorWebsiteResolverService } from '../services/competitor-website-resolver.service';
import { ProjectRepository } from '../repositories/project.repository';

@Injectable()
export class CompetitorWebsiteListener {
  private readonly logger = new Logger(CompetitorWebsiteListener.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly competitorWebsiteResolver: CompetitorWebsiteResolverService,
    private readonly projectRepository: ProjectRepository,
  ) {}

  @OnEvent('project.created', { async: true })
  async handleProjectCreated(event: ProjectCreatedEvent) {
    try {
      this.logger.log(`Processing competitor websites for new project: ${event.projectId}`);
      await this.processCompetitorWebsites(event.projectId);
    } catch (error) {
      this.logger.error(
        `Failed to process competitor websites for project ${event.projectId}: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('project.competitors.updated', { async: true })
  async handleCompetitorsUpdated(event: ProjectCompetitorsUpdatedEvent) {
    try {
      this.logger.log(`Processing competitor websites for updated project: ${event.projectId}`);
      await this.processCompetitorWebsites(event.projectId);
    } catch (error) {
      this.logger.error(
        `Failed to process competitor websites for project ${event.projectId}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async processCompetitorWebsites(projectId: string) {
    // Fetch the project
    const project = await this.projectService.findById(projectId);
    
    if (!project.competitors || project.competitors.length === 0) {
      this.logger.log(`No competitors found for project ${projectId}`);
      return;
    }

    this.logger.log(`Processing ${project.competitors.length} competitors for project ${projectId}`);

    // Initialize competitorDetails if it doesn't exist
    const existingDetails = new Map(
      (project.competitorDetails || []).map((detail) => [detail.name, detail]),
    );

    // Process each competitor
    const updatedDetails = [];
    
    for (const competitorName of project.competitors) {
      try {
        // Check if we already have details for this competitor
        const existing = existingDetails.get(competitorName);
        
        if (existing?.website) {
          this.logger.log(`Website already exists for competitor ${competitorName}, skipping`);
          updatedDetails.push(existing);
          continue;
        }

        // Resolve website if we don't have it
        let website = existing?.website;
        let confidence = 'low';

        if (!website) {
          this.logger.log(`Resolving website for competitor: ${competitorName}`);
          const result = await this.competitorWebsiteResolver.resolveCompetitorWebsite(
            competitorName,
            project.industry,
          );
          website = result.website;
          confidence = result.confidence;
        }


        // Create updated competitor detail
        updatedDetails.push({
          name: competitorName,
          website: website || undefined,
        });

        this.logger.log(
          `Processed competitor ${competitorName}: website=${website || 'not found'} (confidence: ${confidence})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process competitor ${competitorName}: ${error.message}`,
        );
        // Still add the competitor with just the name
        updatedDetails.push({
          name: competitorName,
          website: existingDetails.get(competitorName)?.website,
        });
      }
    }

    // Update the project with the new competitor details
    try {
      await this.projectRepository.update(projectId, {
        competitorDetails: updatedDetails,
      });
      this.logger.log(
        `Successfully updated competitor details for project ${projectId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update competitor details for project ${projectId}: ${error.message}`,
        error.stack,
      );
    }
  }
}