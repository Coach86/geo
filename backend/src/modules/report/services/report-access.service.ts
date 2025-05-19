import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { renderAsync } from '@react-email/render';
import React from 'react';
// Using TokenService from the auth module instead of local schemas
import { ReportAccessEmail } from '../email';
import { format } from 'date-fns';
import { TokenService } from '../../auth/services/token.service';

/**
 * Service responsible for managing report access tokens and email notifications
 */
@Injectable()
export class ReportAccessService {
  private readonly logger = new Logger(ReportAccessService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(TokenService) private readonly tokenService: TokenService,
  ) {}

  /**
   * Generate a secure access token for a user to access all their reports
   * @deprecated Use TokenService.generateAccessToken instead
   */
  async generateAccessToken(userId: string): Promise<string> {
    this.logger.warn(
      `Using deprecated generateAccessToken method in ReportAccessService. Use TokenService instead.`,
    );
    return this.tokenService.generateAccessToken(userId);
  }

  /**
   * Validate an access token
   * @deprecated Use TokenService.validateAccessToken instead
   */
  async validateAccessToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    this.logger.warn(
      `Using deprecated validateAccessToken method in ReportAccessService. Use TokenService instead.`,
    );
    return this.tokenService.validateAccessToken(token);
  }

  /**
   * Send an email with a secure access link to view all user's reports
   */
  async sendReportAccessEmail(
    reportId: string,
    token: string,
    reportDate: Date,
    recipientEmail: string,
    companyName: string,
  ): Promise<void> {
    try {
      this.logger.log(`Sending report access email for user ${recipientEmail}`);

      // Format report date
      const formattedReportDate = format(reportDate, 'MMM dd, yyyy');

      // Construct the access URL based on environment
      const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
      const accessUrl = `${baseUrl}/report-access?token=${token}&reportId=${reportId}`;

      // Create and send the email
      const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
      if (!resendApiKey) {
        this.logger.warn('RESEND_API_KEY not configured, skipping email notification');
        return;
      }

      const resend = new Resend(resendApiKey);

      const emailResponse = await resend.emails.send({
        from: 'tailorfeed-ai@tailorfeed.ai',
        to: recipientEmail,
        subject: `Your Brand Intelligence Reports are ready`,
        react: React.createElement(ReportAccessEmail, {
          reportDate: formattedReportDate,
          accessUrl,
          companyName,
        }),
      });

      if (emailResponse.error) {
        throw new Error(`Failed to send email: ${emailResponse.error.message}`);
      }

      this.logger.log(
        `Report access email sent for user ${recipientEmail} with token ${token.substring(0, 8)}...`,
      );
    } catch (error) {
      this.logger.error(`Failed to send report access email: ${error.message}`, error.stack);
      // Don't throw, just log the error to prevent report saving from failing
    }
  }

  /**
   * Send a report access email to a specific address
   */
  async sendReportEmailToAddress(
    userId: string,
    reportId: string,
    emailAddress: string,
    reportDate: Date,
    companyName: string,
    customSubject?: string,
  ): Promise<boolean> {
    try {
      this.logger.log(`Attempting to send report email for user ${userId} to ${emailAddress}`);

      // Generate a new token for this user
      const token = await this.tokenService.generateAccessToken(userId);

      // Format the report date
      const reportDateFormatted = format(reportDate, 'MMM dd, yyyy');

      // Construct the access URL
      const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
      const accessUrl = `${baseUrl}/report-access?token=${token}&reportId=${reportId}`;

      // Check for Resend API key
      const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
      if (!resendApiKey) {
        this.logger.warn('RESEND_API_KEY not configured, skipping email notification');
        return false;
      }

      // Send the email
      const resend = new Resend(resendApiKey);
      const senderEmail =
        this.configService.get<string>('SENDER_EMAIL') || 'brand-intelligence@contexteai.com';

      // Create default subject if not provided
      const subject = customSubject || `Your Brand Intelligence Reports`;

      const emailResponse = await resend.emails.send({
        from: 'tailorfeed-ai@tailorfeed.ai',
        to: emailAddress,
        subject: subject,
        react: React.createElement(ReportAccessEmail, {
          companyName,
          reportDate: reportDateFormatted,
          accessUrl,
        }),
      });

      if (emailResponse.error) {
        throw new Error(`Failed to send email: ${emailResponse.error.message}`);
      }

      this.logger.log(`Report access email sent to ${emailAddress} for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send report email: ${error.message}`, error.stack);
      throw error;
    }
  }
}
