import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BrandReportController } from './controllers/brand-report.controller';
import { AdminBrandReportController } from './controllers/admin-brand-report.controller';
import { BrandReportService } from './services/brand-report.service';
import { BrandReport, BrandReportSchema } from './schemas/brand-report.schema';
import { ProjectModule } from '../project/project.module';
import { AuthModule } from '../auth/auth.module';
import { BatchModule } from '../batch/batch.module';
import { BrandReportPersistenceService } from './services/brand-report-persistence.service';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '@nestjs/config';

// Import the new services
import { BrandReportQueryService } from './services/brand-report-query.service';
import { BrandReportMapperService } from './services/brand-report-mapper.service';
import { BrandReportCitationExtractorService } from './services/brand-report-citation-extractor.service';
import { BrandReportVariationCalculatorService } from './services/brand-report-variation-calculator.service';
import { BrandReportVisibilityAggregationService } from './services/brand-report-visibility-aggregation.service';
import { BrandReportAlignmentAggregationService } from './services/brand-report-alignment-aggregation.service';
import { BrandReportSentimentAggregationService } from './services/brand-report-sentiment-aggregation.service';
import { BrandReportCompetitionAggregationService } from './services/brand-report-competition-aggregation.service';
import { BrandReportExplorerAggregationService } from './services/brand-report-explorer-aggregation.service';
import { ReportService } from './services/report.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BrandReport.name, schema: BrandReportSchema },
    ]),
    forwardRef(() => ProjectModule),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => BatchModule),
    ConfigModule,
  ],
  controllers: [BrandReportController, AdminBrandReportController],
  providers: [
    BrandReportService,
    BrandReportPersistenceService,
    // Add the new services
    BrandReportQueryService,
    BrandReportMapperService,
    BrandReportCitationExtractorService,
    BrandReportVariationCalculatorService,
    BrandReportVisibilityAggregationService,
    BrandReportAlignmentAggregationService,
    BrandReportSentimentAggregationService,
    BrandReportCompetitionAggregationService,
    BrandReportExplorerAggregationService,
    ReportService,
  ],
  exports: [
    BrandReportService,
    BrandReportPersistenceService,
    // Export the services that might be used by other modules
    BrandReportQueryService,
    ReportService,
  ],
})
export class ReportModule {}