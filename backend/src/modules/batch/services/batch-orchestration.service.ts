import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import pLimit from 'p-limit';
import { ProjectRepository } from '../../project/repositories/project.repository';
import { PromptSetRepository } from '../../prompt/repositories/prompt-set.repository';
import { OrganizationService } from '../../organization/services/organization.service';
import { ProjectService } from '../../project/services/project.service';
import { VisibilityPipelineService } from './visibility-pipeline.service';
import { SentimentPipelineService } from './sentiment-pipeline.service';
import { AlignmentPipelineService } from './alignment-pipeline.service';
import { CompetitionPipelineService } from './competition-pipeline.service';
import { BatchExecutionService } from './batch-execution.service';
import { BatchReportGenerationService } from './batch-report-generation.service';
import { BatchExecutionTrackingService } from './batch-execution-tracking.service';
import {
  ProjectBatchContext,
  VisibilityResults,
  SentimentResults,
  AlignmentResults,
  CompetitionResults,
} from '../interfaces/batch.interfaces';

/**
 * Service responsible for orchestrating batch processing.
 * Handles batch runs, project processing, and pipeline execution.
 */
@Injectable()
export class BatchOrchestrationService {
  private readonly logger = new Logger(BatchOrchestrationService.name);
  private readonly limiter: ReturnType<typeof pLimit>;

  constructor(
    private readonly configService: ConfigService,
    private readonly projectRepository: ProjectRepository,
    private readonly promptSetRepository: PromptSetRepository,
    private readonly batchExecutionService: BatchExecutionService,
    private readonly visibilityPipelineService: VisibilityPipelineService,
    private readonly sentimentPipelineService: SentimentPipelineService,
    private readonly alignmentPipelineService: AlignmentPipelineService,
    private readonly competitionPipelineService: CompetitionPipelineService,
    private readonly batchReportGenerationService: BatchReportGenerationService,
    private readonly batchExecutionTrackingService: BatchExecutionTrackingService,
    @Inject(forwardRef(() => OrganizationService))
    private readonly organizationService: OrganizationService,
    @Inject(forwardRef(() => ProjectService))
    private readonly projectService: ProjectService,
  ) {
    // Initialize the concurrency limiter with high parallelism
    const configLimit = this.configService.get<string | number>('CONCURRENCY_LIMIT', '30');
    const concurrencyLimit = Math.max(1, parseInt(String(configLimit), 10) || 30);

    this.limiter = pLimit(concurrencyLimit);

    this.logger.log(`Batch orchestration service initialized with concurrency limit: ${concurrencyLimit}`);
  }

  /**
   * Run batch processing for all projects
   */
  async runBatch(triggerSource: 'cron' | 'manual' | 'project_creation' = 'manual') {
    try {
      this.logger.log('Starting weekly batch processing');

      // Get all projects with their prompt sets
      const projects = await this.projectRepository.findAll();

      // Get all prompt sets
      const promptSets = await this.promptSetRepository.findAll();

      // Create a map of prompt sets by project ID
      const promptSetsByProject: Record<string, any> = promptSets.reduce(
        (map: Record<string, any>, promptSet) => {
          map[promptSet.projectId] = promptSet;
          return map;
        },
        {},
      );

      this.logger.log(`Found ${projects.length} projects to process`);

      // Current week's start date (Monday 00:00:00 UTC)
      const date = new Date();

      // Process each project
      const promises = projects.map((project) =>
        this.limiter(async () => {
          try {
            const promptSet = promptSetsByProject[project.id];

            if (!promptSet) {
              this.logger.warn(`Project ${project.id} has no prompt sets. Skipping.`);
              return;
            }

            // Get the organization's selected models
            let selectedModels: string[] = [];
            if (project.organizationId) {
              try {
                const organization = await this.organizationService.findOne(project.organizationId);
                selectedModels = organization.selectedModels || [];
                this.logger.log(
                  `Found ${selectedModels.length} selected models for organization ${project.organizationId}: ${selectedModels.join(', ')}`,
                );
              } catch (error) {
                this.logger.warn(
                  `Failed to get organization selected models for organization ${project.organizationId}: ${error.message}`,
                );
              }
            } else {
              this.logger.warn(
                `Project ${project.id} has no associated organization - will use all enabled models`,
              );
            }

            const context: ProjectBatchContext = {
              projectId: project.id,
              brandName: project.brandName,
              keyBrandAttributes: project.keyBrandAttributes,
              competitors: project.competitors,
              promptSet,
              websiteUrl: project.website,
              market: project.market,
              organizationId: project.organizationId,
              selectedModels,
              triggerSource,
            };

            await this.processProjectInternal(context, date);

            return { projectId: project.id, success: true };
          } catch (error) {
            this.logger.error(
              `Failed to process project ${project.id}: ${error.message}`,
              error.stack,
            );
            return { projectId: project.id, success: false, error: error.message };
          }
        }),
      );

      const results = await Promise.allSettled(promises);

      // Summarize results
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as any)?.success,
      ).length;
      const failed = results.length - successful;

      this.logger.log(
        `Batch processing completed. Successfully processed ${successful} projects. Failed: ${failed}`,
      );
    } catch (error) {
      this.logger.error(`Batch processing failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Process a specific project by ID
   */
  async processProject(
    projectId: string,
    batchExecutionId?: string,
    triggerSource: 'cron' | 'manual' | 'project_creation' = 'manual',
  ) {
    try {
      this.logger.log(
        `Processing project ${projectId} with batchExecutionId: ${batchExecutionId || 'none'} (triggerSource: ${triggerSource})`,
      );

      // Get the project data with context
      const project = await this.getProjectBatchContext(projectId);

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Current week's start date (Monday 00:00:00 UTC)
      const date = new Date();

      // Add batchExecutionId to context if provided
      const contextWithBatchId: ProjectBatchContext = batchExecutionId
        ? { ...project, batchExecutionId, triggerSource }
        : { ...project, triggerSource };

      // Log the context to debug
      this.logger.log(
        `Processing project context: ${JSON.stringify({
          projectId: contextWithBatchId.projectId,
          brandName: contextWithBatchId.brandName,
          batchExecutionId: contextWithBatchId.batchExecutionId || 'none',
          triggerSource: contextWithBatchId.triggerSource,
        })}`,
      );

      // Process the project
      const result = await this.processProjectInternal(contextWithBatchId, date);

      return {
        success: true,
        projectId: project.projectId,
        batchExecutionId: result.batchExecutionId,
        message: `Successfully processed project ${project.projectId} (${project.brandName})`,
      };
    } catch (error) {
      this.logger.error(`Failed to process project ${projectId}: ${error.message}`, error.stack);
      return {
        success: false,
        projectId: projectId,
        error: error.message,
      };
    }
  }

  /**
   * Internal method to process a project
   */
  private async processProjectInternal(context: ProjectBatchContext, date: Date) {
    this.logger.log(`Processing project ${context.projectId} (${context.brandName})`);

    try {
      // Use the batch execution ID from the context if it exists, otherwise create a new one
      let batchExecutionId: string;

      if (context.batchExecutionId) {
        batchExecutionId = context.batchExecutionId;
        this.logger.log(
          `Using existing batch execution ${batchExecutionId} for project ${context.projectId}`,
        );
      } else {
        // Create a new batch execution only if one wasn't provided
        const batchExecution = await this.batchExecutionService.createBatchExecution(
          context.projectId,
          context.triggerSource || 'manual',
        );
        batchExecutionId = batchExecution.id;
        this.logger.log(
          `Created batch execution ${batchExecutionId} for project ${context.projectId} (triggerSource: ${context.triggerSource || 'manual'})`,
        );
      }

      // Inject the batchExecutionId into the context
      const contextWithBatchExecId = { ...context, batchExecutionId };

      // Check if organization has a free plan
      let isFreePlan = false;
      if (context.organizationId) {
        try {
          const organization = await this.organizationService.findOne(context.organizationId);
          // Free plan = no stripePlanId (undefined)
          // Paid plan = has stripePlanId (including 'manual')
          isFreePlan = !organization.stripePlanId;
        } catch (error) {
          this.logger.warn(
            `Could not check plan for organization ${context.organizationId}: ${error.message}`,
          );
        }
      }

      // Run pipelines based on plan type
      let visibilityResults: any;
      let sentimentResults: any = { results: [], summary: {} };
      let alignmentResults: any = { results: [], summary: {} };
      let competitionResults: any = { results: [], summary: {} };

      if (isFreePlan) {
        this.logger.log(`Organization has free plan - running visibility pipeline only`);
        // For free plans, only run visibility pipeline
        visibilityResults = await this.visibilityPipelineService.run(contextWithBatchExecId);
      } else {
        // For paid plans, run all four pipelines in parallel
        [visibilityResults, sentimentResults, alignmentResults, competitionResults] =
          await Promise.all([
            this.visibilityPipelineService.run(contextWithBatchExecId),
            this.sentimentPipelineService.run(contextWithBatchExecId),
            this.alignmentPipelineService.run(contextWithBatchExecId),
            this.competitionPipelineService.run(contextWithBatchExecId),
          ]);
      }

      // Get LLM versions
      const comparisonLlmResults = [];

      // Get competition results - now only one format is used
      if (competitionResults && Array.isArray(competitionResults.results)) {
        comparisonLlmResults.push(...competitionResults.results);
      }

      const llmVersions = this.batchReportGenerationService.getLlmVersions([
        ...visibilityResults.results,
        ...sentimentResults.results,
        ...alignmentResults.results,
        ...comparisonLlmResults,
      ]);

      this.logger.log(`Saving batch results for execution ${batchExecutionId}`);

      // Save each result to batch_results table
      await Promise.all([
        this.batchExecutionService.saveBatchResult(
          batchExecutionId,
          'visibility',
          visibilityResults,
        ),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'sentiment', sentimentResults),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'alignment', alignmentResults),
        this.batchExecutionService.saveBatchResult(
          batchExecutionId,
          'competition',
          competitionResults,
        ),
      ]);

      // Create and save the report
      if (isFreePlan) {
        await this.batchReportGenerationService.createVisibilityOnlyReport(
          batchExecutionId,
          visibilityResults,
          sentimentResults,
          alignmentResults,
          competitionResults,
          contextWithBatchExecId,
        );
      } else {
        await this.batchReportGenerationService.createFullReport(
          batchExecutionId,
          visibilityResults,
          sentimentResults,
          alignmentResults,
          competitionResults,
          contextWithBatchExecId,
        );
      }

      this.logger.log(`Successfully processed project ${context.projectId}`);

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
      this.logger.error(
        `Failed to process project ${context.projectId}: ${error.message}`,
        error.stack,
      );

      // If we have a batch execution ID, mark it as failed
      if (context.batchExecutionId) {
        await this.batchExecutionService.updateBatchExecutionStatus(
          context.batchExecutionId,
          'failed',
        );
      }

      throw error;
    }
  }

  /**
   * Run a specific pipeline for a project
   */
  async runPipeline(
    pipelineType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
    context: ProjectBatchContext,
  ) {
    this.logger.log(
      `Running ${pipelineType} pipeline for project ${context.projectId} (${context.brandName})`,
    );

    try {
      let result;

      // Run the appropriate pipeline
      switch (pipelineType) {
        case 'visibility':
          result = await this.visibilityPipelineService.run(context);
          break;
        case 'sentiment':
          result = await this.sentimentPipelineService.run(context);
          break;
        case 'alignment':
          result = await this.alignmentPipelineService.run(context);
          break;
        case 'competition':
          result = await this.competitionPipelineService.run(context);
          break;
        default:
          throw new Error(`Unknown pipeline type: ${pipelineType}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to run ${pipelineType} pipeline for project ${context.projectId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Run the visibility pipeline for a project
   */
  async runVisibilityPipeline(context: ProjectBatchContext): Promise<VisibilityResults> {
    return this.runPipeline('visibility', context) as Promise<VisibilityResults>;
  }

  /**
   * Run the sentiment analysis pipeline for a project
   */
  async runSentimentPipeline(context: ProjectBatchContext): Promise<SentimentResults> {
    return this.runPipeline('sentiment', context) as Promise<SentimentResults>;
  }

  /**
   * Run the alignment pipeline for a project
   */
  async runAlignmentPipeline(context: ProjectBatchContext): Promise<AlignmentResults> {
    return this.runPipeline('alignment', context) as Promise<AlignmentResults>;
  }

  /**
   * Run the competition pipeline for a project
   */
  async runCompetitionPipeline(context: ProjectBatchContext): Promise<CompetitionResults> {
    return this.runPipeline('competition', context) as Promise<CompetitionResults>;
  }

  /**
   * Get project batch context by ID
   */
  async getProjectBatchContext(projectId: string): Promise<ProjectBatchContext | null> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      return null;
    }

    // Get the prompt set for this project
    const promptSet = await this.promptSetRepository.findByProjectId(projectId);

    if (!promptSet) {
      throw new Error(`Project ${projectId} has no prompt sets`);
    }

    // Get the organization's selected models
    let selectedModels: string[] = [];
    if (project.organizationId) {
      try {
        const organization = await this.organizationService.findOne(project.organizationId);
        selectedModels = organization.selectedModels || [];
        this.logger.log(
          `Found ${selectedModels.length} selected models for organization ${project.organizationId}: ${selectedModels.join(', ')}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to get organization selected models for organization ${project.organizationId}: ${error.message}`,
        );
      }
    } else {
      this.logger.warn(
        `Project ${projectId} has no associated organization - will use all enabled models`,
      );
    }

    return {
      projectId: project.id,
      brandName: project.brandName,
      keyBrandAttributes: project.keyBrandAttributes,
      competitors: project.competitors,
      market: project.market,
      promptSet,
      websiteUrl: project.website,
      organizationId: project.organizationId,
      selectedModels,
    };
  }

  /**
   * Get all projects in the system
   */
  async getAllProjects(): Promise<any[]> {
    try {
      this.logger.log('Getting all projects for batch processing');

      // Use the project repository to get all projects
      const projects = await this.projectRepository.findAll();

      // Map to the format expected by the orchestrator
      return projects.map((project) => this.projectRepository.mapToEntity(project));
    } catch (error) {
      this.logger.error(`Failed to get all projects: ${error.message}`, error.stack);
      throw error;
    }
  }

  @OnEvent('project.deleted')
  async handleProjectDeleted(event: { projectId: string }) {
    const { projectId } = event;
    await this.batchExecutionTrackingService.cleanupProjectBatchData(projectId);
  }
}