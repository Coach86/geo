import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { ReportCompletedEvent } from '../../batch/events/report-completed.event';
import { SendReportReadyEmailEvent } from '../events/email.events';

@Injectable()
export class ReportCompletedListener {
  private readonly logger = new Logger(ReportCompletedListener.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('report.completed', { async: true })
  async handleReportCompleted(event: ReportCompletedEvent) {
    try {
      this.logger.log(
        `Handling report.completed event for project ${event.projectId} (${event.brandName})`,
      );

      // Emit email.report.ready event instead of directly sending email
      this.eventEmitter.emit(
        'email.report.ready',
        new SendReportReadyEmailEvent(
          event.userId,
          event.projectId,
          event.reportId,
        ),
      );

      this.logger.log(
        `Successfully emitted email.report.ready event for project ${event.projectId}`,
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