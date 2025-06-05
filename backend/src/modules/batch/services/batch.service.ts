import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { ReportService } from '../../report/services/report.service';
import { BatchReportInput } from '../../report/interfaces/report-input.interfaces';
import { RawResponseService } from './raw-response.service';
import { SpontaneousPipelineService } from './spontaneous-pipeline.service';
import { SentimentPipelineService } from './sentiment-pipeline.service';
import { AccuracyPipelineService } from './accuracy-pipeline.service';
import { ComparisonPipelineService } from './comparison-pipeline.service';
import { BatchExecutionService } from './batch-execution.service';
import { ProjectBatchContext } from '../interfaces/batch.interfaces';
import { Project } from '../../project/entities/project.entity';
import { OnEvent } from '@nestjs/event-emitter';
import { OrganizationService } from '../../organization/services/organization.service';

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
    private readonly reportService: ReportService,
    private readonly batchExecutionService: BatchExecutionService,
    private readonly spontaneousPipelineService: SpontaneousPipelineService,
    private readonly sentimentPipelineService: SentimentPipelineService,
    private readonly accuracyPipelineService: AccuracyPipelineService,
    private readonly comparisonPipelineService: ComparisonPipelineService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => OrganizationService))
    private readonly organizationService: OrganizationService,
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
    pipelineType: 'spontaneous' | 'sentiment' | 'accuracy' | 'comparison',
    context: ProjectBatchContext,
  ) {
    this.logger.log(
      `Running ${pipelineType} pipeline for project ${context.projectId} (${context.brandName})`,
    );

    try {
      let result;

      // Run the appropriate pipeline
      switch (pipelineType) {
        case 'spontaneous':
          result = await this.spontaneousPipelineService.run(context);
          break;
        case 'sentiment':
          result = await this.sentimentPipelineService.run(context);
          break;
        case 'accuracy':
          result = await this.accuracyPipelineService.run(context);
          break;
        case 'comparison':
          result = await this.comparisonPipelineService.run(context);
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
   * Run the spontaneous pipeline for a project
   * @param context Project batch context
   * @returns Pipeline results
   */
  async runSpontaneousPipeline(context: ProjectBatchContext) {
    return this.runPipeline('spontaneous', context);
  }

  /**
   * Run the sentiment analysis pipeline for a project
   * @param context Project batch context
   * @returns Pipeline results
   */
  async runSentimentPipeline(context: ProjectBatchContext) {
    return this.runPipeline('sentiment', context);
  }

  /**
   * Run the accuracy pipeline for a project
   * @param context Project batch context
   * @returns Pipeline results
   */
  async runAccuracyPipeline(context: ProjectBatchContext) {
    return this.runPipeline('accuracy', context);
  }

  /**
   * Run the comparison pipeline for a project
   * @param context Project batch context
   * @returns Pipeline results
   */
  async runComparisonPipeline(context: ProjectBatchContext) {
    return this.runPipeline('comparison', context);
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

      // Run all four pipelines in parallel
      const [spontaneousResults, sentimentResults, accuracyResults, comparisonResults] =
        await Promise.all([
          this.spontaneousPipelineService.run(contextWithBatchExecId),
          this.sentimentPipelineService.run(contextWithBatchExecId),
          this.accuracyPipelineService.run(contextWithBatchExecId),
          this.comparisonPipelineService.run(contextWithBatchExecId),
        ]);

      // Get LLM versions
      const comparisonLlmResults = [];

      // Get comparison results - now only one format is used
      if (comparisonResults && Array.isArray(comparisonResults.results)) {
        comparisonLlmResults.push(...comparisonResults.results);
      }

      const llmVersions = this.getLlmVersions([
        ...spontaneousResults.results,
        ...sentimentResults.results,
        ...accuracyResults.results,
        ...comparisonLlmResults,
      ]);

      this.logger.log(`Saving batch results for execution ${batchExecutionId}`);

      // Save each result to batch_results table
      await Promise.all([
        this.batchExecutionService.saveBatchResult(
          batchExecutionId,
          'spontaneous',
          spontaneousResults,
        ),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'sentiment', sentimentResults),
        this.batchExecutionService.saveBatchResult(batchExecutionId, 'accuracy', accuracyResults),
        this.batchExecutionService.saveBatchResult(
          batchExecutionId,
          'comparison',
          comparisonResults,
        ),
      ]);

      // Create the weekly report with proper typing including the new accuracy results
      const batchReportInput: BatchReportInput = {
        projectId: context.projectId,
        date,
        spontaneous: spontaneousResults,
        sentiment: sentimentResults,
        accord: accuracyResults,
        comparison: comparisonResults,
        llmVersions,
        generatedAt: new Date(),
        batchExecutionId: batchExecutionId,
      };

      // Save the report using the properly typed method
      await this.reportService.saveReportFromBatch(batchReportInput);

      // Mark the batch execution as completed
      await this.batchExecutionService.updateBatchExecutionStatus(batchExecutionId, 'completed');

      this.logger.log(`Successfully processed project ${context.projectId}`);

      return {
        batchExecutionId,
        results: {
          spontaneous: spontaneousResults,
          sentiment: sentimentResults,
          accuracy: accuracyResults,
          comparison: comparisonResults,
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
      if (result.llmProvider && !versions[result.llmProvider]) {
        versions[result.llmProvider] = `${result.llmProvider.toLowerCase()}-version`;
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
        if (result.results.spontaneous) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'spontaneous',
            result.results.spontaneous,
          );
        }

        if (result.results.sentiment) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'sentiment',
            result.results.sentiment,
          );
        }

        if (result.results.accuracy) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'accuracy',
            result.results.accuracy,
          );
        }

        if (result.results.comparison) {
          await this.batchExecutionService.saveBatchResult(
            batchExecutionId,
            'comparison',
            result.results.comparison,
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
    pipelineType: 'spontaneous' | 'sentiment' | 'accuracy' | 'comparison',
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
    pipelineType: 'spontaneous' | 'sentiment' | 'accuracy' | 'comparison',
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
    // Delete all batch executions for this project
    await this.batchExecutionRepository.deleteByProjectId(projectId);

    // Get execution IDs before deletion to clean up related data
    const batchExecutions = await this.batchExecutionRepository.findByProjectId(projectId);
    const batchExecutionIds = batchExecutions.map((be) => be.id);

    if (batchExecutionIds.length > 0) {
      // Delete related raw responses and batch results
      for (const execId of batchExecutionIds) {
        await this.rawResponseRepository.deleteByExecutionId(execId);
        await this.batchResultRepository.deleteByExecutionId(execId);
      }
    }
    // Optionally, log the cleanup
    this.logger.log(`Cleaned up batch data for deleted project ${projectId}`);
  }
}
