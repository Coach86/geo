import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import React from 'react';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service initialized with Resend');
    } else {
      this.logger.warn('RESEND_API_KEY not configured, email sending disabled');
    }
  }

  async sendAnalysisReadyEmail(
    email: string,
    brandName: string,
    projectId: string,
    reportId: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured, skipping email to ' + email);
      return;
    }

    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://app.getmint.ai');

      const AnalysisReadyEmail = await import('../templates/analysis-ready.email').then(m => m.default);

      const { error } = await this.resend.emails.send({
        from: 'Mint <notifications@getmint.ai>',
        to: email,
        subject: `Your brand analysis is ready - ${brandName}`,
        react: React.createElement(AnalysisReadyEmail, {
          brandName,
          reportUrl: frontendUrl,
          analysisDate: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        }),
      });

      if (error) {
        throw new Error(`Failed to send email: ${error.message}`);
      }

      this.logger.log(`Analysis ready email sent to ${email} for brand ${brandName}`);
    } catch (error) {
      this.logger.error(`Failed to send analysis ready email: ${error.message}`, error.stack);
      // Don't throw - we don't want email failures to affect the system
    }
  }

  async sendSubscriptionCancelledEmail(
    email: string,
    userName: string,
    planName: string,
    endDate: Date,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured, skipping cancellation email to ' + email);
      return;
    }

    try {
      this.logger.log('Sending cancellation email with date:', {
        endDate,
        isValidDate: endDate instanceof Date && !isNaN(endDate.getTime()),
        dateString: endDate?.toISOString(),
      });

      const SubscriptionCancelledEmail = await import('../templates/subscription-cancelled.email').then(m => m.default);

      const formattedDate = endDate instanceof Date && !isNaN(endDate.getTime())
        ? endDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Unknown date';

      const { error } = await this.resend.emails.send({
        from: 'Mint <notifications@getmint.ai>',
        to: email,
        subject: 'Subscription Cancellation Confirmed',
        react: React.createElement(SubscriptionCancelledEmail, {
          userName,
          userEmail: email,
          planName,
          endDate: formattedDate,
        }),
      });

      if (error) {
        throw new Error(`Failed to send cancellation email: ${error.message}`);
      }

      this.logger.log(`Subscription cancellation email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send subscription cancellation email: ${error.message}`, error.stack);
      // Don't throw - we don't want email failures to affect the system
    }
  }

  async sendSubscriptionConfirmationEmail(
    email: string,
    userName: string,
    planName: string,
    amount: number,
    billingCycle: string = 'monthly',
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured, skipping subscription confirmation email to ' + email);
      return;
    }

    try {
      this.logger.log('Sending subscription confirmation email:', {
        email,
        planName,
        amount,
        billingCycle,
      });

      const SubscriptionConfirmationEmail = await import('../templates/subscription-confirmation.email').then(m => m.default);

      const { error } = await this.resend.emails.send({
        from: 'Mint <notifications@getmint.ai>',
        to: email,
        subject: `Welcome to ${planName} - Subscription Confirmed`,
        react: React.createElement(SubscriptionConfirmationEmail, {
          userName,
          userEmail: email,
          planName,
          amount,
          billingCycle,
        }),
      });

      if (error) {
        throw new Error(`Failed to send subscription confirmation email: ${error.message}`);
      }

      this.logger.log(`Subscription confirmation email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send subscription confirmation email: ${error.message}`, error.stack);
      // Don't throw - we don't want email failures to affect the system
    }
  }

  async sendMagicLinkEmail(
    email: string,
    token: string,
    promoCode?: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured, skipping magic link email to ' + email);
      return;
    }

    try {
      const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      let accessUrl = `${baseUrl}/auth/login?token=${token}`;
      
      // Add promo parameter if provided
      if (promoCode !== undefined) {
        accessUrl += `&promo=${encodeURIComponent(promoCode)}`;
      }

      this.logger.log('Sending magic link email:', {
        email,
        tokenPreview: token.substring(0, 8) + '...',
        promoCode,
      });

      const MagicLinkEmail = await import('../templates/MagicLinkEmail').then(m => m.default);

      const { error } = await this.resend.emails.send({
        from: 'Mint <mint-ai@getmint.ai>',
        to: email,
        subject: 'Sign in to Mint - Your magic link is ready',
        react: React.createElement(MagicLinkEmail, {
          email,
          accessUrl,
        }),
      });

      if (error) {
        throw new Error(`Failed to send magic link email: ${error.message}`);
      }

      this.logger.log(`Magic link email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send magic link email: ${error.message}`, error.stack);
      // Don't throw - we don't want email failures to affect the system
    }
  }

  async sendInviteEmail(
    email: string,
    inviterName: string,
    organizationName: string,
    inviteToken: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured, skipping invite email to ' + email);
      return;
    }

    try {
      this.logger.log('Sending invite email:', {
        email,
        inviterName,
        organizationName,
        tokenPreview: inviteToken.substring(0, 8) + '...',
      });

      const InviteEmail = await import('../templates/invite.email').then(m => m.default);

      const { error } = await this.resend.emails.send({
        from: 'Mint <notifications@getmint.ai>',
        to: email,
        subject: `You've been invited to Mint`,
        react: React.createElement(InviteEmail, {
          inviteEmail: email,
          inviterName,
          organizationName,
          inviteToken,
        }),
      });

      if (error) {
        throw new Error(`Failed to send invite email: ${error.message}`);
      }

      this.logger.log(`Invite email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send invite email: ${error.message}`, error.stack);
      // Don't throw - we don't want email failures to affect the system
    }
  }

  async sendFeedbackEmail(
    userEmail: string,
    userName: string,
    subject: string,
    message: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured, skipping feedback email');
      return;
    }

    try {
      this.logger.log('Sending feedback email:', {
        userEmail,
        userName,
        subject,
      });

      const { error } = await this.resend.emails.send({
        from: 'Mint Feedback <feedback@getmint.ai>',
        to: 'contact@getmint.ai',
        replyTo: userEmail,
        subject: `[Feedback] ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Feedback Received</h2>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>From:</strong> ${userName}</p>
              <p><strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
              <p><strong>Subject:</strong> ${subject}</p>
            </div>
            <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
              <h3 style="color: #555; margin-top: 0;">Message:</h3>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              This email was sent from the Mint AI feedback form.
            </p>
          </div>
        `,
        text: `New Feedback Received\n\nFrom: ${userName}\nEmail: ${userEmail}\nSubject: ${subject}\n\nMessage:\n${message}`,
      });

      if (error) {
        throw new Error(`Failed to send feedback email: ${error.message}`);
      }

      this.logger.log(`Feedback email sent from ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send feedback email: ${error.message}`, error.stack);
      throw error; // Throw for feedback emails so user knows if it failed
    }
  }
}
