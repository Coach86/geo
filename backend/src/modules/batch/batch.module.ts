import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BatchService } from './services/batch.service';
import { BatchTask } from './tasks/batch.task';
import { BatchController } from './controllers/batch.controller';
import { BatchExecutionController } from './controllers/batch-execution.controller';
import { BatchResultController } from './controllers/batch-result.controller';
import { RawResponseController } from './controllers/raw-response.controller';
import { PublicBatchResultsController } from './controllers/public-batch-results.controller';
import { VisibilityPipelineService } from './services/visibility-pipeline.service';
import { SentimentPipelineService } from './services/sentiment-pipeline.service';
import { AlignmentPipelineService } from './services/alignment-pipeline.service';
import { CompetitionPipelineService } from './services/competition-pipeline.service';
import { BatchExecutionService } from './services/batch-execution.service';
import { BrandReportOrchestratorService } from './services/brand-report-orchestrator.service';
import { RawResponseService } from './services/raw-response.service';
import { BatchExecution, BatchExecutionSchema } from './schemas/batch-execution.schema';
import { BatchResult, BatchResultSchema } from './schemas/batch-result.schema';
import { ProjectModule } from '../project/project.module';
import { PromptModule } from '../prompt/prompt.module';
import { LlmModule } from '../llm/llm.module';
import { ReportModule } from '../report/report.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { RawResponse, RawResponseSchema } from './schemas/raw-response.schema';
import { BatchExecutionRepository } from './repositories/batch-execution.repository';
import { BatchResultRepository } from './repositories/batch-result.repository';
import { RawResponseRepository } from './repositories/raw-response.repository';
import { BatchEventsGateway } from './gateways/batch-events.gateway';
import { OrganizationModule } from '../organization/organization.module';
import { ConfigModule } from '../config/config.module';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BatchExecution.name, schema: BatchExecutionSchema },
      { name: BatchResult.name, schema: BatchResultSchema },
      { name: RawResponse.name, schema: RawResponseSchema },
    ]),
    forwardRef(() => ProjectModule),
    PromptModule,
    LlmModule,
    forwardRef(() => UserModule),
    forwardRef(() => ReportModule),
    forwardRef(() => AuthModule),
    forwardRef(() => OrganizationModule),
    forwardRef(() => PlanModule),
    ConfigModule,
  ],
  controllers: [
    BatchController,
    BatchExecutionController,
    BatchResultController,
    RawResponseController,
    PublicBatchResultsController,
  ],
  providers: [
    BatchService,
    BatchTask,
    BatchExecutionService,
    VisibilityPipelineService,
    SentimentPipelineService,
    AlignmentPipelineService,
    CompetitionPipelineService,
    BrandReportOrchestratorService,
    RawResponseService,
    BatchExecutionRepository,
    BatchResultRepository,
    RawResponseRepository,
    BatchEventsGateway,
  ],
  exports: [
    BatchService,
    BatchExecutionService,
    BrandReportOrchestratorService,
    RawResponseService,
    BatchExecutionRepository,
    BatchResultRepository,
    RawResponseRepository,
    BatchEventsGateway,
  ],
})
export class BatchModule {}