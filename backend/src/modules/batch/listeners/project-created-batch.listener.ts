import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProjectCreatedEvent } from '../../project/events/project-created.event';
import { BatchService } from '../services/batch.service';
import { BatchEventsGateway } from '../gateways/batch-events.gateway';
import { ProjectService } from '../../project/services/project.service';
import { OrganizationService } from '../../organization/services/organization.service';
import { PlanService } from '../../plan/services/plan.service';

@Injectable()
export class ProjectCreatedBatchListener {
  private readonly logger = new Logger(ProjectCreatedBatchListener.name);

  constructor(
    private readonly batchService: BatchService,
    private readonly batchEventsGateway: BatchEventsGateway,
    @Inject(forwardRef(() => ProjectService))
    private readonly projectService: ProjectService,
    @Inject(forwardRef(() => OrganizationService))
    private readonly organizationService: OrganizationService,
    @Inject(forwardRef(() => PlanService))
    private readonly planService: PlanService,
  ) {}

  @OnEvent('project.created', { async: true })
  async handleProjectCreated(event: ProjectCreatedEvent) {
    try {
      this.logger.log(`Handling project.created event for batch processing: ${event.projectId}`);
      
      // Wait for prompt sets to be created with retry mechanism
      const projectContext = await this.waitForPromptSets(event.projectId);
      if (!projectContext) {
        this.logger.warn(`Project context not found for ID: ${event.projectId}`);
        return;
      }

      // Mark as new project
      projectContext.isNewProject = true;

      // Check if organization has a free plan
      let isFreePlan = false;
      if (projectContext.organizationId) {
        try {
          const organization = await this.organizationService.findOne(projectContext.organizationId);
          // Free plan = no stripePlanId (undefined)
          // Paid plan = has stripePlanId (including 'manual')
          isFreePlan = !organization.stripePlanId;
        } catch (error) {
          this.logger.warn(`Could not check plan for organization ${projectContext.organizationId}: ${error.message}`);
          // Assume free plan on error
          isFreePlan = true;
        }
      } else {
        // No organization means free plan
        isFreePlan = true;
      }

      // Create a new batch execution record
      const batchExecution = await this.batchService.createBatchExecution(event.projectId, 'project_creation');
      this.logger.log(`Created initial batch execution ${batchExecution.id} for new project ${event.projectId} (${isFreePlan ? 'visibility-only' : 'full'})`);

      // Emit batch started event
      this.batchEventsGateway.emitBatchStarted(
        batchExecution.id,
        event.projectId,
        projectContext.brandName,
        isFreePlan ? 'visibility' : 'full'
      );

      // Start the batch processing in the background
      if (isFreePlan) {
        // For free plans, only run visibility pipeline
        this.processVisibilityOnlyBatch(projectContext, batchExecution.id)
          .then(() => {
            this.logger.log(`Completed initial visibility-only batch execution ${batchExecution.id} for project ${event.projectId}`);
            
            // Emit batch completed event
            this.batchEventsGateway.emitBatchCompleted(
              batchExecution.id,
              event.projectId,
              projectContext.brandName,
              'visibility'
            );
          })
          .catch((error) => {
            this.logger.error(`Failed initial visibility-only batch execution ${batchExecution.id} for project ${event.projectId}: ${error.message}`);
            this.batchService.failBatchExecution(batchExecution.id, error.message || 'Unknown error');
            
            // Emit batch failed event
            this.batchEventsGateway.emitBatchFailed(
              batchExecution.id,
              event.projectId,
              projectContext.brandName,
              'visibility',
              error.message || 'Unknown error'
            );
          });
      } else {
        // For paid plans, run all pipelines
        this.batchService
          .processProject(event.projectId, batchExecution.id)
          .then((result) => {
            this.logger.log(`Completed initial batch execution ${batchExecution.id} for project ${event.projectId}`);
            this.batchService.completeBatchExecution(batchExecution.id, result);
            
            // Emit batch completed event
            this.batchEventsGateway.emitBatchCompleted(
              batchExecution.id,
              event.projectId,
              projectContext.brandName,
              'full'
            );
          })
          .catch((error) => {
            this.logger.error(`Failed initial batch execution ${batchExecution.id} for project ${event.projectId}: ${error.message}`);
            this.batchService.failBatchExecution(batchExecution.id, error.message || 'Unknown error');
            
            // Emit batch failed event
            this.batchEventsGateway.emitBatchFailed(
              batchExecution.id,
              event.projectId,
              projectContext.brandName,
              'full',
              error.message || 'Unknown error'
            );
          });
      }
    } catch (error) {
      this.logger.error(`Failed to initiate batch processing for new project ${event.projectId}: ${error.message}`, error.stack);
      
      // Notify frontend of batch initialization failure
      try {
        // Get project details for the notification, fallback if not available
        let projectName = 'Unknown Project';
        try {
          const project = await this.projectService.findById(event.projectId);
          projectName = project?.brandName || 'Unknown Project';
        } catch (projectError) {
          this.logger.warn(`Could not fetch project name for notification: ${projectError.message}`);
        }

        // Emit batch failed event with a placeholder execution ID
        const placeholderExecutionId = `failed-init-${event.projectId}-${Date.now()}`;
        this.batchEventsGateway.emitBatchFailed(
          placeholderExecutionId,
          event.projectId,
          projectName,
          'visibility', // Default to visibility for free plans
          `Failed to start batch processing: ${error.message}`
        );
        
        this.logger.log(`Notified frontend of batch initialization failure for project ${event.projectId}`);
      } catch (notificationError) {
        this.logger.error(`Failed to notify frontend of batch failure: ${notificationError.message}`);
      }
    }
  }

  private async waitForPromptSets(projectId: string, maxRetries: number = 10): Promise<any> {
    let retries = 0;
    const baseDelay = 1000; // Start with 1 second
    
    while (retries < maxRetries) {
      try {
        // Try to get project context (this will throw if no prompt sets exist)
        const projectContext = await this.batchService.getProjectBatchContext(projectId);
        this.logger.log(`Successfully found prompt sets for project ${projectId} after ${retries} retries`);
        return projectContext;
      } catch (error) {
        if (error.message?.includes('has no prompt sets')) {
          retries++;
          const delay = baseDelay * Math.pow(1.5, retries - 1); // Exponential backoff with 1.5 factor
          
          if (retries < maxRetries) {
            this.logger.debug(`Prompt sets not ready for project ${projectId}, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            this.logger.error(`Failed to find prompt sets for project ${projectId} after ${maxRetries} retries`);
            throw new Error(`Prompt sets not available for project ${projectId} after ${maxRetries} retries`);
          }
        } else {
          // Different error, don't retry
          throw error;
        }
      }
    }
    
    return null;
  }

  // Background processing method for visibility-only batch (free plan)
  private async processVisibilityOnlyBatch(projectContext: any, batchExecutionId: string) {
    // Add batch execution ID to context
    const contextWithExecId = { ...projectContext, batchExecutionId };

    try {
      // Run only visibility pipeline
      const visibilityResults = await this.batchService.runVisibilityPipeline(contextWithExecId);

      // Create empty results for other pipelines
      const sentimentResults = { 
        results: [], 
        summary: {
          overallSentiment: 'neutral' as const,
          overallSentimentPercentage: 0
        },
        webSearchSummary: {
          usedWebSearch: false,
          webSearchCount: 0,
          consultedWebsites: []
        }
      };
      const alignmentResults = { 
        results: [], 
        summary: {
          averageAttributeScores: {}
        },
        webSearchSummary: {
          usedWebSearch: false,
          webSearchCount: 0,
          consultedWebsites: []
        }
      };
      const competitionResults = { 
        results: [], 
        summary: {
          competitorAnalyses: [],
          commonStrengths: [],
          commonWeaknesses: []
        },
        webSearchSummary: {
          usedWebSearch: false,
          webSearchCount: 0,
          consultedWebsites: []
        }
      };

      // Save all results
      await Promise.all([
        this.batchService.saveSinglePipelineResult(batchExecutionId, 'visibility', visibilityResults),
        this.batchService.saveSinglePipelineResult(batchExecutionId, 'sentiment', sentimentResults),
        this.batchService.saveSinglePipelineResult(batchExecutionId, 'alignment', alignmentResults),
        this.batchService.saveSinglePipelineResult(batchExecutionId, 'competition', competitionResults),
      ]);

      // Create and save the visibility-only report
      await this.batchService.createVisibilityOnlyReport(
        batchExecutionId,
        visibilityResults,
        sentimentResults,
        alignmentResults,
        competitionResults,
        contextWithExecId
      );
      
      return {
        batchExecutionId,
        results: {
          visibility: visibilityResults,
          sentiment: sentimentResults,
          alignment: alignmentResults,
          competition: competitionResults,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}