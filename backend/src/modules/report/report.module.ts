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
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { ConfigModule } from '@nestjs/config';

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
    TokenAuthGuard,
  ],
  exports: [BrandReportService, BrandReportPersistenceService],
})
export class ReportModule {}
