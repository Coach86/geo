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
import { StructureAnalyzer } from './analyzers/structure.analyzer';
import { BrandAnalyzer } from './analyzers/brand.analyzer';
import { PageCategorizerService } from './services/page-categorizer.service';
import { RuleRegistryService } from './rules/registry/rule-registry.service';
import { RuleAggregatorService } from './rules/registry/rule-aggregator.service';
import { ConditionalAggregatorService } from './rules/registry/conditional-aggregator.service';
import { RuleBasedAuthorityAnalyzer } from './analyzers/rule-based-authority.analyzer';
import { RuleBasedFreshnessAnalyzer } from './analyzers/rule-based-freshness.analyzer';
import { RuleBasedStructureAnalyzer } from './analyzers/rule-based-structure.analyzer';
import { RuleBasedBrandAnalyzer } from './analyzers/rule-based-brand.analyzer';
// Authority rules
import { BaseAuthorityRule, AuthorPresenceRule, CitationQualityRule, DomainAuthorityRule } from './rules/authority';
// Freshness rules
import { BaseFreshnessRule, DateSignalsRule, TimelinessRule, UpdateFrequencyRule } from './rules/freshness';
// Structure rules
import { HeadingHierarchyRule, SchemaMarkupRule, ReadabilityRule, ListsTablesRule, SentenceStructureRule, QAContentRule } from './rules/structure';
// Brand rules
import { BrandPresenceRule, KeywordAlignmentRule } from './rules/brand';
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
    StructureAnalyzer,
    BrandAnalyzer,
    PageCategorizerService,
    CrawlerEventsGateway,
    // Rule-based system
    RuleRegistryService,
    RuleAggregatorService,
    ConditionalAggregatorService,
    RuleBasedAuthorityAnalyzer,
    RuleBasedFreshnessAnalyzer,
    RuleBasedStructureAnalyzer,
    RuleBasedBrandAnalyzer,
    // Authority rules
    BaseAuthorityRule,
    AuthorPresenceRule,
    CitationQualityRule,
    DomainAuthorityRule,
    // Freshness rules
    BaseFreshnessRule,
    DateSignalsRule,
    TimelinessRule,
    UpdateFrequencyRule,
    // Structure rules
    HeadingHierarchyRule,
    SchemaMarkupRule,
    ReadabilityRule,
    ListsTablesRule,
    SentenceStructureRule,
    QAContentRule,
    // Brand rules
    BrandPresenceRule,
    KeywordAlignmentRule,
  ],
  exports: [
    WebCrawlerService,
    ContentAnalyzerService,
    CrawlerPipelineService,
    ScoringRulesService,
    CrawledPageRepository,
    ContentScoreRepository,
    PageCategorizerService,
    RuleRegistryService,
    RuleAggregatorService,
  ],
})
export class CrawlerModule {}