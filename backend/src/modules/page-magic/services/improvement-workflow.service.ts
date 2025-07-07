import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PageImprovementJob, PageImprovementJobDocument } from '../schemas/page-improvement-job.schema';
import { PageImprovementService } from './page-improvement.service';
import { SequentialImprovementService } from './sequential-improvement.service';
import { AEOScoringService } from '../../crawler/services/aeo-scoring.service';
import { AEOContentAnalyzerService } from '../../crawler/services/aeo-content-analyzer.service';
import { PageMagicEventsGateway } from '../gateways/page-magic-events.gateway';
import { StructuredContentService, StructuredContent } from './structured-content.service';
import { HtmlToMarkdownService } from './html-to-markdown.service';
import { ContentScoreRepository } from '../../crawler/repositories/content-score.repository';

export interface WorkflowProgress {
  jobId: string;
  iteration: number;
  maxIterations: number;
  progress: number;
  status: string;
  currentScore?: number;
  previousScore?: number;
}

@Injectable()
export class ImprovementWorkflowService {
  private readonly logger = new Logger(ImprovementWorkflowService.name);

  constructor(
    @InjectModel(PageImprovementJob.name)
    private readonly jobModel: Model<PageImprovementJobDocument>,
    private readonly improvementService: PageImprovementService,
    private readonly sequentialImprovementService: SequentialImprovementService,
    private readonly scoringService: AEOScoringService,
    private readonly contentAnalyzer: AEOContentAnalyzerService,
    private readonly eventsGateway: PageMagicEventsGateway,
    private readonly structuredContentService: StructuredContentService,
    private readonly htmlToMarkdownService: HtmlToMarkdownService,
    private readonly contentScoreRepository: ContentScoreRepository,
  ) {}

  /**
   * Create a new improvement job
   */
  async createJob(
    projectId: string,
    pageUrl: string,
    originalContent: string,
    userId?: string,
    contentScoreId?: string,
    structuredContent?: StructuredContent,
  ): Promise<PageImprovementJobDocument> {
    try {
      this.logger.log(`Creating improvement job for URL: ${pageUrl}`);
      this.logger.log(`Project ID: ${projectId}, User ID: ${userId || 'none'}`);
      this.logger.log(`Original content length: ${originalContent.length} characters`);

      // Use the provided structured content if available, otherwise create a basic one
      const structured = structuredContent || {
        title: 'Page Content',
        content: originalContent,
        textContent: originalContent,
        length: originalContent.length,
      };
      
      this.logger.log(`Using content - Title: "${structured.title}"`);
      this.logger.log(`Using content - Meta description: "${structured.metaDescription || 'none'}"`);
      this.logger.log(`Using content - Text length: ${structured.textContent.length} characters`);
      
      // Convert HTML content to Markdown once for consistent processing
      const contentMarkdown = this.htmlToMarkdownService.convertHtmlToMarkdown(originalContent);
      this.logger.log(`Converted HTML to Markdown: ${contentMarkdown.length} characters`);
      
      const job = new this.jobModel({
        projectId,
        pageUrl,
        originalContent: originalContent, // Keep HTML for backward compatibility
        originalContentMarkdown: contentMarkdown, // Store Markdown version
        originalTitle: structured.title,
        originalMetaDescription: structured.metaDescription,
        userId,
        contentScoreId,
        status: 'pending',
        currentIteration: 0,
        maxIterations: 1, // Limit to 1 iteration for now
      });

      await job.save();
      this.logger.log(`Successfully created improvement job ${job._id} for page: ${pageUrl}`);
      
      // Emit job created event
      this.eventsGateway.emitJobCreated(
        job._id.toString(),
        projectId,
        pageUrl,
        job.maxIterations,
      );
      
      return job;
    } catch (error) {
      this.logger.error(`Error creating job: ${error.message}`);
      throw new Error(`Failed to create improvement job: ${error.message}`);
    }
  }

  /**
   * Process the improvement job using sequential rule-by-rule approach
   */
  async processImprovementJob(jobId: string): Promise<PageImprovementJobDocument> {
    // Use the new sequential processing approach
    return this.sequentialImprovementService.processRulesSequentially(jobId);
  }

  /**
   * Legacy: Process the improvement job through multiple iterations (kept for backward compatibility)
   */
  async processImprovementJobLegacy(jobId: string): Promise<PageImprovementJobDocument> {
    try {
      const job = await this.jobModel.findById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      this.logger.log(`Starting improvement process for job ${jobId}`);
      
      // Mark job as processing
      job.status = 'processing';
      await job.save();

      let currentContent = job.originalContent;
      this.logger.log(`Computing initial score for content with ${currentContent.length} characters`);
      let currentScore = await this.computeContentScore(job.pageUrl, currentContent, job.projectId);

      this.logger.log(`Initial score for ${job.pageUrl}: ${currentScore}`);

      // Run up to maxIterations improvement cycles
      for (let iteration = 1; iteration <= job.maxIterations; iteration++) {
        try {
          this.logger.log(`Starting iteration ${iteration}/${job.maxIterations} for job ${jobId}`);
          
          // Update current iteration
          job.currentIteration = iteration;
          await job.save();
          
          // Emit iteration started event
          this.eventsGateway.emitIterationStarted(
            jobId,
            job.projectId,
            job.pageUrl,
            iteration,
            job.maxIterations,
          );

          // Get current issues and recommendations
          let issues: string[] = [];
          let recommendations: string[] = [];

          // If we have a content score ID, use the existing analysis from the database
          if (job.contentScoreId && iteration === 1) {
            this.logger.log(`Using existing content score from database: ${job.contentScoreId}`);
            const contentScore = await this.contentScoreRepository.findById(job.contentScoreId);
            
            if (contentScore) {
              // Format issues with their recommendations in a more concise way
              const issuesWithRecommendations: string[] = [];
              const seenRecommendations = new Set<string>();
              
              // Extract issues with their specific recommendations
              contentScore.issues.forEach(issue => {
                if (issue.recommendation) {
                  issuesWithRecommendations.push(`${issue.description} - Recommendation: ${issue.recommendation}`);
                  seenRecommendations.add(issue.recommendation);
                } else {
                  issuesWithRecommendations.push(issue.description);
                }
              });
              
              issues = issuesWithRecommendations;
              
              // Extract additional recommendations, avoiding duplicates
              const additionalRecommendations = contentScore.recommendations?.filter(rec => {
                const recText = typeof rec === 'string' ? rec : rec.content;
                return !seenRecommendations.has(recText);
              }).map(rec => typeof rec === 'string' ? rec : rec.content) || [];
              
              recommendations = additionalRecommendations;
              
              this.logger.log(`Retrieved from database - Found ${contentScore.issues.length} issues and ${contentScore.recommendations?.length || 0} total recommendations`);
              this.logger.log(`Formatted as ${issues.length} issues with recommendations and ${recommendations.length} additional recommendations`);
            } else {
              this.logger.warn(`Content score ${job.contentScoreId} not found, falling back to fresh analysis`);
              const analysisResult = await this.analyzeContent(job.pageUrl, currentContent, job.projectId);
              issues = analysisResult.issues || [];
              recommendations = analysisResult.recommendations || [];
            }
          } else {
            // For subsequent iterations or if no content score ID, run fresh analysis
            this.logger.log(`Analyzing content for iteration ${iteration}...`);
            const analysisResult = await this.analyzeContent(job.pageUrl, currentContent, job.projectId);
            issues = analysisResult.issues || [];
            recommendations = analysisResult.recommendations || [];
          }

          this.logger.log(`Analysis complete - Found ${issues.length} issues and ${recommendations.length} recommendations`);
          this.logger.log(`Issues: ${JSON.stringify(issues)}`);
          this.logger.log(`Recommendations: ${JSON.stringify(recommendations)}`);

          // Check if we should continue (stop if score is already very high)
          if (currentScore >= 85) {
            this.logger.log(`Stopping early - score already high: ${currentScore}`);
            break;
          }
          
          // If we have no real issues from AEO but score is not perfect, continue
          if (issues.length === 0 && currentScore < 85) {
            this.logger.log(`No specific issues found but score is ${currentScore}, continuing with general improvements`);
          }

          // Improve content using AI
          this.logger.log(`Starting AI content improvement for iteration ${iteration}...`);
          this.logger.log(`Input content length: ${currentContent.length} characters`);
          this.logger.log(`Original title: "${job.originalTitle}"`);
          this.logger.log(`Original meta description: "${job.originalMetaDescription || 'none'}"`);
          
          const improvement = await this.improvementService.improvePageContent(
            currentContent,
            issues,
            recommendations,
            iteration,
            job.originalTitle,
            job.originalMetaDescription,
          );
          
          this.logger.log(`AI improvement complete for iteration ${iteration}`);
          this.logger.log(`Improvement result: ${JSON.stringify(improvement)}`);
          this.logger.log(`Improved content length: ${improvement.improvedContent.length} characters`);
          this.logger.log(`Improved title: "${improvement.improvedTitle || 'unchanged'}"`);
          this.logger.log(`Improved meta description: "${improvement.improvedMetaDescription || 'unchanged'}"`);
          this.logger.log(`Changes made: ${JSON.stringify(improvement.changes)}`);
          this.logger.log(`Model used: ${improvement.model}`);
          this.logger.log(`Tokens used: ${JSON.stringify(improvement.tokensUsed)}`);
          
          // Verify we have content
          if (!improvement.improvedContent || improvement.improvedContent.length === 0) {
            this.logger.error('No improved content received from AI!');
            throw new Error('AI improvement returned empty content');
          }
          
          // Emit improvement generated event
          this.eventsGateway.emitImprovementGenerated(
            jobId,
            job.projectId,
            job.pageUrl,
            iteration,
            issues.length,
          );

          // Compute new score for improved content
          this.logger.log(`Computing score for improved content...`);
          const newScore = await this.computeContentScore(job.pageUrl, improvement.improvedContent, job.projectId);
          this.logger.log(`Score computed: ${currentScore} → ${newScore} (${newScore > currentScore ? '+' : ''}${newScore - currentScore})`);

          // Save iteration result
          this.logger.log(`Saving iteration ${iteration} results to database...`);
          
          const improvementData = {
            iteration,
            improvedContent: improvement.improvedContent,
            improvedTitle: improvement.improvedTitle,
            improvedMetaDescription: improvement.improvedMetaDescription,
            scoreBefore: currentScore,
            scoreAfter: newScore,
            issues: issues,
            recommendations: recommendations,
            timestamp: new Date(),
          };
          
          this.logger.log(`Improvement data to save: ${JSON.stringify({
            iteration: improvementData.iteration,
            contentLength: improvementData.improvedContent.length,
            hasTitle: !!improvementData.improvedTitle,
            hasMetaDesc: !!improvementData.improvedMetaDescription,
            scoreBefore: improvementData.scoreBefore,
            scoreAfter: improvementData.scoreAfter,
            issuesCount: improvementData.issues.length,
            recommendationsCount: improvementData.recommendations.length,
          })}`);
          
          job.improvements.push(improvementData);
          this.logger.log(`Job now has ${job.improvements.length} improvements`);

          await job.save();
          this.logger.log(`Iteration ${iteration} results saved successfully`);
          
          // Verify the save worked
          const savedJob = await this.jobModel.findById(job._id);
          if (savedJob) {
            this.logger.log(`Verified saved job has ${savedJob.improvements.length} improvements`);
          }

          this.logger.log(
            `Iteration ${iteration} completed - Score: ${currentScore} → ${newScore} (${newScore > currentScore ? '+' : ''}${newScore - currentScore})`
          );
          
          // Emit score calculated event
          this.eventsGateway.emitScoreCalculated(
            jobId,
            job.projectId,
            job.pageUrl,
            iteration,
            currentScore,
            newScore,
          );
          
          // Emit iteration completed event
          this.eventsGateway.emitIterationCompleted(
            jobId,
            job.projectId,
            job.pageUrl,
            iteration,
            job.maxIterations,
            newScore,
          );

          // Update current content and score for next iteration
          currentContent = improvement.improvedContent;
          
          // Stop if no improvement or score decreased significantly
          if (newScore <= currentScore - 5) {
            this.logger.log(`Stopping - score decreased: ${currentScore} → ${newScore}`);
            break;
          }

          currentScore = newScore;

          // Stop if we reached a very good score
          if (newScore >= 85) {
            this.logger.log(`Stopping - excellent score achieved: ${newScore}`);
            break;
          }

        } catch (iterationError) {
          this.logger.error(`Error in iteration ${iteration}: ${iterationError.message}`);
          job.errors.push({
            message: `Iteration ${iteration}: ${iterationError.message}`,
            timestamp: new Date(),
          });
          await job.save();
          
          // Continue to next iteration unless it's a critical error
          if (iterationError.message.includes('CLAUDE_4_UNAVAILABLE')) {
            throw iterationError; // Critical error, stop the job
          }
        }
      }

      // Mark job as completed
      job.status = 'completed';
      job.completedAt = new Date();
      await job.save();

      this.logger.log(`Improvement job ${jobId} completed with ${job.improvements.length} iterations`);
      
      // Verify the final save
      const completedJob = await this.jobModel.findById(jobId);
      this.logger.log(`Final verification - Job ${jobId} status: ${completedJob?.status}, improvements: ${completedJob?.improvements.length}`);
      
      // Emit job completed event
      const firstImprovement = job.improvements[0];
      const lastImprovement = job.improvements[job.improvements.length - 1];
      if (firstImprovement && lastImprovement) {
        this.eventsGateway.emitJobCompleted(
          jobId,
          job.projectId,
          job.pageUrl,
          job.improvements.length,
          lastImprovement.scoreAfter,
          firstImprovement.scoreBefore,
        );
      }
      
      return job;
    } catch (error) {
      this.logger.error(`Error processing job ${jobId}: ${error.message}`);
      
      // Mark job as failed
      const job = await this.jobModel.findById(jobId);
      if (job) {
        job.status = 'failed';
        job.failedAt = new Date();
        job.errors.push(error.message);
        await job.save();
        
        // Emit job failed event
        this.eventsGateway.emitJobFailed(
          jobId,
          job.projectId,
          job.pageUrl,
          error.message,
        );
      }
      
      throw error;
    }
  }

  /**
   * Get job status and progress
   */
  async getJobStatus(jobId: string): Promise<WorkflowProgress | null> {
    try {
      const job: PageImprovementJobDocument | null = await this.jobModel.findById(jobId);
      if (!job) {
        return null;
      }

      const progress = (job.currentIteration / job.maxIterations) * 100;
      const lastIteration = job.improvements[job.improvements.length - 1];

      return {
        jobId: job._id.toString(),
        iteration: job.currentIteration,
        maxIterations: job.maxIterations,
        progress: Math.min(100, progress),
        status: job.status,
        currentScore: lastIteration?.scoreAfter,
        previousScore: lastIteration?.scoreBefore,
      };
    } catch (error) {
      this.logger.error(`Error getting job status: ${error.message}`);
      return null;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<PageImprovementJobDocument | null> {
    try {
      this.logger.log(`Fetching job ${jobId} from MongoDB...`);
      
      // First, let's see what's actually in the database
      const rawJob = await this.jobModel.findById(jobId).lean().exec();
      if (rawJob) {
        this.logger.log(`Raw MongoDB document (lean): ${JSON.stringify({
          _id: rawJob._id,
          status: rawJob.status,
          improvementsCount: rawJob.improvements?.length || 0,
          improvementsData: rawJob.improvements?.map((imp: any) => ({
            iteration: imp.iteration,
            hasContent: !!imp.improvedContent,
            contentLength: imp.improvedContent?.length || 0,
          }))
        })}`);
      }
      
      // Now get the regular Mongoose document
      const job = await this.jobModel.findById(jobId).exec();
      
      if (job) {
        this.logger.log(`Retrieved job ${jobId}: status=${job.status}, improvements=${job.improvements.length}`);
        
        // Log the raw MongoDB document
        this.logger.log(`Raw job document: ${JSON.stringify({
          _id: job._id,
          status: job.status,
          currentIteration: job.currentIteration,
          improvementsCount: job.improvements.length,
          improvements: job.improvements.map(imp => ({
            iteration: imp.iteration,
            scoreBefore: imp.scoreBefore,
            scoreAfter: imp.scoreAfter,
            hasContent: !!imp.improvedContent,
            contentLength: imp.improvedContent?.length || 0,
          }))
        })}`);
        
        if (job.improvements.length > 0) {
          this.logger.log(`First improvement details: ${JSON.stringify({
            iteration: job.improvements[0].iteration,
            scoreBefore: job.improvements[0].scoreBefore,
            scoreAfter: job.improvements[0].scoreAfter,
            contentLength: job.improvements[0].improvedContent?.length || 0,
            hasTitle: !!job.improvements[0].improvedTitle,
            issuesCount: job.improvements[0].issues?.length || 0,
            recommendationsCount: job.improvements[0].recommendations?.length || 0,
          })}`);
        }
      } else {
        this.logger.warn(`Job ${jobId} not found in database`);
      }
      
      return job;
    } catch (error) {
      this.logger.error(`Error getting job: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Get jobs by project ID
   */
  async getJobsByProject(projectId: string): Promise<PageImprovementJobDocument[]> {
    try {
      return await this.jobModel
        .find({ projectId })
        .sort({ createdAt: -1 })
        .limit(50);
    } catch (error) {
      this.logger.error(`Error getting jobs by project: ${error.message}`);
      return [];
    }
  }

  /**
   * Update job with error
   */
  async updateJobError(jobId: string, errorMessage: string): Promise<void> {
    try {
      const job = await this.jobModel.findById(jobId);
      if (!job) {
        this.logger.warn(`Job ${jobId} not found for error update`);
        return;
      }

      job.status = 'failed';
      job.errors.push({
        message: errorMessage,
        timestamp: new Date(),
      });
      job.failedAt = new Date();
      await job.save();

      // Emit job failed event
      this.eventsGateway.emitJobFailed(
        jobId,
        job.projectId,
        job.pageUrl,
        errorMessage
      );

      this.logger.log(`Updated job ${jobId} with error: ${errorMessage}`);
    } catch (error) {
      this.logger.error(`Error updating job error: ${error.message}`);
    }
  }

  /**
   * Compute content score using the existing scoring system
   */
  private async computeContentScore(pageUrl: string, content: string, projectId: string): Promise<number> {
    try {
      this.logger.log(`Computing AEO score for ${pageUrl}`);
      
      // Create a mock crawled page structure for scoring
      const mockCrawledPage = {
        url: pageUrl,
        html: `<html><body>${content}</body></html>`, // Wrap in basic HTML
        text: content,
        title: 'Page Magic Content', // This will be extracted from actual content
        metadata: {
          title: 'Page Magic Content',
          description: '',
        },
        contentLength: content.length,
        crawledAt: new Date(),
      };

      // Create a mock project object
      const mockProject = {
        id: projectId,
        _id: projectId,
      };

      // Use the real AEO content analyzer to analyze the content
      const analysisResult = await this.contentAnalyzer.analyzePage(mockCrawledPage, mockProject);
      
      if (analysisResult && analysisResult.globalScore !== undefined) {
        this.logger.log(`Computed AEO score: ${analysisResult.globalScore}`);
        return analysisResult.globalScore;
      }
      
      // Fallback if analysis fails
      this.logger.warn('AEO analysis returned no score, using fallback');
      return 65; // Default mid-range score
    } catch (error) {
      this.logger.error(`Error computing AEO score: ${error.message}`, error.stack);
      return 65; // Default score if computation fails
    }
  }

  /**
   * Analyze content to get issues and recommendations
   */
  private async analyzeContent(pageUrl: string, content: string, projectId: string): Promise<{
    issues: string[];
    recommendations: string[];
  }> {
    try {
      this.logger.log(`Analyzing content for issues and recommendations`);
      
      // Create a mock crawled page structure for analysis
      const mockCrawledPage = {
        url: pageUrl,
        html: `<html><body>${content}</body></html>`,
        text: content,
        title: 'Page Magic Content',
        metadata: {
          title: 'Page Magic Content',
          description: '',
        },
        contentLength: content.length,
        crawledAt: new Date(),
      };

      // Create a mock project object
      const mockProject = {
        id: projectId,
        _id: projectId,
      };

      // Use the real AEO content analyzer
      const analysisResult = await this.contentAnalyzer.analyzePage(mockCrawledPage, mockProject);
      
      const issues: string[] = [];
      const recommendations: string[] = [];
      
      if (analysisResult && analysisResult.issues) {
        // Extract issues from the AEO analysis
        analysisResult.issues.forEach(issue => {
          issues.push(issue.description);
          
          // Add recommendations based on dimension
          if (issue.dimension === 'content') {
            recommendations.push('Improve content quality and relevance for better AI understanding');
          } else if (issue.dimension === 'technical') {
            recommendations.push('Optimize technical SEO elements for improved crawlability');
          } else if (issue.dimension === 'authority') {
            recommendations.push('Enhance content authority signals and credibility markers');
          }
        });
      }
      
      // Extract recommendations from successful rules
      if (analysisResult && analysisResult.recommendations) {
        analysisResult.recommendations.forEach(rec => {
          if (typeof rec === 'string') {
            recommendations.push(rec);
          } else if (rec.content) {
            recommendations.push(rec.content);
          }
        });
      }

      // Always ensure we have some issues to work with for Page Magic
      if (issues.length === 0) {
        issues.push('Content could be further optimized for AI visibility and search engines');
        issues.push('Missing semantic HTML structure for better AI comprehension');
        issues.push('Could improve keyword density and topical relevance');
      }

      // Default recommendations for improvement
      if (recommendations.length === 0) {
        recommendations.push('Optimize content for better keyword density and semantic relevance');
        recommendations.push('Improve content structure with clear headings and subheadings');
        recommendations.push('Add more specific examples and actionable insights');
        recommendations.push('Enhance meta descriptions for better click-through rates');
        recommendations.push('Add schema markup for improved AI understanding');
      }

      this.logger.log(`Found ${issues.length} issues and ${recommendations.length} recommendations`);
      
      return { issues, recommendations };
    } catch (error) {
      this.logger.warn(`Error analyzing content: ${error.message}`);
      return {
        issues: ['Content needs optimization for better search visibility'],
        recommendations: ['Improve content structure and add more relevant keywords'],
      };
    }
  }

  /**
   * Extract text content from HTML
   */
  private extractTextFromHtml(html: string): string {
    try {
      // Remove script and style elements
      let cleanHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
      
      // Remove all HTML tags but keep content
      const textContent = cleanHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
      
      return textContent;
    } catch (error) {
      this.logger.error(`Error extracting text from HTML: ${error.message}`);
      return '';
    }
  }
}