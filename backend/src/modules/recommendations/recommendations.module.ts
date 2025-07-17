import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationsController } from './controllers/recommendations.controller';
import { UserRecommendationsController } from './controllers/user-recommendations.controller';
import { RecommendationService } from './services/recommendation.service';
import { RecommendationEngineService } from './services/recommendation-engine.service';
import { PatternDetectionService } from './services/pattern-detection.service';
import { LLMAnalysisService } from './services/llm-analysis.service';
import { RecommendationRepository } from './repositories/recommendation.repository';
import { RecommendationEventsGateway } from './gateways/recommendation-events.gateway';
import { BatchCompletedListener } from './listeners/batch-completed.listener';
import {
  Recommendation,
  RecommendationSchema,
} from './schemas/recommendation.schema';
import { Evidence, EvidenceSchema } from './schemas/evidence.schema';
import {
  AnalysisMetadata,
  AnalysisMetadataSchema,
} from './schemas/analysis-metadata.schema';
import { ReportModule } from '../report/report.module';
import { ProjectModule } from '../project/project.module';
import { LlmModule } from '../llm/llm.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { EntityGapAnalyzer } from './analyzers/entity-gap.analyzer';
import { FeatureGapAnalyzer } from './analyzers/feature-gap.analyzer';
import { ContentPresenceAnalyzer } from './analyzers/content-presence.analyzer';
import { LocalizationAnalyzer } from './analyzers/localization.analyzer';
import { SentimentImprovementAnalyzer } from './analyzers/sentiment-improvement.analyzer';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recommendation.name, schema: RecommendationSchema },
      { name: Evidence.name, schema: EvidenceSchema },
      { name: AnalysisMetadata.name, schema: AnalysisMetadataSchema },
    ]),
    ReportModule,
    ProjectModule,
    LlmModule,
    AuthModule,
    UserModule,
  ],
  controllers: [RecommendationsController, UserRecommendationsController],
  providers: [
    // Services
    RecommendationService,
    RecommendationEngineService,
    PatternDetectionService,
    LLMAnalysisService,
    
    // Repository
    RecommendationRepository,
    
    // Gateway
    RecommendationEventsGateway,
    
    // Listeners
    BatchCompletedListener,
    
    // Analyzers
    EntityGapAnalyzer,
    FeatureGapAnalyzer,
    ContentPresenceAnalyzer,
    LocalizationAnalyzer,
    SentimentImprovementAnalyzer,
  ],
  exports: [RecommendationService],
})
export class RecommendationsModule {}