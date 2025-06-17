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
}
