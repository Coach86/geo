import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminReportController } from './controllers/admin-report.controller';
import { AdminRawResponseController } from './controllers/admin-raw-response.controller';
import { PublicReportController } from './controllers/public-report.controller';
import { ReportService } from './services/report.service';
import { RawResponseService } from './services/raw-response.service';
import { WeeklyBrandReport, WeeklyBrandReportSchema } from './schemas/weekly-brand-report.schema';
import { RawResponse, RawResponseSchema } from './schemas/raw-response.schema';
import { IdentityCardModule } from '../identity-card/identity-card.module';
import { AuthModule } from '../auth/auth.module';

// Import specialized services
import { ReportTransformationService } from './services/report-transformation.service';
import { ReportAccessService } from './services/report-access.service';
import { ReportIntegrationService } from './services/report-integration.service';
import { ReportPersistenceService } from './services/report-persistence.service';
import { ReportRetrievalService } from './services/report-retrieval.service';
import { ReportConverterService } from './services/report-converter.service';
import { UserModule } from '../user/user.module';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { TokenService } from '../auth/services/token.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WeeklyBrandReport.name, schema: WeeklyBrandReportSchema },
      { name: RawResponse.name, schema: RawResponseSchema },
    ]),
    IdentityCardModule, // Import the IdentityCard module to access its service
    UserModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [AdminReportController, AdminRawResponseController, PublicReportController],
  providers: [
    // Main services
    ReportService,
    RawResponseService,

    // Specialized services
    ReportTransformationService,
    ReportAccessService,
    ReportIntegrationService,
    ReportPersistenceService,
    ReportRetrievalService,
    ReportConverterService,
    
    // Guards
    TokenAuthGuard,
  ],
  exports: [ReportService, RawResponseService],
})
export class ReportModule {}
