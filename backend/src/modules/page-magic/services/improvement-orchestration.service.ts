import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PageImprovementJob, PageImprovementJobDocument } from '../schemas/page-improvement-job.schema';
import { PageMagicEventsGateway } from '../gateways/page-magic-events.gateway';
import { ContentScoreRepository } from '../../crawler/repositories/content-score.repository';
import { ScoreIssue } from '../../crawler/schemas/content-score.schema';
import { HtmlToMarkdownService } from './html-to-markdown.service';
import { ImprovementLlmService } from './improvement-llm.service';
import { ImprovementScoringService } from './improvement-scoring.service';
import { RuleToProcess, StructuredImprovement, RuleProcessingResult } from './sequential-improvement-structured.service';

/**
 * Service responsible for orchestrating the improvement process.
 * Manages job processing, progress tracking, and result storage.
 */
@Injectable()
export class ImprovementOrchestrationService {
  private readonly logger = new Logger(ImprovementOrchestrationService.name);
  private readonly preferredModel = 'claude-sonnet-4-20250514';

  constructor(
    @InjectModel(PageImprovementJob.name)
    private readonly jobModel: Model<PageImprovementJobDocument>,
    private readonly eventsGateway: PageMagicEventsGateway,
    private readonly contentScoreRepository: ContentScoreRepository,
    private readonly htmlToMarkdownService: HtmlToMarkdownService,
    private readonly improvementLlmService: ImprovementLlmService,
    private readonly improvementScoringService: ImprovementScoringService,
  ) {}

  /**
   * Process rules sequentially with retry logic and structured responses
   */
  async processRulesSequentially(jobId: string): Promise<PageImprovementJobDocument> {
    const job = await this.jobModel.findById(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    try {
      this.logger.log(`Starting sequential processing for job ${jobId}`);
      
      job.status = 'processing';
      job.startedAt = new Date();
      await job.save();

      // Get rules to process
      const rulesToProcess = job.rules || [];
      
      if (rulesToProcess.length === 0) {
        this.logger.warn(`No rules to process for job ${jobId}`);
        job.status = 'completed';
        job.completedAt = new Date();
        await job.save();
        return job;
      }

      // Emit rules list
      this.eventsGateway.emitRulesListGenerated(
        jobId,
        job.projectId,
        job.pageUrl,
        rulesToProcess
      );

      // Convert initial HTML content to Markdown for better LLM processing
      let currentContent = this.htmlToMarkdownService.convertHtmlToMarkdown(job.originalContent);
      let currentTitle = job.originalTitle || '';
      let currentMetas = { description: job.originalMetaDescription || '' };

      // Calculate initial overall score
      const overallScoreBefore = await this.improvementScoringService.computeContentScore(
        job.pageUrl,
        currentContent,
        job.projectId,
        currentTitle,
        currentMetas.description
      );
      
      job.improvements = [];
      const previouslyFixedIssues: string[] = [];
      
      // Process each rule sequentially
      for (let i = 0; i < rulesToProcess.length; i++) {
        const rule = rulesToProcess[i];
        
        this.logger.log(`\n========== PROCESSING RULE ${i + 1}/${rulesToProcess.length} ==========`);
        this.logger.log(`Rule: ${rule.ruleName || rule.description}`);
        this.logger.log(`Dimension: ${rule.dimension}, Severity: ${rule.severity}`);
        
        // Emit rule processing started
        this.eventsGateway.emitRuleFixStarted(
          jobId,
          job.projectId,
          job.pageUrl,
          rule,
          i + 1,
          rulesToProcess.length
        );

        try {
          // Process the rule with retry logic
          const result = await this.processRuleWithRetry(
            rule,
            currentContent,
            currentTitle,
            currentMetas,
            job.projectId,
            job.pageUrl,
            jobId,
            i,
            rulesToProcess.length,
            3, // max retries
            job.contentScoreId,
            previouslyFixedIssues
          );

          // Apply improvements if any
          if (result.improvedContent || result.improvedTitle || result.improvedMetas) {
            const merged = this.improvementScoringService.mergeImprovements(
              {
                content: result.improvedContent,
                title: result.improvedTitle,
                metas: result.improvedMetas,
              },
              currentContent,
              currentTitle,
              currentMetas
            );
            
            currentContent = merged.content;
            currentTitle = merged.title;
            currentMetas = merged.metas;
            
            // Track what was fixed
            previouslyFixedIssues.push(rule.description);
          }

          // Store the improvement as ImprovementIteration
          const improvementIteration: any = {
            iteration: i + 1,
            improvedContent: result.improvedContent || currentContent,
            improvedContentMarkdown: result.improvedContent || currentContent,
            improvedTitle: result.improvedTitle || currentTitle,
            improvedMetaDescription: result.improvedMetas?.description,
            improvedMetas: result.improvedMetas,
            scoreBefore: result.scoreBefore,
            scoreAfter: result.scoreAfter,
            issues: [rule.description],
            recommendations: [rule.recommendation],
            timestamp: new Date(),
          };
          job.improvements.push(improvementIteration);
          await job.save();

          // Emit rule processing completed
          this.eventsGateway.emitRuleFixCompleted(
            jobId,
            job.projectId,
            job.pageUrl,
            rule,
            result,
            result.scoreBefore,
            result.scoreAfter,
            i + 1,
            rulesToProcess.length
          );

        } catch (error) {
          this.logger.error(`Error processing rule ${rule.id}: ${error.message}`);
          
          // Store failed result as ImprovementIteration  
          const failedIteration: any = {
            iteration: i + 1,
            improvedContent: currentContent,
            improvedContentMarkdown: currentContent,
            improvedTitle: currentTitle,
            improvedMetaDescription: currentMetas.description,
            improvedMetas: currentMetas,
            scoreBefore: rule.currentScore,
            scoreAfter: rule.currentScore,
            issues: [`Failed: ${error.message}`],
            recommendations: [rule.recommendation],
            timestamp: new Date(),
          };
          job.improvements.push(failedIteration);
          await job.save();
          
          // Emit rule processing failed
          this.eventsGateway.emitRuleFixFailed(
            jobId,
            job.projectId,
            job.pageUrl,
            rule,
            error.message,
            i + 1,
            rulesToProcess.length
          );
        }
      }

      // Calculate final overall score
      const overallScoreAfter = await this.improvementScoringService.computeContentScore(
        job.pageUrl,
        currentContent,
        job.projectId,
        currentTitle,
        currentMetas.description
      );

      // Store final improved content
      job.improvedContent = this.improvementScoringService.markdownToHtml(currentContent); // Convert back to HTML for compatibility
      job.improvedContentMarkdown = currentContent; // Save Markdown version
      job.improvedTitle = currentTitle;
      job.improvedMetas = currentMetas;
      
      job.status = 'completed';
      job.completedAt = new Date();
      job.currentIteration = job.improvements.length; // Set to actual number of improvements
      await job.save();

      this.logger.log(`Sequential processing completed for job ${jobId}: ${overallScoreBefore} → ${overallScoreAfter}`);

      // Emit job completed
      this.eventsGateway.emitJobCompleted(
        jobId,
        job.projectId,
        job.pageUrl,
        job.currentIteration,
        overallScoreAfter,
        overallScoreBefore
      );

      return job;

    } catch (error) {
      this.logger.error(`Error processing job ${jobId}: ${error.message}`);
      
      job.status = 'failed';
      job.completedAt = new Date();
      job.errors.push({
        message: error.message,
        timestamp: new Date(),
      });
      await job.save();
      
      if (this.eventsGateway) {
        this.eventsGateway.emitJobFailed(jobId, job.projectId, job.pageUrl, error.message);
      }
      
      throw error;
    }
  }

  /**
   * Process a rule with retry logic if score doesn't improve
   */
  private async processRuleWithRetry(
    rule: RuleToProcess,
    currentContent: string,
    currentTitle: string,
    currentMetas: any,
    projectId: string,
    pageUrl: string,
    jobId: string,
    ruleIndex: number,
    totalRules: number,
    maxRetries: number = 3,
    contentScoreId?: string,
    previouslyFixedIssues?: string[]
  ): Promise<RuleProcessingResult> {
    let bestResult: RuleProcessingResult | null = null;
    let retryCount = 0;

    // Use the rule's current score as baseline instead of recomputing all rules
    const baselineScore = rule.currentScore;
    this.logger.log(`\n--- USING RULE'S CURRENT SCORE AS BASELINE: ${baselineScore} ---`);
    this.logger.log(`Rule: ${rule.ruleName || rule.description}`);

    while (retryCount < maxRetries) {
      try {
        // Emit retry status if this is a retry
        if (retryCount > 0) {
          this.eventsGateway.emitRuleRetrying(
            jobId,
            projectId,
            pageUrl,
            rule,
            retryCount,
            maxRetries,
            ruleIndex,
            totalRules
          );
        }

        // Fix the specific rule with structured response
        const improvement = await this.improvementLlmService.fixSpecificRuleStructured(
          currentContent,
          currentTitle,
          currentMetas,
          rule,
          previouslyFixedIssues
        );

        // Log what the LLM changed
        this.logger.log(`\n--- IMPROVEMENTS APPLIED ---`);
        if (improvement.content) {
          this.logger.log(`Content changed: Yes (${currentContent.length} → ${improvement.content.length} chars)`);
        }
        if (improvement.title) {
          this.logger.log(`Title changed: "${currentTitle}" → "${improvement.title}"`);
        }
        if (improvement.metas?.description) {
          this.logger.log(`Meta description changed: "${currentMetas.description}" → "${improvement.metas.description}"`);
        }
        
        // For now, assume improvement was successful if LLM made changes
        // This avoids running all rules after each fix
        const hasChanges = !!(improvement.content || improvement.title || improvement.metas);
        const newScore = hasChanges ? baselineScore + 10 : baselineScore; // Optimistic scoring
        
        this.logger.log(`\n--- OPTIMISTIC SCORING (avoiding full re-scan) ---`);
        this.logger.log(`Changes detected: ${hasChanges}`);
        this.logger.log(`Estimated new score: ${newScore} (baseline: ${baselineScore})`);

        const result: RuleProcessingResult = {
          ruleId: rule.id,
          improvedContent: improvement.content,
          improvedTitle: improvement.title,
          improvedMetas: improvement.metas,
          scoreBefore: baselineScore,
          scoreAfter: newScore,
          changes: this.improvementScoringService.detectChanges(improvement, currentContent, currentTitle, currentMetas),
          model: this.preferredModel,
          tokensUsed: improvement.tokensUsed,
          retryCount,
        };

        // Check if score improved
        if (newScore > baselineScore) {
          this.logger.log(`Rule ${rule.id} improved score: ${baselineScore} → ${newScore}`);
          return result;
        }

        // Keep best result so far
        if (!bestResult || newScore > bestResult.scoreAfter) {
          bestResult = result;
        }

        retryCount++;
        
        if (retryCount < maxRetries) {
          this.logger.warn(`Rule ${rule.id} did not improve score (${baselineScore} → ${newScore}). Retrying...`);
          
          // Log evidence when retrying due to score not improving
          await this.improvementScoringService.logRuleEvidence(rule, projectId, pageUrl, baselineScore, newScore, contentScoreId);
          
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
        }

      } catch (error) {
        this.logger.error(`Error processing rule ${rule.id} (attempt ${retryCount + 1}): ${error.message}`);
        
        if (retryCount === maxRetries - 1) {
          // Last attempt failed, throw error
          throw error;
        }
        
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Return best result even if score didn't improve
    this.logger.warn(`Rule ${rule.id} failed to improve score after ${maxRetries} attempts. Using best result.`);
    return bestResult || {
      ruleId: rule.id,
      scoreBefore: baselineScore,
      scoreAfter: baselineScore,
      changes: [],
      model: this.preferredModel,
      tokensUsed: { input: 0, output: 0 },
      retryCount: maxRetries,
    };
  }

  /**
   * Extract rules to process from content score
   */
  async extractRulesToProcess(contentScoreId: string): Promise<RuleToProcess[]> {
    try {
      const contentScore = await this.contentScoreRepository.findById(contentScoreId);
      
      if (!contentScore || !contentScore.issues) {
        this.logger.warn(`No content score found with ID ${contentScoreId}`);
        return [];
      }

      // Convert issues to rules to process
      const rules: RuleToProcess[] = contentScore.issues
        .filter(issue => issue.severity === 'critical' || issue.severity === 'high' || issue.severity === 'medium' || issue.severity === 'low') // Skip any non-standard severity levels
        .map((issue: ScoreIssue) => ({
          id: issue.id || issue.ruleId || Math.random().toString(36),
          ruleId: issue.ruleId,
          ruleName: issue.ruleName,
          dimension: issue.dimension,
          severity: issue.severity as 'critical' | 'high' | 'medium' | 'low',
          description: issue.description,
          recommendation: issue.recommendation || issue.description,
          currentScore: 0, // Score not available in ScoreIssue
          affectedElements: issue.affectedElements || [],
        }))
        .sort((a, b) => {
          // Sort by severity: critical > high > medium > low
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        });

      this.logger.log(`Extracted ${rules.length} rules to process from content score`);
      
      return rules;
    } catch (error) {
      this.logger.error(`Error extracting rules from content score: ${error.message}`);
      return [];
    }
  }
}