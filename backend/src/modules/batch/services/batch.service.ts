import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BatchExecutionRepository } from '../repositories/batch-execution.repository';
import { BatchResultRepository } from '../repositories/batch-result.repository';
import { RawResponseRepository } from '../repositories/raw-response.repository';
import pLimit from 'p-limit';
import { ProjectService } from '../../project/services/project.service';
import { ProjectRepository } from '../../project/repositories/project.repository';
import { PromptService } from '../../prompt/services/prompt.service';
import { PromptSetRepository } from '../../prompt/repositories/prompt-set.repository';
import { UserService } from '../../user/services/user.service';
import { LlmService } from '../../llm/services/llm.service';
import { RawResponseService } from './raw-response.service';
import { VisibilityPipelineService } from './visibility-pipeline.service';
import { SentimentPipelineService } from './sentiment-pipeline.service';
import { AlignmentPipelineService } from './alignment-pipeline.service';
import { CompetitionPipelineService } from './competition-pipeline.service';
import { BatchExecutionService } from './batch-execution.service';
import { BrandReportOrchestratorService } from './brand-report-orchestrator.service';
import { 
  ProjectBatchContext,
  VisibilityResults,
  SentimentResults,
  AlignmentResults,
  CompetitionResults
} from '../interfaces/batch.interfaces';
import { Project } from '../../project/entities/project.entity';
import { OnEvent } from '@nestjs/event-emitter';
import { OrganizationService } from '../../organization/services/organization.service';
import { PlanService } from '../../plan/services/plan.service';
import { BatchReportInput } from '../../report/interfaces/report-input.interfaces';
import { BrandReportPersistenceService } from '../../report/services/brand-report-persistence.service';
import { ReportCompletedEvent } from '../events/report-completed.event';
import {
  ReportStructure,
  ExplorerData,
  VisibilityData,
  SentimentData,
  AlignmentData,
  CompetitionData,
} from '../../report/interfaces/report.interfaces';

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);
  private readonly limiter: ReturnType<typeof pLimit>;
  private readonly batchEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly projectRepository: ProjectRepository,
    private readonly promptSetRepository: PromptSetRepository,
    private readonly batchExecutionRepository: BatchExecutionRepository,
    private readonly batchResultRepository: BatchResultRepository,
    private readonly rawResponseRepository: RawResponseRepository,
    private readonly batchExecutionService: BatchExecutionService,
    private readonly visibilityPipelineService: VisibilityPipelineService,
    private readonly sentimentPipelineService: SentimentPipelineService,
    private readonly alignmentPipelineService: AlignmentPipelineService,
    private readonly competitionPipelineService: CompetitionPipelineService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => OrganizationService))
    private readonly organizationService: OrganizationService,
    @Inject(forwardRef(() => ProjectService))
    private readonly projectService: ProjectService,
    @Inject(forwardRef(() => PlanService))
    private readonly planService: PlanService,
    @Inject(forwardRef(() => BrandReportPersistenceService))
    private readonly brandReportPersistenceService: BrandReportPersistenceService,
  ) {
    // Initialize the concurrency limiter with high parallelism
    // Ensure concurrencyLimit is a number and at least 1
    const configLimit = this.configService.get<string | number>('CONCURRENCY_LIMIT', '30');
    const concurrencyLimit = Math.max(1, parseInt(String(configLimit), 10) || 30);

    this.limiter = pLimit(concurrencyLimit);

    this.logger.log(`Batch service initialized with concurrency limit: ${concurrencyLimit}`);

    // Check if batch processing is enabled
    this.batchEnabled = this.configService.get<boolean>('BATCH_ENABLED', true);

    this.logger.log(
      `Batch service initialized. Batch processing ${this.batchEnabled ? 'enabled' : 'disabled'}`,
    );
  }

  async runBatch() {
    if (!this.batchEnabled) {
      this.logger.log('Batch processing is disabled. Skipping.');
      return;
    }

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
                this.logger.log(`Found ${selectedModels.length} selected models for organization ${project.organizationId}: ${selectedModels.join(', ')}`);
              } catch (error) {
                this.logger.warn(`Failed to get organization selected models for organization ${project.organizationId}: ${error.message}`);
              }
            } else {
              this.logger.warn(`Project ${project.id} has no associated organization - will use all enabled models`);
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
   * @param projectId The ID of the project to process
   * @param batchExecutionId Optional batch execution ID if one was already created
   * @returns Result of the batch processing including the batch execution ID
   */
  async processProject(projectId: string, batchExecutionId?: string) {
    try {
      this.logger.log(
        `Processing project ${projectId} with batchExecutionId: ${batchExecutionId || 'none'}`,
      );

      // Get the project data with context
      const project = await this.getProjectBatchContext(projectId);

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Current week's start date (Monday 00:00:00 UTC)
      const date = new Date();

      // Add batchExecutionId to context if provided
      const contextWithBatchId = batchExecutionId ? { ...project, batchExecutionId } : project;

      // Log the context to debug
      this.logger.log(
        `Processing project context: ${JSON.stringify({
          projectId: contextWithBatchId.projectId,
          brandName: contextWithBatchId.brandName,
          batchExecutionId: contextWithBatchId.batchExecutionId || 'none',
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
   * Run a specific pipeline for a project
   * @param pipelineType Type of pipeline to run
   * @param context Project context
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
   * @param context Project batch context
   * @returns Pipeline results
   */
  async runVisibilityPipeline(context: ProjectBatchContext): Promise<VisibilityResults> {
    return this.runPipeline('visibility', context) as Promise<VisibilityResults>;
  }

  /**
   * Run the sentiment analysis pipeline for a project
   * @param context Project batch context
   * @returns Pipeline results
   */
  async runSentimentPipeline(context: ProjectBatchContext): Promise<SentimentResults> {
    return this.runPipeline('sentiment', context) as Promise<SentimentResults>;
  }

  /**
   * Run the alignment pipeline for a project
   * @param context Project batch context
   * @returns Pipeline results
   */
  async runAlignmentPipeline(context: ProjectBatchContext): Promise<AlignmentResults> {
    return this.runPipeline('alignment', context) as Promise<AlignmentResults>;
  }

  /**
   * Run the competition pipeline for a project
   * @param context Project batch context
   * @returns Pipeline results
   */
  async runCompetitionPipeline(context: ProjectBatchContext): Promise<CompetitionResults> {
    return this.runPipeline('competition', context) as Promise<CompetitionResults>;
  }

  /**
   * Internal method to process a project
   * @param context The project batch context
   * @returns Object containing the batch execution ID and results
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
        );
        batchExecutionId = batchExecution.id;
        this.logger.log(
          `Created batch execution ${batchExecutionId} for project ${context.projectId}`,
        );
      }

      // Inject the batchExecutionId into the context
      const contextWithBatchExecId = { ...context, batchExecutionId };

      // Check if organization has a free plan
      let isFreePlan = false;
      if (context.organizationId) {
        try {
          const organization = await this.organizationService.findOne(context.organizationId);
          if (organization.stripePlanId) {
            const plan = await this.planService.findById(organization.stripePlanId);
            isFreePlan = plan.metadata?.isFree === true || 
                        plan.name.toLowerCase() === 'free' || 
                        plan.stripeProductId === null ||
                        plan.stripeProductId === '';
          }
        } catch (error) {
          this.logger.warn(`Could not check plan for organization ${context.organizationId}: ${error.message}`);
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

      const llmVersions = this.getLlmVersions([
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

      // Get project details for report metadata
      const project = await this.projectService.findById(context.projectId);
      if (!project) {
        throw new Error(`Project ${context.projectId} not found`);
      }

      // Create the new report structure
      const reportDate = new Date();
      const brandReport: ReportStructure = {
        id: batchExecutionId, // Use batch execution ID as report ID
        projectId: project.projectId,
        reportDate,
        generatedAt: new Date(),
        batchExecutionId,
        brandName: project.brandName,
        metadata: {
          url: project.website || '',
          market: project.market || '',
          countryCode: project.market || 'US', // Default to US if not specified
          competitors: project.competitors || [],
          modelsUsed: this.extractModelsUsed(visibilityResults, sentimentResults, alignmentResults, competitionResults),
          promptsExecuted: this.countPromptsExecuted(visibilityResults, sentimentResults, alignmentResults, competitionResults),
          executionContext: {
            batchId: batchExecutionId,
            pipeline: 'brand-report',
            version: '2.0.0',
          },
        },
        explorer: this.buildExplorerData(visibilityResults, sentimentResults, alignmentResults, competitionResults),
        visibility: this.buildVisibilityData(visibilityResults, project.brandName, project.competitors || []),
        sentiment: this.buildSentimentData(sentimentResults),
        alignment: this.buildAlignmentData(alignmentResults),
        competition: this.buildCompetitionData(competitionResults, project.brandName, project.competitors || []),
      };

      // Save the report using the new persistence service
      await this.brandReportPersistenceService.saveReport(brandReport);
      this.logger.log(`Successfully saved brand report for project ${context.projectId}`);

      // Mark the batch execution as completed
      await this.batchExecutionService.updateBatchExecutionStatus(batchExecutionId, 'completed');

      // Get user information for email notification
      if (context.organizationId) {
        try {
          const organization = await this.organizationService.findOne(context.organizationId);
          const users = await this.userService.findByOrganizationId(context.organizationId);
          
          // Determine trigger type based on context
          let triggerType: 'manual' | 'cron' | 'new_project' = 'cron';
          if (context.isManualRefresh) {
            triggerType = 'manual';
          } else if (context.isNewProject) {
            triggerType = 'new_project';
          }
          
          // Emit report completed event for each user in the organization
          for (const user of users) {
            this.eventEmitter.emit('report.completed', new ReportCompletedEvent(
              context.projectId,
              project.brandName,
              batchExecutionId, // Use batch execution ID as report ID
              batchExecutionId,
              user.id,
              user.email,
              triggerType,
            ));
          }
          
          this.logger.log(`Emitted report.completed event for ${users.length} users in organization ${context.organizationId}`);
        } catch (error) {
          this.logger.warn(`Failed to emit report.completed event: ${error.message}`);
        }
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

  private getLlmVersions(results: any[]): Record<string, string> {
    const versions: Record<string, string> = {};

    for (const result of results) {
      if (result.llmModel && !versions[result.llmModel]) {
        versions[result.llmModel] = `${result.llmModel.toLowerCase()}-version`;
      }
    }

    return versions;
  }

  /**
   * Get running batch executions for a project
   * @param projectId The ID of the project
   * @returns Array of running batch executions sorted by executedAt (newest first)
   */
  async getRunningBatchExecutionsByProject(projectId: string): Promise<any[]> {
    try {
      return await this.batchExecutionRepository.findByProjectIdAndStatus(projectId, 'running');
    } catch (error) {
      this.logger.error(`Failed to get running batch executions: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Get project batch context by ID
   * @param projectId The ID of the project
   * @returns The project batch context
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
        this.logger.log(`Found ${selectedModels.length} selected models for organization ${project.organizationId}: ${selectedModels.join(', ')}`);
      } catch (error) {
        this.logger.warn(`Failed to get organization selected models for organization ${project.organizationId}: ${error.message}`);
      }
    } else {
      this.logger.warn(`Project ${projectId} has no associated organization - will use all enabled models`);
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
   * Create a batch execution record
   * @param projectId The ID of the project
   * @returns The created batch execution
   */
  async createBatchExecution(projectId: string): Promise<any> {
    this.logger.log(`Creating batch execution for project ${projectId}`);

    try {
      return await this.batchExecutionService.createBatchExecution(projectId);
    } catch (error) {
      this.logger.error(`Failed to create batch execution: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Complete a batch execution with results
   * @param batchExecutionId The ID of the batch execution
   * @param result The result of the batch execution
   * @returns The updated batch execution
   */
  async completeBatchExecution(batchExecutionId: string, result: any): Promise<any> {
    this.logger.log(`Completing batch execution ${batchExecutionId}`);

    try {
      // If the result contains results for different pipelines, save them individually
      if (result && result.results) {
        // Check which pipeline results are available
        if (result.results.visibility) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'visibility',
            result.results.visibility,
          );
        }

        if (result.results.sentiment) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'sentiment',
            result.results.sentiment,
          );
        }

        if (result.results.alignment) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'alignment',
            result.results.alignment,
          );
        }

        if (result.results.competition) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'competition',
            result.results.competition,
          );
        }
      }

      // Update the batch execution status to completed
      return await this.batchExecutionService.updateBatchExecutionStatus(
        batchExecutionId,
        'completed',
      );
    } catch (error) {
      this.logger.error(`Failed to complete batch execution: ${error.message}`, error.stack);

      // If saving results fails, mark the batch execution as failed
      await this.failBatchExecution(
        batchExecutionId,
        error.message || 'Unknown error during completion',
      );
      throw error;
    }
  }

  /**
   * Mark a batch execution as failed
   * @param batchExecutionId The ID of the batch execution
   * @param errorMessage The error message
   * @returns The updated batch execution
   */
  async failBatchExecution(batchExecutionId: string, errorMessage: string): Promise<any> {
    this.logger.error(`Marking batch execution ${batchExecutionId} as failed: ${errorMessage}`);

    try {
      return await this.batchExecutionService.updateBatchExecutionStatus(
        batchExecutionId,
        'failed',
        errorMessage,
      );
    } catch (error) {
      this.logger.error(`Failed to mark batch execution as failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a batch execution for a single pipeline run
   * @param projectId The ID of the project
   * @param pipelineType The type of pipeline being run
   * @returns The created batch execution
   */
  async createSinglePipelineBatchExecution(
    projectId: string,
    pipelineType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
  ): Promise<any> {
    this.logger.log(
      `Creating batch execution for ${pipelineType} pipeline for project ${projectId}`,
    );

    try {
      // Create a new batch execution using the batch execution service
      const batchExecution = await this.batchExecutionService.createBatchExecution(projectId);

      this.logger.log(`Created batch execution ${batchExecution.id} for ${pipelineType} pipeline`);

      return batchExecution;
    } catch (error) {
      this.logger.error(
        `Failed to create batch execution for ${pipelineType} pipeline: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Save the result of a single pipeline run
   * @param batchExecutionId The ID of the batch execution
   * @param pipelineType The type of pipeline
   * @param result The result to save
   * @returns The saved batch result
   */
  async saveSinglePipelineResult(
    batchExecutionId: string,
    pipelineType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
    result: any,
  ): Promise<any> {
    this.logger.log(`Saving ${pipelineType} result for batch execution ${batchExecutionId}`);

    try {
      // Save the result using the batch execution service
      const batchResult = await this.batchExecutionService.saveBatchResult(
        batchExecutionId,
        pipelineType,
        result,
      );

      this.logger.log(`Saved ${pipelineType} result for batch execution ${batchExecutionId}`);

      return batchResult;
    } catch (error) {
      this.logger.error(`Failed to save ${pipelineType} result: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark a single pipeline batch execution as completed
   * @param batchExecutionId The ID of the batch execution
   * @returns The updated batch execution
   */
  async completeSinglePipelineBatchExecution(batchExecutionId: string): Promise<any> {
    this.logger.log(`Marking batch execution ${batchExecutionId} as completed`);

    try {
      // Update the status using the batch execution service
      const batchExecution = await this.batchExecutionService.updateBatchExecutionStatus(
        batchExecutionId,
        'completed',
      );

      this.logger.log(`Marked batch execution ${batchExecutionId} as completed`);

      return batchExecution;
    } catch (error) {
      this.logger.error(
        `Failed to mark batch execution as completed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Mark a single pipeline batch execution as failed
   * @param batchExecutionId The ID of the batch execution
   * @param errorMessage The error message
   * @returns The updated batch execution
   */
  async failSinglePipelineBatchExecution(
    batchExecutionId: string,
    errorMessage: string,
  ): Promise<any> {
    this.logger.error(`Marking batch execution ${batchExecutionId} as failed: ${errorMessage}`);

    try {
      // Update the status using the batch execution service
      const batchExecution = await this.batchExecutionService.updateBatchExecutionStatus(
        batchExecutionId,
        'failed',
      );

      this.logger.log(`Marked batch execution ${batchExecutionId} as failed`);

      return batchExecution;
    } catch (error) {
      this.logger.error(`Failed to mark batch execution as failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all projects in the system
   * @returns Array of project data
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
    
    // Get execution IDs before deletion to clean up related data
    const batchExecutions = await this.batchExecutionRepository.findByProjectId(projectId);
    const batchExecutionIds = batchExecutions.map((be) => be.id);

    if (batchExecutionIds.length > 0) {
      // Delete related raw responses and batch results first
      for (const execId of batchExecutionIds) {
        await this.rawResponseRepository.deleteByExecutionId(execId);
        await this.batchResultRepository.deleteByExecutionId(execId);
      }
    }
    
    // Delete all batch executions for this project
    const deletedCount = await this.batchExecutionRepository.deleteByProjectId(projectId);
    
    this.logger.log(`Cleaned up batch data for deleted project ${projectId}: ${deletedCount} executions, ${batchExecutionIds.length} related records`);
  }

  // Helper methods for building report structure
  private extractModelsUsed(...results: any[]): string[] {
    const models = new Set<string>();
    results.forEach(result => {
      if (result?.results) {
        result.results.forEach((r: any) => {
          if (r.llmProvider) models.add(r.llmProvider);
        });
      }
    });
    return Array.from(models);
  }

  private countPromptsExecuted(...results: any[]): number {
    let count = 0;
    results.forEach(result => {
      if (result?.results) {
        count += result.results.length;
      }
    });
    return count;
  }

  public buildExplorerData(
    visibilityResults: VisibilityResults,
    sentimentResults: SentimentResults,
    alignmentResults: AlignmentResults,
    competitionResults: CompetitionResults,
  ): ExplorerData {
    // Build citations data using logic from deleted ReportConverterService
    const allCitationsData: Array<{
      modelId: string;
      modelProvider: string;
      promptIndex: number;
      promptType: string;
      citations: any[];
      webSearchQueries: any[];
    }> = [];

    // Collect citations from all pipeline results
    const collectCitations = (results: any[] | undefined, promptType: string) => {
      if (!results) return;

      results.forEach((result, index) => {
        // Extract web search queries
        let webSearchQueries: any[] = [];

        // Check if webSearchQueries is already extracted
        if (result.webSearchQueries && Array.isArray(result.webSearchQueries)) {
          webSearchQueries = result.webSearchQueries;
        }
        // Fallback to extracting from toolUsage
        else if (result.toolUsage && Array.isArray(result.toolUsage)) {
          const extractedQueries: any[] = [];
          result.toolUsage.forEach((tool: any) => {
            if (tool.type === 'web_search' || tool.type === 'search' || tool.type?.includes('search')) {
              const query = tool.input?.query || tool.parameters?.query || tool.parameters?.q || tool.query;
              if (query) {
                extractedQueries.push({
                  query: query,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          });
          webSearchQueries = extractedQueries;
        }

        // Add entry if we have citations OR web search queries
        if ((result.citations && result.citations.length > 0) || webSearchQueries.length > 0) {
          allCitationsData.push({
            modelId: result.llmModel || 'unknown',
            modelProvider: result.llmProvider || 'unknown',
            promptIndex: result.promptIndex ?? index,
            promptType,
            citations: result.citations || [],
            webSearchQueries: webSearchQueries,
          });
        }
      });
    };

    // Collect from all pipelines
    collectCitations(visibilityResults?.results, 'visibility');
    collectCitations(sentimentResults?.results, 'sentiment');
    collectCitations(alignmentResults?.results, 'alignment');
    collectCitations(competitionResults?.results, 'competition');

    // Calculate statistics
    const totalPrompts = this.countPromptsExecuted(visibilityResults, sentimentResults, alignmentResults, competitionResults);
    const promptsWithWebAccess = allCitationsData.length;
    const webAccessPercentage = totalPrompts > 0 ? (promptsWithWebAccess / totalPrompts) * 100 : 0;

    // Aggregate source statistics
    const sourceMap = new Map<string, {
      totalMentions: number;
      citedByModels: Set<string>;
      associatedQueries: Set<string>;
    }>();

    let totalCitations = 0;
    
    // Build query-based structure
    const webSearchResults: any[] = [];
    const queryToCitationsMap = new Map<string, {
      query: string;
      timestamp?: string;
      citations: any[];
      models: Set<string>;
      promptTypes: Set<string>;
    }>();

    allCitationsData.forEach(({ modelId, modelProvider, promptIndex, promptType, citations, webSearchQueries }) => {
      // Count all citations for statistics
      citations.forEach((citation: any) => {
        totalCitations++;
        const domain = this.extractDomain(citation.url || citation.source || '');
        
        // Update source statistics
        if (domain) {
          if (!sourceMap.has(domain)) {
            sourceMap.set(domain, {
              totalMentions: 0,
              citedByModels: new Set(),
              associatedQueries: new Set(),
            });
          }
          const stats = sourceMap.get(domain)!;
          stats.totalMentions++;
          stats.citedByModels.add(modelId);
        }
      });
      
      // Only add to webSearchResults if we have web search queries
      if (webSearchQueries.length > 0) {
        // Process each web search query
        webSearchQueries.forEach((queryObj: any) => {
          const query = typeof queryObj === 'string' ? queryObj : (queryObj.query || queryObj);
          const timestamp = typeof queryObj === 'object' ? queryObj.timestamp : undefined;
          
          if (!queryToCitationsMap.has(query)) {
            queryToCitationsMap.set(query, {
              query,
              timestamp,
              citations: [],
              models: new Set(),
              promptTypes: new Set(),
            });
          }
          
          const entry = queryToCitationsMap.get(query)!;
          
          // Add citations for this query
          citations.forEach((citation: any) => {
            const domain = this.extractDomain(citation.url || citation.source || '');
            
            entry.citations.push({
              website: domain,
              link: citation.url,
              model: modelId,
              promptType,
              promptIndex,
              source: citation.source || domain,
            });
            
            entry.models.add(modelId);
            entry.promptTypes.add(promptType);
            
            // Add query association to existing source stats
            if (domain && sourceMap.has(domain)) {
              sourceMap.get(domain)!.associatedQueries.add(query);
            }
          });
        });
      }
    });

    // Convert map to array for webSearchResults
    webSearchResults.push(...Array.from(queryToCitationsMap.values()).map(entry => ({
      query: entry.query,
      timestamp: entry.timestamp,
      models: Array.from(entry.models),
      promptTypes: Array.from(entry.promptTypes),
      citations: entry.citations,
    })));

    // Get top sources
    const topSources = Array.from(sourceMap.entries())
      .map(([domain, stats]) => ({
        domain,
        count: stats.totalMentions,
        percentage: totalCitations > 0 ? (stats.totalMentions / totalCitations) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Extract keywords from web search queries
    const keywordMap = new Map<string, number>();
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
      'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'done',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'this', 'that', 'these', 'those', 'with', 'from', 'for', 'about',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'under', 'over', 'then', 'than', 'when', 'where', 'what',
      'who', 'whom', 'whose', 'which', 'why', 'how'
    ]);

    allCitationsData.forEach(({ webSearchQueries }) => {
      webSearchQueries.forEach((queryObj: any) => {
        const query = typeof queryObj === 'string' ? queryObj : (queryObj.query || queryObj);
        if (query) {
          // Simple split by spaces and filter stop words
          const words = query.toLowerCase().split(/\s+/).filter((word: string) => 
            word.trim() !== '' && !stopWords.has(word) && word.length > 2
          );
          
          words.forEach((word: string) => {
            keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
          });
        }
      });
    });

    // Count total web search queries for percentage calculation
    const totalWebSearchQueries = allCitationsData.reduce(
      (sum, item) => sum + item.webSearchQueries.length,
      0
    );

    // Get top keywords
    const topKeywords = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({
        keyword,
        count,
        percentage: totalWebSearchQueries > 0 ? (count / totalWebSearchQueries) * 100 : 0,
      }));

    return {
      summary: {
        totalPrompts,
        promptsWithWebAccess,
        webAccessPercentage,
        totalCitations,
        uniqueSources: sourceMap.size,
      },
      topKeywords,
      topSources,
      webSearchResults, // New structure: query -> citations
      webAccess: {
        totalResponses: totalPrompts,
        successfulQueries: promptsWithWebAccess,
        failedQueries: 0, // Would need error tracking
      },
    };
  }

  private extractDomain(url: string): string {
    try {
      if (!url) return '';
      // Handle URLs that might not have protocol
      const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(urlWithProtocol);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url; // Return as-is if not a valid URL
    }
  }

  private getPromptTypeFromResult(result: any): string {
    // Determine prompt type based on result structure
    if (result.topOfMind !== undefined) return 'visibility';
    if (result.sentiment !== undefined) return 'sentiment';
    if (result.attributeScores !== undefined) return 'alignment';
    if (result.brandStrengths !== undefined || result.competitorStrengths !== undefined) return 'competition';
    return 'unknown';
  }


  public buildVisibilityData(visibilityResults: VisibilityResults, brandName: string, competitors: string[] = []): VisibilityData {
    // Calculate model visibility from visibility results
    const modelMentions: Record<string, { mentioned: number; total: number }> = {};
    
    visibilityResults.results.forEach((result: any) => {
      const model = result.llmModel;
      if (!modelMentions[model]) {
        modelMentions[model] = { mentioned: 0, total: 0 };
      }
      modelMentions[model].total++;
      if (result.mentioned) {
        modelMentions[model].mentioned++;
      }
    });

    const modelVisibility = Object.entries(modelMentions).map(([model, stats]) => ({
      model,
      mentionRate: Math.round((stats.mentioned / stats.total) * 100),
    }));

    const overallMentionRate = Math.round(
      (visibilityResults.summary.mentionRate || 0) * 100
    );

    // Extract competitor mentions for arena metrics (only configured competitors)
    const competitorMentions: Record<string, Record<string, number>> = {};
    const models: string[] = Array.from(new Set(visibilityResults.results.map((r: any) => r.llmModel)));

    // Initialize competitor mentions only for configured competitors
    competitors.forEach(competitor => {
      competitorMentions[competitor] = {};
      models.forEach(model => {
        competitorMentions[competitor][model] = 0;
      });
    });

    // Count mentions of configured competitors only
    visibilityResults.results.forEach((result: any) => {
      if (result.topOfMind && Array.isArray(result.topOfMind)) {
        result.topOfMind.forEach((brand: string) => {
          // Only count if this brand is in the configured competitors list
          const matchingCompetitor = competitors.find(comp => 
            comp.toLowerCase() === brand.toLowerCase()
          );
          if (matchingCompetitor && competitorMentions[matchingCompetitor]) {
            competitorMentions[matchingCompetitor][result.llmModel] = 
              (competitorMentions[matchingCompetitor][result.llmModel] || 0) + 1;
          }
        });
      }
    });

    // Build arena metrics from competitor mentions
    const arenaMetrics = Object.entries(competitorMentions).map(([competitorName, modelMentionsData]) => {
      const modelsMentionsRate = models.map((model: string) => {
        const modelResults = visibilityResults.results.filter((r: any) => r.llmModel === model);
        const promptsTested = modelResults.length;
        const mentions = modelMentionsData[model] || 0;
        
        return {
          model,
          mentionsRate: promptsTested > 0 ? Math.round((mentions / promptsTested) * 100) : 0,
        };
      });

      // Calculate global mention rate
      const totalMentions = Object.values(modelMentionsData).reduce((sum: number, count: number) => sum + count, 0);
      const totalPrompts = visibilityResults.results.length;
      const globalRate = totalPrompts > 0 ? Math.round((totalMentions / totalPrompts) * 100) : 0;

      return {
        name: competitorName,
        size: globalRate > 20 ? 'lg' : globalRate > 10 ? 'md' : 'sm' as 'lg' | 'md' | 'sm',
        global: `${globalRate}%`,
        modelsMentionsRate,
      };
    }).sort((a, b) => parseInt(b.global) - parseInt(a.global)); // Sort by global rate descending

    // Include topMentions from visibility results
    const topMentions = visibilityResults.summary.topMentionCounts || [];

    return {
      overallMentionRate,
      promptsTested: visibilityResults.results.length,
      modelVisibility,
      arenaMetrics,
      topMentions,
    };
  }

  private buildSentimentData(sentimentResults: SentimentResults): SentimentData {
    // Count sentiment distribution
    const distribution = { positive: 0, neutral: 0, negative: 0, total: 0 };
    const modelSentiments: Record<string, any> = {};
    const heatmapDataMap: Record<string, any> = {};

    sentimentResults.results.forEach((result: any) => {
      distribution.total++;
      switch (result.sentiment) {
        case 'positive':
          distribution.positive++;
          break;
        case 'neutral':
          distribution.neutral++;
          break;
        case 'negative':
          distribution.negative++;
          break;
      }

      // Aggregate by model
      if (!modelSentiments[result.llmModel]) {
        modelSentiments[result.llmModel] = {
          model: result.llmModel,
          sentiments: [],
          positiveKeywords: new Set<string>(),
          negativeKeywords: new Set<string>(),
        };
      }
      
      modelSentiments[result.llmModel].sentiments.push(result.sentiment);
      result.extractedPositiveKeywords?.forEach((k: string) => modelSentiments[result.llmModel].positiveKeywords.add(k));
      result.extractedNegativeKeywords?.forEach((k: string) => modelSentiments[result.llmModel].negativeKeywords.add(k));

      // Build heatmap data by grouping results by prompt
      const promptKey = result.originalPrompt || `prompt_${result.promptIndex}`;
      if (!heatmapDataMap[promptKey]) {
        heatmapDataMap[promptKey] = {
          question: promptKey,
          results: [],
        };
      }

      const status: 'green' | 'yellow' | 'red' = result.sentiment === 'positive' ? 'green' : 
                     result.sentiment === 'negative' ? 'red' : 'yellow';

      heatmapDataMap[promptKey].results.push({
        model: result.llmModel,
        sentiment: result.sentiment,
        status,
        llmResponse: result.llmResponse,
        citations: result.citations,
        toolUsage: result.toolUsage,
      });
    });

    // Calculate overall sentiment
    const overallSentiment = sentimentResults.summary.overallSentiment;
    const overallScore = Math.round(sentimentResults.summary.overallSentimentPercentage || 0);

    // Transform model sentiments
    const modelSentimentsList = Object.values(modelSentiments).map((ms: any) => {
      // Determine most common sentiment for this model
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      ms.sentiments.forEach((s: string) => sentimentCounts[s as keyof typeof sentimentCounts]++);
      
      const dominantSentiment = Object.entries(sentimentCounts)
        .sort(([, a], [, b]) => b - a)[0][0] as 'positive' | 'neutral' | 'negative';
      
      const status: 'green' | 'yellow' | 'red' = dominantSentiment === 'positive' ? 'green' : 
                     dominantSentiment === 'negative' ? 'red' : 'yellow';

      return {
        model: ms.model,
        sentiment: dominantSentiment,
        status,
        positiveKeywords: Array.from(ms.positiveKeywords) as string[],
        negativeKeywords: Array.from(ms.negativeKeywords) as string[],
      };
    });

    // Convert heatmap data map to array
    const heatmapData = Object.values(heatmapDataMap);

    return {
      overallScore,
      overallSentiment,
      distribution,
      modelSentiments: modelSentimentsList,
      heatmapData,
    };
  }

  private buildAlignmentData(alignmentResults: AlignmentResults): AlignmentData {
    // Extract attribute scores from results
    const attributeScores: Record<string, number[]> = {};
    const detailedResults: any[] = [];

    alignmentResults.results.forEach((result: any) => {
      if (result.attributeScores && Array.isArray(result.attributeScores)) {
        // Build detailed result with all available data
        const modelResult = {
          model: result.llmModel,
          promptIndex: result.promptIndex,
          originalPrompt: result.originalPrompt || '',
          llmResponse: result.llmResponse || '',
          attributeScores: result.attributeScores,
          usedWebSearch: result.usedWebSearch || false,
          citations: result.citations || [],
          toolUsage: result.toolUsage || [],
          error: result.error || undefined,
        };
        detailedResults.push(modelResult);

        // Aggregate scores by attribute
        result.attributeScores.forEach((score: any) => {
          if (!attributeScores[score.attribute]) {
            attributeScores[score.attribute] = [];
          }
          attributeScores[score.attribute].push(score.score);
        });
      }
    });

    // Use summary data if available, otherwise calculate from raw scores
    const averageAttributeScores = alignmentResults.summary.averageAttributeScores || {};
    
    // If summary doesn't have averages, calculate them
    if (Object.keys(averageAttributeScores).length === 0) {
      Object.entries(attributeScores).forEach(([attr, scores]) => {
        averageAttributeScores[attr] = scores.reduce((a, b) => a + b, 0) / scores.length;
      });
    }

    // Calculate overall alignment score
    const overallAlignmentScore = Math.round(
      (Object.values(averageAttributeScores) as number[])
        .reduce((sum: number, score: number) => sum + score, 0) / 
      Object.keys(averageAttributeScores).length * 100 || 0
    );

    // Create attribute alignment summary
    const attributeAlignmentSummary = Object.entries(averageAttributeScores).map(([attribute, avgScore]) => {
      const mentionCount = alignmentResults.results.filter((r: any) => 
        r.attributeScores?.some((s: any) => s.attribute === attribute)
      ).length;
      const mentionRate = `${Math.round((mentionCount / alignmentResults.results.length) * 100)}%`;
      
      // Convert score to alignment level
      const scoreValue = avgScore as number;
      const alignment = scoreValue >= 0.8 ? '✅ High' : 
                       scoreValue >= 0.6 ? '⚠️ Medium' : 
                       '❌ Low';

      return {
        name: attribute,
        mentionRate,
        alignment,
      };
    });

    return {
      overallAlignmentScore,
      averageAttributeScores,
      attributeAlignmentSummary,
      detailedResults,
    };
  }

  public buildCompetitionData(
    competitionResults: CompetitionResults,
    brandName: string,
    competitors: string[]
  ): CompetitionData {
    // Use the summary data which already has the analysis
    const commonStrengths = competitionResults.summary.commonStrengths || [];
    const commonWeaknesses = competitionResults.summary.commonWeaknesses || [];

    // Transform competitorAnalyses to match expected structure
    const competitorAnalysesMap: Record<string, any> = {};
    
    // Group results by competitor
    competitionResults.results.forEach((result: any) => {
      if (!competitorAnalysesMap[result.competitor]) {
        competitorAnalysesMap[result.competitor] = {
          competitor: result.competitor,
          analysisByModel: [],
        };
      }
      
      competitorAnalysesMap[result.competitor].analysisByModel.push({
        model: result.llmModel,
        strengths: result.brandStrengths || [],
        weaknesses: result.brandWeaknesses || [],
      });
    });

    const competitorAnalyses = Object.values(competitorAnalysesMap);

    // Build competitor metrics
    const competitorMetrics = competitors.map((competitor, index) => ({
      competitor,
      overallRank: index + 1,
      mentionRate: 0, // This would need to be calculated from other data
      modelMentions: [],
    }));

    return {
      brandName,
      competitors,
      competitorAnalyses,
      competitorMetrics,
      commonStrengths,
      commonWeaknesses,
    };
  }
}
