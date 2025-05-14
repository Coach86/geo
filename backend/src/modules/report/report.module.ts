import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportController } from './controllers/report.controller';
import { RawResponseController } from './controllers/raw-response.controller';
import { ReportService } from './services/report.service';
import { RawResponseService } from './services/raw-response.service';
import { WeeklyBrandReport, WeeklyBrandReportSchema } from './schemas/weekly-brand-report.schema';
import { RawResponse, RawResponseSchema } from './schemas/raw-response.schema';
import { ReportAccessToken, ReportAccessTokenSchema } from './schemas/report-access-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WeeklyBrandReport.name, schema: WeeklyBrandReportSchema },
      { name: RawResponse.name, schema: RawResponseSchema },
      { name: ReportAccessToken.name, schema: ReportAccessTokenSchema },
    ]),
  ],
  controllers: [ReportController, RawResponseController],
  providers: [
    ReportService,
    RawResponseService,
  ],
  exports: [ReportService, RawResponseService],
})
export class ReportModule {}