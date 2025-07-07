import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebCrawlerService } from './services/web-crawler.service';
import { ContentAnalyzerService } from './services/content-analyzer.service';
import { CrawlerPipelineService } from './services/crawler-pipeline.service';
import { CrawlerController } from './controllers/crawler.controller';
import { UserCrawlerController } from './controllers/user-crawler.controller';
import { CrawlerEventsGateway } from './gateways/crawler-events.gateway';
import { CrawledPage, CrawledPageSchema } from './schemas/crawled-page.schema';
import { ContentScore, ContentScoreSchema } from './schemas/content-score.schema';
import { DomainAuthority, DomainAuthoritySchema } from './schemas/domain-authority.schema';
import { DomainAnalysis, DomainAnalysisSchema } from './schemas/domain-analysis.schema';
import { CrawledPageRepository } from './repositories/crawled-page.repository';
import { ContentScoreRepository } from './repositories/content-score.repository';
import { DomainAuthorityRepository } from './repositories/domain-authority.repository';
import { DomainAnalysisRepository } from './repositories/domain-analysis.repository';
import { PageCategorizerService } from './services/page-categorizer.service';
import { LLMCallTrackerService } from './services/llm-call-tracker.service';
import { TrackedLLMService } from './services/tracked-llm.service';
import { DomainAnalysisService } from './services/domain-analysis.service';
import { RuleRegistryService } from './rules/registry/rule-registry.service';
import { RuleAggregatorService } from './rules/registry/rule-aggregator.service';
import { ConditionalAggregatorService } from './rules/registry/conditional-aggregator.service';
// AEO services
import { AEORuleRegistryService } from './services/aeo-rule-registry.service';
import { AEOScoringService } from './services/aeo-scoring.service';
import { AEOContentAnalyzerService } from './services/aeo-content-analyzer.service';
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
      { name: DomainAuthority.name, schema: DomainAuthoritySchema },
      { name: DomainAnalysis.name, schema: DomainAnalysisSchema },
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
    AEOContentAnalyzerService,
    CrawlerPipelineService,
    CrawledPageRepository,
    ContentScoreRepository,
    DomainAuthorityRepository,
    DomainAnalysisRepository,
    DomainAnalysisService,
    PageCategorizerService,
    LLMCallTrackerService,
    TrackedLLMService,
    CrawlerEventsGateway,
    // Rule-based system (for new AEO rules)
    RuleRegistryService,
    RuleAggregatorService,
    ConditionalAggregatorService,
    // AEO services
    AEORuleRegistryService,
    AEOScoringService,
    AEOContentAnalyzerService,
  ],
  exports: [
    WebCrawlerService,
    ContentAnalyzerService,
    AEOContentAnalyzerService,
    CrawlerPipelineService,
    CrawledPageRepository,
    ContentScoreRepository,
    DomainAnalysisRepository,
    DomainAnalysisService,
    PageCategorizerService,
    RuleRegistryService,
    RuleAggregatorService,
    AEORuleRegistryService,
    AEOScoringService,
    AEOContentAnalyzerService,
  ],
})
export class CrawlerModule {}