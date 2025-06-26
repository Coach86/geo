import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { LoopsService } from './services/loops.service';
import { ReportCompletedListener } from './listeners/report-completed.listener';
import { UserLoopsListener } from './listeners/user-loops.listener';
import { EmailEventListener } from './listeners/email-event.listener';
import { UserModule } from '../user/user.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => UserModule),
    forwardRef(() => ProjectModule),
  ],
  providers: [
    EmailService,
    LoopsService,
    ReportCompletedListener,
    UserLoopsListener,
    EmailEventListener,
  ],
  exports: [EmailService, LoopsService],
})
export class EmailModule {}