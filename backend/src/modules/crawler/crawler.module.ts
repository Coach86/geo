import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebCrawlerService } from './services/web-crawler.service';
import { ContentAnalyzerService } from './services/content-analyzer.service';
import { CrawlerPipelineService } from './services/crawler-pipeline.service';
import { ScoringRulesService } from './services/scoring-rules.service';
import { PageSignalExtractorService } from './services/page-signal-extractor.service';
import { UnifiedKPIAnalyzerService } from './services/unified-kpi-analyzer.service';
import { HybridKPIAnalyzerService } from './services/hybrid-kpi-analyzer.service';
import { IssueFactoryService } from './services/issue-factory.service';
import { CrawlerController } from './controllers/crawler.controller';
import { UserCrawlerController } from './controllers/user-crawler.controller';
import { CrawlerEventsGateway } from './gateways/crawler-events.gateway';
import { CrawledPage, CrawledPageSchema } from './schemas/crawled-page.schema';
import { ContentScore, ContentScoreSchema } from './schemas/content-score.schema';
import { CrawledPageRepository } from './repositories/crawled-page.repository';
import { ContentScoreRepository } from './repositories/content-score.repository';
import { AuthorityAnalyzer } from './analyzers/authority.analyzer';
import { FreshnessAnalyzer } from './analyzers/freshness.analyzer';
import { StructureAnalyzer } from './analyzers/structure.analyzer';
import { SnippetAnalyzer } from './analyzers/snippet.analyzer';
import { BrandAnalyzer } from './analyzers/brand.analyzer';
import { ProjectModule } from '../project/project.module';
import { ConfigModule } from '../config/config.module';
import { BatchModule } from '../batch/batch.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CrawledPage.name, schema: CrawledPageSchema },
      { name: ContentScore.name, schema: ContentScoreSchema },
    ]),
    forwardRef(() => ProjectModule),
    forwardRef(() => BatchModule),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    ConfigModule,
    LlmModule,
  ],
  controllers: [CrawlerController, UserCrawlerController],
  providers: [
    WebCrawlerService,
    ContentAnalyzerService,
    CrawlerPipelineService,
    ScoringRulesService,
    PageSignalExtractorService,
    UnifiedKPIAnalyzerService,
    HybridKPIAnalyzerService,
    IssueFactoryService,
    CrawledPageRepository,
    ContentScoreRepository,
    AuthorityAnalyzer,
    FreshnessAnalyzer,
    StructureAnalyzer,
    SnippetAnalyzer,
    BrandAnalyzer,
    CrawlerEventsGateway,
  ],
  exports: [
    WebCrawlerService,
    ContentAnalyzerService,
    CrawlerPipelineService,
    ScoringRulesService,
    CrawledPageRepository,
    ContentScoreRepository,
  ],
})
export class CrawlerModule {}