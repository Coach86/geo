import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '../services/email.service';
import { LoopsService } from '../services/loops.service';
import { UserService } from '../../user/services/user.service';
import { ProjectService } from '../../project/services/project.service';
import {
  SendEmailEvent,
  SendReportReadyEmailEvent,
  SendMagicLinkEmailEvent,
  SendInviteEmailEvent,
  SendSubscriptionConfirmationEmailEvent,
  UpdateLoopsContactEvent,
  SendSubscriptionCancelledEmailEvent,
} from '../events/email.events';

@Injectable()
export class EmailEventListener {
  private readonly logger = new Logger(EmailEventListener.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly loopsService: LoopsService,
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
  ) {}

  @OnEvent('email.send')
  async handleSendEmail(event: SendEmailEvent) {
    try {
      // Generic email sending would need to be implemented in EmailService
      this.logger.warn('Generic email sending not implemented yet');
    } catch (error) {
      this.logger.error('Failed to send email', error);
    }
  }

  @OnEvent('email.report.ready')
  async handleReportReadyEmail(event: SendReportReadyEmailEvent) {
    try {
      const user = await this.userService.findOne(event.userId);
      const project = await this.projectService.findById(event.projectId);
      
      if (!user || !project) {
        throw new Error('User or project not found');
      }

      // Use the existing sendAnalysisReadyEmail method
      await this.emailService.sendAnalysisReadyEmail(
        user.email,
        project.name || 'Untitled Project',
        event.projectId,
        event.reportId,
      );
    } catch (error) {
      this.logger.error('Failed to send report ready email', error);
    }
  }

  @OnEvent('email.magic-link')
  async handleMagicLinkEmail(event: SendMagicLinkEmailEvent) {
    try {
      // Magic link email is handled by AuthService directly
      this.logger.warn('Magic link email should be sent directly by AuthService');
    } catch (error) {
      this.logger.error('Failed to send magic link email', error);
    }
  }

  @OnEvent('email.invite')
  async handleInviteEmail(event: SendInviteEmailEvent) {
    try {
      // Invite email functionality would need to be implemented
      this.logger.warn('Invite email not implemented yet');
    } catch (error) {
      this.logger.error('Failed to send invite email', error);
    }
  }

  @OnEvent('email.subscription-confirmation')
  async handleSubscriptionConfirmationEmail(event: SendSubscriptionConfirmationEmailEvent) {
    try {
      const user = await this.userService.findOne(event.userId);
      if (!user) {
        throw new Error(`User not found: ${event.userId}`);
      }

      // Send subscription confirmation email
      await this.emailService.sendSubscriptionConfirmationEmail(
        user.email,
        user.email, // Using email as name since user doesn't have a name field
        event.planName,
        event.amount,
      );
    } catch (error) {
      this.logger.error('Failed to send subscription confirmation email', error);
    }
  }

  @OnEvent('loops.update-contact')
  async handleUpdateLoopsContact(event: UpdateLoopsContactEvent) {
    try {
      await this.loopsService.updateContact(event.email, event.data);
    } catch (error) {
      this.logger.error('Failed to update Loops contact', error);
    }
  }

  @OnEvent('email.subscription-cancelled')
  async handleSubscriptionCancelledEmail(event: SendSubscriptionCancelledEmailEvent) {
    try {
      await this.emailService.sendSubscriptionCancelledEmail(
        event.email,
        event.name,
        event.planName,
        event.endDate,
      );
    } catch (error) {
      this.logger.error('Failed to send subscription cancelled email', error);
    }
  }
}