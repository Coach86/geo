import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { ReportCompletedListener } from './listeners/report-completed.listener';
import { UserModule } from '../user/user.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [ConfigModule, UserModule, ProjectModule],
  providers: [EmailService, ReportCompletedListener],
  exports: [EmailService],
})
export class EmailModule {}