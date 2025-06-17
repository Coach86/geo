import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ReportCompletedEvent } from '../../batch/events/report-completed.event';
import { EmailService } from '../services/email.service';

@Injectable()
export class ReportCompletedListener {
  private readonly logger = new Logger(ReportCompletedListener.name);

  constructor(private readonly emailService: EmailService) {}

  @OnEvent('report.completed', { async: true })
  async handleReportCompleted(event: ReportCompletedEvent) {
    try {
      this.logger.log(
        `Handling report.completed event for project ${event.projectId} (${event.brandName})`,
      );

      // Send email notification
      await this.emailService.sendAnalysisReadyEmail(
        event.userEmail,
        event.brandName,
        event.projectId,
        event.reportId,
      );

      this.logger.log(
        `Successfully sent report completion email for project ${event.projectId} to ${event.userEmail}`,
      );
    } catch (error) {
      // Don't throw - we don't want email failures to affect the system
      this.logger.error(
        `Failed to handle report completion event for project ${event.projectId}: ${error.message}`,
        error.stack,
      );
    }
  }
}