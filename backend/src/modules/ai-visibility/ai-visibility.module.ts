import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { CrawledPage, CrawledPageSchema } from './schemas/crawled-page.schema';
import { SearchIndex, SearchIndexSchema } from './schemas/search-index.schema';
import { ScanResult, ScanResultSchema } from './schemas/scan-result.schema';
import { ActionPlan, ActionPlanSchema } from './schemas/action-plan.schema';
import { CrawlerController } from './controllers/crawler.controller';
import { IndexController } from './controllers/index.controller';
import { ScannerController } from './controllers/scanner.controller';
import { AIVisibilityBatchController } from './controllers/ai-visibility-batch.controller';
import { ActionPlanController } from './controllers/action-plan.controller';
import { WebCrawlerService } from './services/web-crawler.service';
import { TextProcessorService } from './services/text-processor.service';
import { BM25IndexService } from './services/bm25-index.service';
import { VectorIndexService } from './services/vector-index.service';
import { HybridSearchService } from './services/hybrid-search.service';
import { QueryGeneratorService } from './services/query-generator.service';
import { VisibilityScannerService } from './services/visibility-scanner.service';
import { RecommendationService } from './services/recommendation.service';
import { AIVisibilityOrchestratorService } from './services/ai-visibility-orchestrator.service';
import { ActionPlanService } from './services/action-plan.service';
import { AIVisibilityBatchTask } from './tasks/ai-visibility-batch.task';
import { CrawledPageRepository } from './repositories/crawled-page.repository';
import { SearchIndexRepository } from './repositories/search-index.repository';
import { ScanResultRepository } from './repositories/scan-result.repository';
import { ActionPlanRepository } from './repositories/action-plan.repository';
import { ProjectModule } from '../project/project.module';
import { LlmModule } from '../llm/llm.module';
import { AuthModule } from '../auth/auth.module';
import { BatchModule } from '../batch/batch.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CrawledPage.name, schema: CrawledPageSchema },
      { name: SearchIndex.name, schema: SearchIndexSchema },
      { name: ScanResult.name, schema: ScanResultSchema },
      { name: ActionPlan.name, schema: ActionPlanSchema },
    ]),
    ScheduleModule.forRoot(),
    ProjectModule,
    LlmModule,
    AuthModule,
    BatchModule,
  ],
  controllers: [
    CrawlerController,
    IndexController,
    ScannerController,
    AIVisibilityBatchController,
    ActionPlanController,
  ],
  providers: [
    WebCrawlerService,
    TextProcessorService,
    BM25IndexService,
    VectorIndexService,
    HybridSearchService,
    QueryGeneratorService,
    VisibilityScannerService,
    RecommendationService,
    AIVisibilityOrchestratorService,
    ActionPlanService,
    AIVisibilityBatchTask,
    CrawledPageRepository,
    SearchIndexRepository,
    ScanResultRepository,
    ActionPlanRepository,
  ],
  exports: [
    WebCrawlerService,
    VisibilityScannerService,
    RecommendationService,
    AIVisibilityOrchestratorService,
    ActionPlanService,
  ],
})
export class AiVisibilityModule {}