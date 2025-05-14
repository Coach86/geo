import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BatchService } from './services/batch.service';
import { BatchTask } from './tasks/batch.task';
import { BatchController } from './controllers/batch.controller';
import { BatchExecutionController } from './controllers/batch-execution.controller';
import { SpontaneousPipelineService } from './services/spontaneous-pipeline.service';
import { SentimentPipelineService } from './services/sentiment-pipeline.service';
import { ComparisonPipelineService } from './services/comparison-pipeline.service';
import { BatchExecutionService } from './services/batch-execution.service';
import { CompanyBatchOrchestratorService } from './services/company-batch-orchestrator.service';
import { BatchExecution, BatchExecutionSchema } from './schemas/batch-execution.schema';
import { BatchResult, BatchResultSchema } from './schemas/batch-result.schema';
import { IdentityCardModule } from '../identity-card/identity-card.module';
import { IdentityCard, IdentityCardSchema } from '../identity-card/schemas/identity-card.schema';
import { PromptModule } from '../prompt/prompt.module';
import { PromptSet, PromptSetSchema } from '../prompt/schemas/prompt-set.schema';
import { LlmModule } from '../llm/llm.module';
import { ReportModule } from '../report/report.module';
import { RawResponse, RawResponseSchema } from '../report/schemas/raw-response.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BatchExecution.name, schema: BatchExecutionSchema },
      { name: BatchResult.name, schema: BatchResultSchema },
      { name: IdentityCard.name, schema: IdentityCardSchema },
      { name: PromptSet.name, schema: PromptSetSchema },
      { name: RawResponse.name, schema: RawResponseSchema },
    ]),
    IdentityCardModule,
    PromptModule,
    LlmModule,
    ReportModule,
  ],
  controllers: [BatchController, BatchExecutionController],
  providers: [
    BatchService,
    BatchTask,
    BatchExecutionService,
    SpontaneousPipelineService,
    SentimentPipelineService,
    ComparisonPipelineService,
    CompanyBatchOrchestratorService,
  ],
  exports: [BatchService, BatchExecutionService, CompanyBatchOrchestratorService],
})
export class BatchModule {}