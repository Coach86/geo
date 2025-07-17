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
import { ReportBuilderService } from './report-builder.service';
import { BatchOrchestrationService } from './batch-orchestration.service';
import { BatchExecutionTrackingService } from './batch-execution-tracking.service';
import { BatchReportGenerationService } from './batch-report-generation.service';
import {
  ProjectBatchContext,
  VisibilityResults,
  SentimentResults,
  AlignmentResults,
  CompetitionResults,
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

/**
 * Main batch service that delegates to specialized services.
 * Maintains backward compatibility while using the new modular structure.
 */
@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);

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
    private readonly reportBuilderService: ReportBuilderService,
    private readonly batchOrchestrationService: BatchOrchestrationService,
    private readonly batchExecutionTrackingService: BatchExecutionTrackingService,
    private readonly batchReportGenerationService: BatchReportGenerationService,
    @Inject(forwardRef(() => OrganizationService))
    private readonly organizationService: OrganizationService,
    @Inject(forwardRef(() => ProjectService))
    private readonly projectService: ProjectService,
    @Inject(forwardRef(() => PlanService))
    private readonly planService: PlanService,
    @Inject(forwardRef(() => BrandReportPersistenceService))
    private readonly brandReportPersistenceService: BrandReportPersistenceService,
  ) {
    this.logger.log('Batch service initialized. Batch processing enabled');
  }

  // Delegate to BatchOrchestrationService
  async runBatch(triggerSource: 'cron' | 'manual' | 'project_creation' = 'manual') {
    return this.batchOrchestrationService.runBatch(triggerSource);
  }

  async processProject(
    projectId: string,
    batchExecutionId?: string,
    triggerSource: 'cron' | 'manual' | 'project_creation' = 'manual',
  ) {
    return this.batchOrchestrationService.processProject(projectId, batchExecutionId, triggerSource);
  }

  async runPipeline(
    pipelineType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
    context: ProjectBatchContext,
  ) {
    return this.batchOrchestrationService.runPipeline(pipelineType, context);
  }

  async runVisibilityPipeline(context: ProjectBatchContext): Promise<VisibilityResults> {
    return this.batchOrchestrationService.runVisibilityPipeline(context);
  }

  async runSentimentPipeline(context: ProjectBatchContext): Promise<SentimentResults> {
    return this.batchOrchestrationService.runSentimentPipeline(context);
  }

  async runAlignmentPipeline(context: ProjectBatchContext): Promise<AlignmentResults> {
    return this.batchOrchestrationService.runAlignmentPipeline(context);
  }

  async runCompetitionPipeline(context: ProjectBatchContext): Promise<CompetitionResults> {
    return this.batchOrchestrationService.runCompetitionPipeline(context);
  }

  async getProjectBatchContext(projectId: string): Promise<ProjectBatchContext | null> {
    return this.batchOrchestrationService.getProjectBatchContext(projectId);
  }

  async getAllProjects(): Promise<any[]> {
    return this.batchOrchestrationService.getAllProjects();
  }

  // Delegate to BatchExecutionTrackingService
  async getRunningBatchExecutionsByProject(projectId: string): Promise<any[]> {
    return this.batchExecutionTrackingService.getRunningBatchExecutionsByProject(projectId);
  }

  async createBatchExecution(
    projectId: string,
    triggerSource: 'cron' | 'manual' | 'project_creation' = 'manual',
  ): Promise<any> {
    return this.batchExecutionTrackingService.createBatchExecution(projectId, triggerSource);
  }

  async completeBatchExecution(batchExecutionId: string, result: any): Promise<any> {
    return this.batchExecutionTrackingService.completeBatchExecution(batchExecutionId, result);
  }

  async failBatchExecution(batchExecutionId: string, errorMessage: string): Promise<any> {
    return this.batchExecutionTrackingService.failBatchExecution(batchExecutionId, errorMessage);
  }

  async createSinglePipelineBatchExecution(
    projectId: string,
    pipelineType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
  ): Promise<any> {
    return this.batchExecutionTrackingService.createSinglePipelineBatchExecution(projectId, pipelineType);
  }

  async saveSinglePipelineResult(
    batchExecutionId: string,
    pipelineType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
    result: any,
  ): Promise<any> {
    return this.batchExecutionTrackingService.saveSinglePipelineResult(batchExecutionId, pipelineType, result);
  }

  async completeSinglePipelineBatchExecution(batchExecutionId: string): Promise<any> {
    return this.batchExecutionTrackingService.completeSinglePipelineBatchExecution(batchExecutionId);
  }

  async failSinglePipelineBatchExecution(
    batchExecutionId: string,
    errorMessage: string,
  ): Promise<any> {
    return this.batchExecutionTrackingService.failSinglePipelineBatchExecution(batchExecutionId, errorMessage);
  }

  // Delegate to BatchReportGenerationService
  async createVisibilityOnlyReport(
    batchExecutionId: string,
    visibilityResults: any,
    sentimentResults: any,
    alignmentResults: any,
    competitionResults: any,
    context: ProjectBatchContext,
  ): Promise<void> {
    return this.batchReportGenerationService.createVisibilityOnlyReport(
      batchExecutionId,
      visibilityResults,
      sentimentResults,
      alignmentResults,
      competitionResults,
      context,
    );
  }

  // Handle project deletion event
  @OnEvent('project.deleted')
  async handleProjectDeleted(event: { projectId: string }) {
    // Delegate to orchestration service which will handle through tracking service
    return this.batchOrchestrationService.handleProjectDeleted(event);
  }

  // Helper methods - delegate to report generation service
  private getLlmVersions(results: any[]): Record<string, string> {
    return this.batchReportGenerationService.getLlmVersions(results);
  }
}