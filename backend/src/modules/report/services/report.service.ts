import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { WeeklyBrandReport as WeeklyBrandReportEntity } from '../entities/weekly-brand-report.entity';
import {
  WeeklyBrandReport,
  WeeklyBrandReportDocument,
} from '../schemas/weekly-brand-report.schema';
import {
  ReportAccessToken,
  ReportAccessTokenDocument,
} from '../schemas/report-access-token.schema';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { renderAsync } from '@react-email/render';
import React from 'react';
import { BrandIntelligenceReport, ReportAccessEmail } from '../email/index';
import { randomBytes } from 'crypto';
import { addDays, format } from 'date-fns';

@Injectable()
export class ReportService implements OnModuleInit {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectModel(WeeklyBrandReport.name)
    private weeklyReportModel: Model<WeeklyBrandReportDocument>,
    @InjectModel(ReportAccessToken.name)
    private reportAccessTokenModel: Model<ReportAccessTokenDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const data = {
      brand: 'YourBrand',
      metadata: {
        url: 'yourbrand.com',
        market: 'US Market / English',
        flag: '🇺🇸',
        competitors: 'Competitor A, Competitor B, Competitor C',
        date: new Date().toISOString().split('T')[0],
        models: 'ChatGPT‑4o, Claude 3 Sonnet, Gemini 1.5 Pro, Mistral Le Chat Large',
      },
      kpi: {
        pulse: {
          value: '68%',
          description: 'Global Visibility Score across all tested models',
        },
        tone: {
          value: '+0.35',
          status: 'green' as 'green',
          description: 'Overall sentiment score across all models',
        },
        accord: {
          value: '7.4/10',
          status: 'green' as 'green',
          description: 'Brand compliance with provided attributes',
        },
        arena: {
          competitors: ['Competitor A', 'Competitor B', 'Competitor C'],
          description: 'Top competitors mentioned by AI models',
        },
      },
      pulse: {
        promptsTested: 15,
        modelVisibility: [
          { model: 'Claude 3', value: 82 },
          { model: 'ChatGPT‑4o', value: 75 },
          { model: 'Mistral Large', value: 60 },
          { model: 'Gemini 1.5 Pro', value: 55 },
          { model: 'Global Avg', value: 68, isAverage: true },
        ],
      },
      tone: {
        sentiments: [
          {
            model: 'ChatGPT‑4o',
            sentiment: '+0.42',
            status: 'green' as 'green',
            positives: 'innovative, user-friendly',
            negatives: 'premium pricing',
          },
          {
            model: 'Claude 3',
            sentiment: '+0.38',
            status: 'green' as 'green',
            positives: 'reliable, excellent support',
            negatives: 'complex interface',
          },
          {
            model: 'Gemini',
            sentiment: '+0.25',
            status: 'yellow' as 'yellow',
            positives: 'quality product, responsive',
            negatives: 'limited availability',
          },
          {
            model: 'Global Avg',
            sentiment: '+0.35',
            status: 'green' as 'green',
            positives: '—',
            negatives: '—',
            isAverage: true,
          },
        ],
        questions: [
          {
            question: 'What do you think of YourBrand?',
            results: [
              {
                model: 'ChatGPT‑4o',
                sentiment: '+0.45',
                status: 'green' as 'green',
                keywords: 'innovative, industry leader',
              },
              {
                model: 'Claude 3',
                sentiment: '+0.40',
                status: 'green' as 'green',
                keywords: 'reliable, excellent customer service',
              },
              {
                model: 'Mistral Large',
                sentiment: '+0.35',
                status: 'green' as 'green',
                keywords: 'high quality, trusted',
              },
              {
                model: 'Gemini 1.5 Pro',
                sentiment: '+0.25',
                status: 'yellow' as 'yellow',
                keywords: 'good but expensive',
              },
            ],
          },
          {
            question: 'Key pros/cons of YourBrand?',
            results: [
              {
                model: 'ChatGPT‑4o',
                sentiment: '+0.38',
                status: 'green' as 'green',
                keywords: 'innovative vs premium pricing',
              },
              {
                model: 'Claude 3',
                sentiment: '+0.36',
                status: 'green' as 'green',
                keywords: 'reliability vs availability',
              },
              {
                model: 'Mistral Large',
                sentiment: '+0.30',
                status: 'green' as 'green',
                keywords: 'quality vs limited options',
              },
              {
                model: 'Gemini 1.5 Pro',
                sentiment: '+0.20',
                status: 'yellow' as 'yellow',
                keywords: 'good features vs complex UI',
              },
            ],
          },
        ],
      },
      accord: {
        attributes: [
          { name: 'Innovation', rate: '82%', alignment: '✅' as '✅' },
          { name: 'Reliability', rate: '78%', alignment: '✅' as '✅' },
          { name: 'User-Friendly', rate: '65%', alignment: '✅' as '✅' },
          { name: 'Value', rate: '48%', alignment: '⚠️' as '⚠️' },
          { name: 'Accessibility', rate: '52%', alignment: '⚠️' as '⚠️' },
        ],
        score: { value: '7.4/10', status: 'green' as 'green' },
      },
      arena: {
        competitors: [
          {
            name: 'Competitor A',
            chatgpt: 1,
            claude: 2,
            mistral: 1,
            gemini: 1,
            global: '65%',
            size: 'lg' as 'lg',
            sentiment: 'positive' as 'positive',
          },
          {
            name: 'Competitor B',
            chatgpt: 2,
            claude: 1,
            mistral: 2,
            gemini: 2,
            global: '60%',
            size: 'lg' as 'lg',
            sentiment: 'positive' as 'positive',
          },
          {
            name: 'Competitor C',
            chatgpt: 3,
            claude: 3,
            mistral: 3,
            gemini: 3,
            global: '45%',
            size: 'md' as 'md',
            sentiment: 'neutral' as 'neutral',
          },
        ],
        battle: {
          competitors: [
            {
              name: 'Competitor A',
              comparisons: [
                {
                  model: 'ChatGPT‑4o',
                  positives: ['more innovative features', 'better UI design'],
                  negatives: ['higher price point', 'steeper learning curve'],
                },
                {
                  model: 'Claude 3',
                  positives: ['better customer support', 'more reliable'],
                  negatives: ['fewer integrations', 'more expensive'],
                },
                {
                  model: 'Mistral Large',
                  positives: ['higher quality', 'more features'],
                  negatives: ['less availability', 'premium pricing'],
                },
                {
                  model: 'Gemini 1.5 Pro',
                  positives: ['more advanced tech', 'better performance'],
                  negatives: ['less intuitive', 'higher cost'],
                },
              ],
            },
            {
              name: 'Competitor B',
              comparisons: [
                {
                  model: 'ChatGPT‑4o',
                  positives: ['more premium quality', 'better support'],
                  negatives: ['higher price', 'fewer options'],
                },
                {
                  model: 'Claude 3',
                  positives: ['more innovative', 'better ecosystem'],
                  negatives: ['less accessibility', 'steeper learning curve'],
                },
                {
                  model: 'Mistral Large',
                  positives: ['better reputation', 'more reliable'],
                  negatives: ['more expensive', 'fewer entry-level options'],
                },
                {
                  model: 'Gemini 1.5 Pro',
                  positives: ['better design', 'higher customer satisfaction'],
                  negatives: ['limited availability in some regions'],
                },
              ],
            },
          ],
          chatgpt: {
            positives: ['more innovative features', 'better UI design', 'premium quality'],
            negatives: ['higher price point', 'steeper learning curve'],
          },
          claude: {
            positives: ['better customer support', 'more innovative', 'better ecosystem'],
            negatives: ['fewer integrations', 'more expensive', 'less accessibility'],
          },
        },
      },
    };

    const resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    const emailHtml = await renderAsync(
      React.createElement(BrandIntelligenceReport, {
        data: data,
      }),
    );
    if (process.env.NODE_ENV === 'development') {
      const email = await resend.emails.send({
        from: 'tailorfeed-ai@tailorfeed.ai',
        to: 'facos86@gmail.com',
        subject: 'Your Brand Intelligence Report',
        react: React.createElement(BrandIntelligenceReport, {
          data: data,
        }),
      });

      console.log('Email sent:', email);
    }
  }

  /**
   * Generate a secure access token for a report
   */
  async generateAccessToken(reportId: string, companyId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiryHours = this.configService.get<number>('REPORT_TOKEN_EXPIRY_HOURS') || 24;
    const expiresAt = addDays(new Date(), expiryHours / 24); // Convert hours to days

    const accessToken = new this.reportAccessTokenModel({
      token,
      reportId,
      companyId,
      expiresAt,
    });

    await accessToken.save();
    this.logger.log(`Generated new access token for report ${reportId}, company ${companyId}`);
    return token;
  }

  /**
   * Validate an access token
   */
  async validateAccessToken(
    token: string,
  ): Promise<{ valid: boolean; reportId?: string; companyId?: string }> {
    const accessToken = await this.reportAccessTokenModel.findOne({ token }).exec();

    if (!accessToken) {
      this.logger.warn(`Access token not found: ${token.substring(0, 8)}...`);
      return { valid: false };
    }

    const now = new Date();
    if (accessToken.expiresAt < now) {
      this.logger.warn(
        `Access token expired: ${token.substring(0, 8)}... (expired at ${accessToken.expiresAt})`,
      );
      return {
        valid: false,
        reportId: accessToken.reportId,
        companyId: accessToken.companyId,
      };
    }

    // Mark token as used
    await this.reportAccessTokenModel.updateOne({ _id: accessToken._id }, { $set: { used: true } });

    this.logger.log(`Access token validated: ${token.substring(0, 8)}...`);
    return {
      valid: true,
      reportId: accessToken.reportId,
      companyId: accessToken.companyId,
    };
  }

  /**
   * Send an email with a secure access link to view a report
   */
  async sendReportAccessEmail(reportId: string, companyId: string, token: string): Promise<void> {
    try {
      this.logger.log(`Sending report access email for report ${reportId}, company ${companyId}`);

      // Use findOne with the 'id' field instead of findById which uses MongoDB's _id
      const report = await this.weeklyReportModel.findOne({ id: reportId }).exec();
      if (!report) {
        this.logger.warn(`Report not found with ID ${reportId} using 'id' field query`);
        throw new NotFoundException(`Report not found with ID ${reportId}`);
      }

      this.logger.log(`Found report with ID ${reportId}, weekStart ${report.weekStart}`);

      // Get company name - in a real implementation, this would get the company name from a service
      const companyName = companyId; // Temporary, replace with actual company name lookup

      // Format report date
      const reportDate = format(report.weekStart, 'MMM dd, yyyy');

      // Construct the access URL based on environment
      const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const accessUrl = `${baseUrl}/report-access?token=${token}`;

      // Create and send the email
      const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
      if (!resendApiKey) {
        this.logger.warn('RESEND_API_KEY not configured, skipping email notification');
        return;
      }

      const resend = new Resend(resendApiKey);
      const senderEmail =
        this.configService.get<string>('SENDER_EMAIL') || 'brand-intelligence@contexteai.com';
      const recipientEmail =
        this.configService.get<string>('RECIPIENT_EMAIL') || 'test@example.com';

      const emailResponse = await resend.emails.send({
        from: 'tailorfeed-ai@tailorfeed.ai',
        to: recipientEmail,
        subject: `Your Brand Intelligence Report for ${companyName} is ready`,
        react: React.createElement(ReportAccessEmail, {
          companyName,
          reportDate,
          accessUrl,
        }),
      });

      if (emailResponse.error) {
        throw new Error(`Failed to send email: ${emailResponse.error.message}`);
      }

      this.logger.log(
        `Report access email sent for report ${reportId}, company ${companyId} with token ${token.substring(0, 8)}...`,
      );
    } catch (error) {
      this.logger.error(`Failed to send report access email: ${error.message}`, error.stack);
      // Don't throw, just log the error to prevent report saving from failing
    }
  }

  /**
   * Get a report by ID
   */
  async getReportById(reportId: string): Promise<WeeklyBrandReportEntity> {
    try {
      this.logger.log(`Looking up report with ID ${reportId} using 'id' field query`);

      // Use findOne with the 'id' field instead of findById which uses MongoDB's _id
      const report = await this.weeklyReportModel.findOne({ id: reportId }).exec();

      if (!report) {
        this.logger.warn(`Report not found with ID ${reportId}`);
        throw new NotFoundException(`Report not found with ID ${reportId}`);
      }

      this.logger.log(`Found report with ID ${reportId}, company ${report.companyId}`);

      return {
        id: report.id,
        companyId: report.companyId,
        weekStart: report.weekStart,
        spontaneous: report.spontaneous,
        sentimentAccuracy: report.sentiment,
        comparison: report.comparison,
        llmVersions: report.llmVersions,
        generatedAt: report.generatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get report by ID: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve report: ${error.message}`);
    }
  }

  async getLatestReport(companyId: string): Promise<WeeklyBrandReportEntity> {
    try {
      // Get the latest report for the company
      const report = await this.weeklyReportModel
        .findOne({ companyId })
        .sort({ weekStart: -1 })
        .exec();

      if (!report) {
        throw new NotFoundException(`No reports found for company ${companyId}`);
      }

      return {
        id: report.id,
        companyId: report.companyId,
        weekStart: report.weekStart,
        spontaneous: report.spontaneous,
        sentimentAccuracy: report.sentiment,
        comparison: report.comparison,
        llmVersions: report.llmVersions,
        generatedAt: report.generatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get latest report: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve report: ${error.message}`);
    }
  }

  async saveReport(report: WeeklyBrandReportEntity): Promise<WeeklyBrandReportEntity> {
    try {
      // Check if a report already exists for this company and week
      const existingReport = await this.weeklyReportModel
        .findOne({
          companyId: report.companyId,
          weekStart: report.weekStart,
        })
        .exec();

      let saved: WeeklyBrandReportDocument;

      if (existingReport) {
        // Update existing report
        const updated = await this.weeklyReportModel
          .findOneAndUpdate(
            { id: existingReport.id },
            {
              $set: {
                spontaneous: report.spontaneous,
                sentiment: report.sentimentAccuracy,
                comparison: report.comparison,
                llmVersions: report.llmVersions,
                generatedAt: report.generatedAt,
              },
            },
            { new: true }, // Return the updated document
          )
          .exec();

        if (!updated) {
          throw new Error(`Failed to update report for company ${report.companyId}`);
        }

        saved = updated;
      } else {
        // Create new report
        const newReport = new this.weeklyReportModel({
          companyId: report.companyId,
          weekStart: report.weekStart,
          spontaneous: report.spontaneous,
          sentiment: report.sentimentAccuracy,
          comparison: report.comparison,
          llmVersions: report.llmVersions,
          generatedAt: report.generatedAt,
        });

        saved = await newReport.save();
      }

      // Generate an access token and send email notification
      const token = await this.generateAccessToken(saved.id, report.companyId);
      await this.sendReportAccessEmail(saved.id, report.companyId, token);

      return {
        id: saved.id,
        companyId: saved.companyId,
        weekStart: saved.weekStart,
        spontaneous: saved.spontaneous,
        sentimentAccuracy: saved.sentiment,
        comparison: saved.comparison,
        llmVersions: saved.llmVersions,
        generatedAt: saved.generatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to save report: ${error.message}`, error.stack);
      throw new Error(`Failed to save report: ${error.message}`);
    }
  }

  /**
   * Get all reports for a company
   */
  async getAllCompanyReports(companyId: string) {
    try {
      // Get all reports for the company, sorted by week start date (newest first)
      const reports = await this.weeklyReportModel
        .find({ companyId })
        .sort({ weekStart: -1 })
        .exec();

      return {
        reports: reports.map((report) => ({
          id: report.id,
          weekStart: report.weekStart,
          generatedAt: report.generatedAt,
        })),
        total: reports.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get reports for company ${companyId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to retrieve reports: ${error.message}`);
    }
  }

  /**
   * Send a report access email to a specific address
   */
  async sendReportEmailToAddress(
    reportId: string,
    companyId: string,
    emailAddress: string,
    customSubject?: string,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Attempting to send report email for report ID ${reportId}, company ${companyId} to ${emailAddress}`,
      );

      // Validate that the report exists and belongs to the company
      // Use findOne with the 'id' field instead of findById which uses MongoDB's _id
      const report = await this.weeklyReportModel.findOne({ id: reportId }).exec();

      if (!report) {
        this.logger.warn(`Report not found with ID ${reportId} using 'id' field query`);
        throw new NotFoundException(`Report not found with ID ${reportId}`);
      }

      this.logger.log(`Found report ${reportId} with company ID ${report.companyId}`);

      if (report.companyId !== companyId) {
        this.logger.warn(
          `Report ${reportId} has company ID ${report.companyId}, not matching requested company ID ${companyId}`,
        );
        throw new BadRequestException('Report does not belong to the specified company');
      }

      // Generate a new token for this report
      const token = await this.generateAccessToken(reportId, companyId);

      // Get company name (in a real implementation, this might come from a service)
      const companyName = companyId; // Temporary placeholder

      // Format the report date
      const reportDate = format(report.weekStart, 'MMM dd, yyyy');

      // Construct the access URL
      const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const accessUrl = `${baseUrl}/report-access?token=${token}`;

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
      const subject = customSubject || `Your Brand Intelligence Report for ${companyName}`;

      const emailResponse = await resend.emails.send({
        from: 'tailorfeed-ai@tailorfeed.ai',
        to: emailAddress,
        subject: subject,
        react: React.createElement(ReportAccessEmail, {
          companyName,
          reportDate,
          accessUrl,
        }),
      });

      if (emailResponse.error) {
        throw new Error(`Failed to send email: ${emailResponse.error.message}`);
      }

      this.logger.log(
        `Report access email sent to ${emailAddress} for report ${reportId}, company ${companyId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send report email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get the identity card for a company
   */
  async getCompanyIdentityCard(companyId: string) {
    try {
      const identityCardModel = mongoose.model('IdentityCard');
      const identityCard = await identityCardModel.findOne({ id: companyId }).exec();
      return identityCard;
    } catch (error) {
      this.logger.warn(`Failed to get identity card for company ${companyId}: ${error.message}`);
      return null; // Return null instead of throwing, as this is not critical
    }
  }

  /**
   * Get the application configuration
   */
  async getConfig() {
    try {
      // Load and parse config.json file - in a real implementation, you would get this from a ConfigService
      const fs = require('fs');
      const path = require('path');
      const configPath = path.resolve(process.cwd(), 'config.json');
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      this.logger.warn(`Failed to get config: ${error.message}`, error.stack);
      // Return default config if file can't be read
      return {
        llmModels: [
          { provider: 'OpenAI', model: 'GPT-4o' },
          { provider: 'Anthropic', model: 'Claude 3 Sonnet' },
          { provider: 'Mistral', model: 'Large' },
          { provider: 'Gemini', model: '1.5 Pro' },
        ],
      };
    }
  }

  /**
   * Format pulse model visibility data
   */
  formatPulseModelVisibility(
    spontaneousData: any,
    llmVersions: any,
  ): Array<{
    model: string;
    value: number;
    isAverage?: boolean;
  }> {
    if (!spontaneousData?.results) {
      return [];
    }

    // Get unique LLM providers from the results
    const llmProviders = [
      ...new Set(spontaneousData.results.map((r: any) => r.llmProvider)),
    ] as string[];

    // Calculate visibility percentage for each model
    const modelVisibility = llmProviders.map((provider) => {
      const modelResults = spontaneousData.results.filter((r: any) => r.llmProvider === provider);
      const totalPrompts = modelResults.length || 1;
      const mentionedCount = modelResults.filter((r: any) => r.mentioned === true).length;
      const mentionRate = Math.round((mentionedCount / totalPrompts) * 100);

      return {
        model: provider,
        value: mentionRate,
        isAverage: false,
      };
    });

    // Add global average
    const globalAverage = {
      model: 'Global Avg',
      value: spontaneousData?.summary?.mentionRate || 0,
      isAverage: true,
    };

    return [...modelVisibility, globalAverage];
  }

  /**
   * Format tone data
   */
  formatToneData(sentimentData: any): {
    sentiments: Array<{
      model: string;
      sentiment: string;
      status: string;
      positives: string;
      negatives: string;
      isAverage?: boolean;
    }>;
    questions: Array<{
      question: string;
      results: Array<{
        model: string;
        sentiment: string;
        status: string;
        keywords: string;
      }>;
    }>;
  } {
    if (!sentimentData?.results) {
      return {
        sentiments: [],
        questions: [],
      };
    }

    // Get unique LLM providers from the results
    const llmProviders = [
      ...new Set(sentimentData.results.map((r: any) => r.llmProvider)),
    ] as string[];

    // Create sentiments for each model
    const sentiments = llmProviders.map((provider) => {
      const modelResults = sentimentData.results.filter((r: any) => r.llmProvider === provider);
      const sentimentValue =
        modelResults.reduce((sum: number, result: any) => {
          return (
            sum +
            (result.sentiment === 'positive' ? 0.5 : result.sentiment === 'negative' ? -0.5 : 0)
          );
        }, 0) / (modelResults.length || 1);

      // Format to +/- number with 2 decimal places
      const formattedSentiment =
        sentimentValue > 0 ? `+${sentimentValue.toFixed(2)}` : sentimentValue.toFixed(2);

      // Get status based on sentiment
      const status = sentimentValue > 0.3 ? 'green' : sentimentValue < -0.3 ? 'red' : 'yellow';

      // Extract facts as positives/negatives
      const facts = modelResults.flatMap((r: any) => r.extractedFacts || []);
      const positives = facts
        .filter((f: string) => !f.toLowerCase().includes('negative'))
        .join(', ');
      const negatives = facts
        .filter((f: string) => f.toLowerCase().includes('negative'))
        .join(', ');

      return {
        model: provider,
        sentiment: formattedSentiment,
        status,
        positives: positives || 'quality, innovation',
        negatives: negatives || 'pricing',
        isAverage: false,
      };
    });

    // Add global average
    const avgSentiment =
      sentiments.reduce((sum, s) => sum + parseFloat(s.sentiment), 0) / (sentiments.length || 1);
    const formattedAvgSentiment =
      avgSentiment > 0 ? `+${avgSentiment.toFixed(2)}` : avgSentiment.toFixed(2);

    sentiments.push({
      model: 'Global Avg',
      sentiment: formattedAvgSentiment,
      status: avgSentiment > 0.3 ? 'green' : avgSentiment < -0.3 ? 'red' : 'yellow',
      positives: '—',
      negatives: '—',
      isAverage: true,
    });

    // Create questions from the sentiment data
    const questions = [
      {
        question: 'What do you think of the brand?',
        results: sentiments
          .filter((s) => s.isAverage !== true)
          .map((s) => ({
            model: s.model,
            sentiment: s.sentiment,
            status: s.status,
            keywords: s.positives,
          })),
      },
      {
        question: 'Key pros/cons of the brand?',
        results: sentiments
          .filter((s) => s.isAverage !== true)
          .map((s) => ({
            model: s.model,
            sentiment: s.sentiment,
            status: s.status,
            keywords: `${s.positives} vs ${s.negatives}`,
          })),
      },
    ];

    return {
      sentiments,
      questions,
    };
  }

  /**
   * Format arena data
   */
  formatArenaData(
    comparisonData: any,
    competitors: string[] = [],
  ): {
    competitors: Array<{
      name: string;
      chatgpt: number;
      claude: number;
      mistral: number;
      gemini: number;
      global: string;
      size: string;
      sentiment: string;
    }>;
    battle: {
      competitors: Array<{
        name: string;
        comparisons: Array<{
          model: string;
          positives: string[];
          negatives: string[];
        }>;
      }>;
      chatgpt?: {
        positives: string[];
        negatives: string[];
      };
      claude?: {
        positives: string[];
        negatives: string[];
      };
    };
  } {
    if (!comparisonData?.results) {
      return {
        competitors: [],
        battle: { competitors: [] },
      };
    }

    // Get competitors from comparison data or use provided competitors
    const competitorNames =
      comparisonData.results && comparisonData.results.length > 0
        ? ([...new Set(comparisonData.results.map((r: any) => r.winner))] as string[])
        : (competitors || []).slice(0, 3);

    if (!competitorNames || competitorNames.length === 0) {
      return {
        competitors: [],
        battle: { competitors: [] },
      };
    }

    // Get unique LLM providers from the results
    const llmProviders =
      comparisonData.results && comparisonData.results.length > 0
        ? ([...new Set(comparisonData.results.map((r: any) => r.llmProvider))] as string[])
        : ['OpenAI', 'Anthropic', 'Mistral', 'Gemini'];

    // Create competitors for arena section
    const formattedCompetitors = competitorNames.map((name, index) => {
      const modelWins = {
        chatgpt: comparisonData.results
          ? comparisonData.results.filter(
              (r: any) => r.winner === name && r.llmProvider.toLowerCase().includes('gpt'),
            ).length
          : index === 0
            ? 2
            : 1,
        claude: comparisonData.results
          ? comparisonData.results.filter(
              (r: any) => r.winner === name && r.llmProvider.toLowerCase().includes('claude'),
            ).length
          : index === 0
            ? 1
            : 2,
        mistral: comparisonData.results
          ? comparisonData.results.filter(
              (r: any) => r.winner === name && r.llmProvider.toLowerCase().includes('mistral'),
            ).length
          : index === 0
            ? 2
            : 1,
        gemini: comparisonData.results
          ? comparisonData.results.filter(
              (r: any) => r.winner === name && r.llmProvider.toLowerCase().includes('gemini'),
            ).length
          : index === 0
            ? 1
            : 2,
      };

      // Calculate global percentage
      const totalWins = Object.values(modelWins).reduce((sum, val) => sum + val, 0);
      const totalPossible = Object.keys(modelWins).length || 1;
      const globalPercentage = Math.round((totalWins / totalPossible) * 100);

      return {
        name,
        chatgpt: modelWins.chatgpt || 0,
        claude: modelWins.claude || 0,
        mistral: modelWins.mistral || 0,
        gemini: modelWins.gemini || 0,
        global: `${globalPercentage}%`,
        size: index < 2 ? 'lg' : 'md',
        sentiment:
          globalPercentage > 50 ? 'positive' : globalPercentage > 30 ? 'neutral' : 'negative',
      };
    });

    // Create battle data
    const battleCompetitors = competitorNames.slice(0, 2).map((name) => {
      // Create comparisons by model
      const comparisons = llmProviders.map((provider) => {
        // Get differentiators for this competitor from this model
        const modelDiffs = comparisonData.results
          ? comparisonData.results
              .filter((r: any) => r.winner === name && r.llmProvider === provider)
              .flatMap((r: any) => r.differentiators || [])
          : [];

        // Split into positives and negatives
        const positives =
          modelDiffs.length > 0
            ? modelDiffs
                .filter(
                  (d: string) =>
                    !d.toLowerCase().includes('however') && !d.toLowerCase().includes('but'),
                )
                .slice(0, 2)
            : ['quality product', 'good service'];

        const negatives =
          modelDiffs.length > 0
            ? modelDiffs
                .filter(
                  (d: string) =>
                    d.toLowerCase().includes('however') || d.toLowerCase().includes('but'),
                )
                .slice(0, 2)
            : ['price point', 'limited options'];

        return {
          model: provider,
          positives,
          negatives,
        };
      });

      return {
        name,
        comparisons: comparisons.filter((c) => c.model), // Filter out empty models
      };
    });

    return {
      competitors: formattedCompetitors,
      battle: {
        competitors: battleCompetitors,
        chatgpt: {
          positives: ['innovative features', 'quality design'],
          negatives: ['price point', 'learning curve'],
        },
        claude: {
          positives: ['customer support', 'reliability'],
          negatives: ['fewer integrations', 'less accessible'],
        },
      },
    };
  }
}
