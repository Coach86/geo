import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PageImprovementJob, PageImprovementJobDocument } from '../schemas/page-improvement-job.schema';
import { PageImprovementService } from './page-improvement.service';
import { AEOScoringService } from '../../crawler/services/aeo-scoring.service';
import { AEOContentAnalyzerService } from '../../crawler/services/aeo-content-analyzer.service';
import { PageMagicEventsGateway } from '../gateways/page-magic-events.gateway';
import { ContentScoreRepository } from '../../crawler/repositories/content-score.repository';
import { ScoreIssue } from '../../crawler/schemas/content-score.schema';

export interface RuleToProcess {
  id: string;
  ruleId?: string;
  ruleName?: string;
  dimension: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  currentScore: number;
  affectedElements?: string[];
}

export interface RuleProcessingResult {
  ruleId: string;
  improvedContent: string;
  scoreBefore: number;
  scoreAfter: number;
  changes: string[];
  model: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

@Injectable()
export class SequentialImprovementService {
  private readonly logger = new Logger(SequentialImprovementService.name);

  constructor(
    @InjectModel(PageImprovementJob.name)
    private readonly jobModel: Model<PageImprovementJobDocument>,
    private readonly improvementService: PageImprovementService,
    private readonly scoringService: AEOScoringService,
    private readonly contentAnalyzer: AEOContentAnalyzerService,
    private readonly eventsGateway: PageMagicEventsGateway,
    private readonly contentScoreRepository: ContentScoreRepository,
  ) {}

  /**
   * Extract non-technical rules that need to be processed from content score
   */
  async extractRulesToProcess(contentScoreId: string): Promise<RuleToProcess[]> {
    try {
      this.logger.log(`Extracting rules to process from content score: ${contentScoreId}`);
      
      const contentScore = await this.contentScoreRepository.findById(contentScoreId);
      if (!contentScore) {
        throw new Error(`Content score ${contentScoreId} not found`);
      }

      // DEBUG: Log all issues before filtering
      this.logger.log(`Total issues found: ${contentScore.issues.length}`);
      this.logger.log(`All issues data: ${JSON.stringify(contentScore.issues.map(issue => ({
        id: issue.id,
        dimension: issue.dimension,
        severity: issue.severity,
        description: issue.description.substring(0, 50) + '...',
        ruleId: issue.ruleId,
        ruleName: issue.ruleName
      })))}`);

      // Count issues by dimension
      const issuesByDimension = contentScore.issues.reduce((acc, issue) => {
        acc[issue.dimension] = (acc[issue.dimension] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      this.logger.log(`Issues by dimension: ${JSON.stringify(issuesByDimension)}`);

      // Filter out technical issues and transform to RuleToProcess format
      const rulesToProcess: RuleToProcess[] = contentScore.issues
        .filter(issue => {
          const isNonTechnical = issue.dimension !== 'technical';
          this.logger.log(`Issue ${issue.id}: dimension="${issue.dimension}", isNonTechnical=${isNonTechnical}`);
          return isNonTechnical;
        })
        .map((issue, index) => ({
          id: issue.id || `rule-${index}`,
          ruleId: issue.ruleId,
          ruleName: issue.ruleName || `${issue.dimension} Issue`,
          dimension: issue.dimension,
          severity: issue.severity,
          description: issue.description,
          recommendation: issue.recommendation,
          currentScore: this.getDimensionScore(contentScore.scores, issue.dimension),
          affectedElements: issue.affectedElements || [],
        }));

      this.logger.log(`Found ${rulesToProcess.length} non-technical rules to process`);
      this.logger.log(`Rules: ${JSON.stringify(rulesToProcess.map(rule => ({
        id: rule.id,
        dimension: rule.dimension,
        severity: rule.severity,
        description: rule.description.substring(0, 50) + '...'
      })))}`);

      return rulesToProcess;
    } catch (error) {
      this.logger.error(`Error extracting rules to process: ${error.message}`);
      this.logger.error(`ContentScoreId: ${contentScoreId}`);
      this.logger.error(`Error stack: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Process rules sequentially for a job
   */
  async processRulesSequentially(jobId: string): Promise<PageImprovementJobDocument> {
    try {
      const job = await this.jobModel.findById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      this.logger.log(`Starting sequential rule processing for job ${jobId}`);
      
      // Mark job as processing
      job.status = 'processing';
      await job.save();

      // Get rules to process
      if (!job.contentScoreId) {
        throw new Error('Job must have a content score ID for sequential processing');
      }

      this.logger.log(`Processing job ${jobId} with contentScoreId: ${job.contentScoreId}`);
      this.logger.log(`Job details: projectId=${job.projectId}, pageUrl=${job.pageUrl}`);

      const rulesToProcess = await this.extractRulesToProcess(job.contentScoreId);
      
      if (rulesToProcess.length === 0) {
        this.logger.error(`No non-technical rules to process for job ${jobId} - this should not happen!`);
        this.logger.error(`Job contentScoreId: ${job.contentScoreId}`);
        this.logger.error(`Job created at: ${job.createdAt}`);
        throw new Error(`No rules found to process. All issues may already be resolved.`);
      }

      // Emit rules list to frontend
      this.eventsGateway.emitRulesListGenerated(
        jobId,
        job.projectId,
        job.pageUrl,
        rulesToProcess
      );

      let currentContent = job.originalContent;
      this.logger.log(`Starting to compute initial AEO score for ${job.pageUrl}`);
      let overallScoreBefore: number;
      try {
        overallScoreBefore = await this.computeContentScore(job.pageUrl, currentContent, job.projectId);
        this.logger.log(`Initial AEO score computed successfully: ${overallScoreBefore}`);
      } catch (scoreError) {
        this.logger.error(`Failed to compute initial AEO score: ${scoreError.message}`);
        overallScoreBefore = 65; // Use fallback score
        this.logger.log(`Using fallback score: ${overallScoreBefore}`);
      }

      // Process each rule sequentially
      for (let i = 0; i < rulesToProcess.length; i++) {
        const rule = rulesToProcess[i];
        
        try {
          this.logger.log(`Processing rule ${i + 1}/${rulesToProcess.length}: ${rule.description}`);
          
          // Emit rule processing started
          this.eventsGateway.emitRuleFixStarted(
            jobId,
            job.projectId,
            job.pageUrl,
            rule,
            i + 1,
            rulesToProcess.length
          );

          // Get score before fixing this rule
          const scoreBefore = await this.computeContentScore(job.pageUrl, currentContent, job.projectId);
          
          // Fix the specific rule
          const ruleResult = await this.fixSpecificRule(
            currentContent,
            rule,
            job.originalTitle,
            job.originalMetaDescription
          );

          // Update current content
          currentContent = ruleResult.improvedContent;

          // Compute new score
          const scoreAfter = await this.computeContentScore(job.pageUrl, currentContent, job.projectId);
          
          this.logger.log(`Rule ${rule.id} processed: Score ${scoreBefore} → ${scoreAfter}`);

          // Save the rule result to job
          const ruleImprovement = {
            ruleId: rule.id,
            ruleName: rule.ruleName,
            dimension: rule.dimension,
            description: rule.description,
            recommendation: rule.recommendation,
            improvedContent: ruleResult.improvedContent,
            scoreBefore,
            scoreAfter,
            changes: ruleResult.changes,
            model: ruleResult.model,
            tokensUsed: ruleResult.tokensUsed,
            timestamp: new Date(),
          };

          // Add to job's rule results
          if (!job.ruleResults) {
            job.ruleResults = [];
          }
          job.ruleResults.push(ruleImprovement);
          await job.save();

          // Emit rule processing completed
          this.eventsGateway.emitRuleFixCompleted(
            jobId,
            job.projectId,
            job.pageUrl,
            rule,
            ruleResult,
            scoreBefore,
            scoreAfter,
            i + 1,
            rulesToProcess.length
          );

          // Small delay between rules for better UX
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (ruleError) {
          this.logger.error(`Error processing rule ${rule.id}: ${ruleError.message}`);
          
          // Emit rule processing failed
          this.eventsGateway.emitRuleFixFailed(
            jobId,
            job.projectId,
            job.pageUrl,
            rule,
            ruleError.message,
            i + 1,
            rulesToProcess.length
          );

          // Continue with next rule
          continue;
        }
      }

      // Calculate final overall improvement
      const overallScoreAfter = await this.computeContentScore(job.pageUrl, currentContent, job.projectId);
      
      // Create final improvement result
      const finalImprovement = {
        iteration: 1,
        improvedContent: currentContent,
        improvedTitle: job.originalTitle, // Could be improved by rules later
        improvedMetaDescription: job.originalMetaDescription, // Could be improved by rules later
        scoreBefore: overallScoreBefore,
        scoreAfter: overallScoreAfter,
        issues: rulesToProcess.map(rule => rule.description),
        recommendations: rulesToProcess.map(rule => rule.recommendation),
        timestamp: new Date(),
      };

      job.improvements.push(finalImprovement);
      job.status = 'completed';
      job.completedAt = new Date();
      job.currentIteration = 1;
      await job.save();

      this.logger.log(`Sequential processing completed for job ${jobId}: ${overallScoreBefore} → ${overallScoreAfter}`);

      // Emit job completed
      this.eventsGateway.emitJobCompleted(
        jobId,
        job.projectId,
        job.pageUrl,
        1,
        overallScoreAfter,
        overallScoreBefore
      );

      return job;
    } catch (error) {
      this.logger.error(`Error in sequential processing for job ${jobId}: ${error.message}`);
      
      // Mark job as failed
      const job = await this.jobModel.findById(jobId);
      if (job) {
        job.status = 'failed';
        job.failedAt = new Date();
        job.errors.push(error.message);
        await job.save();
        
        this.eventsGateway.emitJobFailed(jobId, job.projectId, job.pageUrl, error.message);
      }
      
      throw error;
    }
  }

  /**
   * Fix a specific rule using targeted LLM prompt
   */
  private async fixSpecificRule(
    content: string,
    rule: RuleToProcess,
    originalTitle?: string,
    originalMetaDescription?: string
  ): Promise<RuleProcessingResult> {
    try {
      this.logger.log(`Fixing specific rule: ${rule.description}`);
      
      // Create a targeted prompt for this specific rule
      const targetedPrompt = this.createRuleSpecificPrompt(rule, content, originalTitle, originalMetaDescription);
      
      // Use the improvement service with the targeted prompt
      const improvement = await this.improvementService.improvePageContent(
        content,
        [rule.description], // Single issue
        [rule.recommendation], // Single recommendation
        1,
        originalTitle,
        originalMetaDescription,
        targetedPrompt
      );

      return {
        ruleId: rule.id,
        improvedContent: improvement.improvedContent,
        scoreBefore: rule.currentScore,
        scoreAfter: 0, // Will be calculated by caller
        changes: improvement.changes || [],
        model: improvement.model,
        tokensUsed: improvement.tokensUsed,
      };
    } catch (error) {
      this.logger.error(`Error fixing rule ${rule.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a rule-specific prompt for targeted improvements
   */
  private createRuleSpecificPrompt(
    rule: RuleToProcess,
    content: string,
    originalTitle?: string,
    originalMetaDescription?: string
  ): string {
    return `You are an expert content optimizer focused on fixing specific SEO and content issues.

SPECIFIC RULE TO FIX:
- Dimension: ${rule.dimension}
- Issue: ${rule.description}
- Recommendation: ${rule.recommendation}
- Severity: ${rule.severity}

FOCUS AREAS:
${rule.dimension === 'content' ? `
- Content quality, relevance, and depth
- Keyword optimization and semantic relevance
- Content structure and readability
- Adding specific examples and actionable insights
` : rule.dimension === 'structure' ? `
- HTML structure and semantic markup
- Heading hierarchy and organization
- Meta descriptions and title optimization
- Internal linking and navigation structure
` : rule.dimension === 'authority' ? `
- Authority signals and credibility markers
- Expert content and thought leadership
- Citations and source references
- Trust signals and social proof
` : `
- General content optimization
- User experience improvements
- Search engine optimization
- Content clarity and engagement
`}

INSTRUCTIONS:
1. Read the current content carefully
2. Identify exactly what needs to be fixed based on the specific rule
3. Make ONLY the changes needed to address this specific issue
4. Preserve all other aspects of the content
5. Ensure the fix is comprehensive and addresses the root cause
6. Return the improved content in markdown format

Current Title: ${originalTitle || 'No title provided'}
Current Meta Description: ${originalMetaDescription || 'No meta description provided'}

Current Content:
${content}

Please provide the improved content that specifically addresses the "${rule.description}" issue.`;
  }

  /**
   * Get the score for a specific dimension
   */
  private getDimensionScore(scores: any, dimension: string): number {
    switch (dimension) {
      case 'technical':
        return scores.technical || 0;
      case 'structure':
        return scores.structure || 0;
      case 'authority':
        return scores.authority || 0;
      case 'quality':
        return scores.quality || 0;
      default:
        return 0;
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

      // Use the real AEO content analyzer with timeout
      this.logger.log(`Starting AEO analysis for ${pageUrl}`);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AEO analysis timeout after 30 seconds')), 30000);
      });
      
      const analysisResult = await Promise.race([
        this.contentAnalyzer.analyzePage(mockCrawledPage, mockProject),
        timeoutPromise
      ]);
      
      if (analysisResult && analysisResult.globalScore !== undefined) {
        this.logger.log(`Computed AEO score: ${analysisResult.globalScore}`);
        return analysisResult.globalScore;
      }
      
      // Fallback if analysis fails
      this.logger.warn('AEO analysis returned no score, using fallback');
      return 65;
    } catch (error) {
      this.logger.error(`Error computing AEO score: ${error.message}`, error.stack);
      return 65;
    }
  }
}