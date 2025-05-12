import { Module } from '@nestjs/common';
import { BatchService } from './services/batch.service';
import { BatchTask } from './tasks/batch.task';
import { BatchController } from './controllers/batch.controller';
import { SpontaneousPipelineService } from './services/spontaneous-pipeline.service';
import { SentimentPipelineService } from './services/sentiment-pipeline.service';
import { ComparisonPipelineService } from './services/comparison-pipeline.service';
import { IdentityCardModule } from '../identity-card/identity-card.module';
import { PromptModule } from '../prompt/prompt.module';
import { LlmModule } from '../llm/llm.module';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [
    IdentityCardModule,
    PromptModule,
    LlmModule,
    ReportModule,
  ],
  controllers: [BatchController],
  providers: [
    BatchService,
    BatchTask,
    SpontaneousPipelineService,
    SentimentPipelineService,
    ComparisonPipelineService,
  ],
  exports: [BatchService],
})
export class BatchModule {}