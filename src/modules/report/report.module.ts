import { Module } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { ReportController } from './controllers/report.controller';
import { ReportService } from './services/report.service';

@Module({
  controllers: [ReportController],
  providers: [
    ReportService,
    PrismaService,
  ],
  exports: [ReportService],
})
export class ReportModule {}