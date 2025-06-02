import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { renderAsync } from '@react-email/render';
import React from 'react';
import { BrandIntelligenceReport } from '../email';
import { ProjectService } from '../../project/services/project.service';
import { BatchExecutionRepository } from '../../batch/repositories/batch-execution.repository';
import { BatchResultRepository } from '../../batch/repositories/batch-result.repository';
import { PipelineType } from '../../batch/interfaces/llm.interfaces';

/**
 * Service responsible for integrating with external services and data
 */
@Injectable()
export class ReportIntegrationService {
  private readonly logger = new Logger(ReportIntegrationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly projectService: ProjectService,
    private readonly batchExecutionRepository: BatchExecutionRepository,
    private readonly batchResultRepository: BatchResultRepository,
  ) {}

  /**
   * Get the project by ID, with proper type safety
   * Uses properly injected ProjectService instead of direct mongoose access
   *
   * @param projectId The ID of the project to get
   * @returns The project entity or null if not found
   */
  async getCompanyProject(projectId: string) {
    try {
      // Call the properly injected service instead of using mongoose directly
      const project = await this.projectService.findById(projectId);
      return project;
    } catch (error) {
      // The findById method throws NotFoundException if not found, so we catch and return null
      this.logger.debug(`Project not found with ID ${projectId}: ${error.message}`);
      return null; // Return null instead of throwing, as this is not critical
    }
  }

  /**
   * Get the application configuration
   * Uses ConfigService instead of directly reading the file
   *
   * @returns The application configuration
   */
  async getConfig() {
    try {
      // Use configService to get the LLM models configuration
      const llmModels = this.configService.get<any[]>('llmModels');

      if (llmModels && Array.isArray(llmModels)) {
        return { llmModels };
      }

      // If not available in ConfigService, try to read from file
      // This is a fallback mechanism and should be replaced with proper config
      try {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.resolve(process.cwd(), 'config.json');
        const configContent = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configContent);
      } catch (fileError) {
        this.logger.warn(`Failed to read config file: ${fileError.message}`);
      }

      // Return default config as last resort
      return {
        llmModels: [
          { provider: 'OpenAI', model: 'GPT-4o' },
          { provider: 'Anthropic', model: 'Claude 3 Sonnet' },
          { provider: 'Mistral', model: 'Large' },
          { provider: 'Gemini', model: '1.5 Pro' },
        ],
      };
    } catch (error) {
      this.logger.warn(`Failed to get config: ${error.message}`, error.stack);
      // Return default config if an error occurs
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
   * Get a batch execution by ID
   * @param batchExecutionId The ID of the batch execution to get
   * @returns The batch execution or null if not found
   */
  async getBatchExecution(batchExecutionId: string) {
    this.logger.debug(`Getting batch execution with ID ${batchExecutionId}`);
    const batchExecution = await this.batchExecutionRepository.findById(batchExecutionId);

    if (!batchExecution) {
      this.logger.warn(`Batch execution with ID ${batchExecutionId} not found`);
      return null;
    }

    return batchExecution;
  }

  /**
   * Get a batch result by type
   * @param batchExecutionId The ID of the batch execution
   * @param resultType The type of result to get (spontaneous, sentiment, accuracy, comparison)
   * @returns The batch result or null if not found
   */
  async getBatchResultByType(batchExecutionId: string, resultType: PipelineType) {
    this.logger.debug(`Getting ${resultType} result for batch execution ${batchExecutionId}`);

    const batchResult = await this.batchResultRepository.findByExecutionIdAndType(batchExecutionId, resultType);

    if (!batchResult) {
      this.logger.warn(`No ${resultType} result found for batch execution ${batchExecutionId}`);
      return null;
    }

    return batchResult.result;
  }

  async testEmailRendering() {
    // Example data structure for testing email rendering
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

    // Only render and send test email in development mode
    if (process.env.NODE_ENV === 'development') {
      const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        try {
          /*   const emailHtml = await renderAsync(
            React.createElement(BrandIntelligenceReport, {
              data: data,
            }),
          );

          // Send a test email if API key is configured
          const testRecipient = this.configService.get<string>('TEST_EMAIL_RECIPIENT');
          if (testRecipient) {
            const email = await resend.emails.send({
              from: 'tailorfeed-ai@tailorfeed.ai',
              to: testRecipient,
              subject: 'Your Brand Intelligence Report',
              react: React.createElement(BrandIntelligenceReport, {
                data: data,
              }),
            });
            this.logger.log('Test email sent:', email);
            return { success: true, email };
          } */
          return { success: true, html: 'emailHtml' };
        } catch (error) {
          this.logger.warn('Failed to render or send test email:', error.message);
          return { success: false, error: error.message };
        }
      }
    }
    return { success: false, message: 'Not in development mode or no API key configured' };
  }
}
