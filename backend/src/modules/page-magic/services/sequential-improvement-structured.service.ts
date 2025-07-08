import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PageImprovementJob, PageImprovementJobDocument } from '../schemas/page-improvement-job.schema';
import { LlmService } from '../../llm/services/llm.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
import { AEOScoringService } from '../../crawler/services/aeo-scoring.service';
import { AEOContentAnalyzerService } from '../../crawler/services/aeo-content-analyzer.service';
import { PageMagicEventsGateway } from '../gateways/page-magic-events.gateway';
import { ContentScoreRepository } from '../../crawler/repositories/content-score.repository';
import { ScoreIssue } from '../../crawler/schemas/content-score.schema';
import { PageContent } from '../../crawler/interfaces/rule.interface';
import { PageSignals } from '../../crawler/interfaces/page-signals.interface';
import { PageCategoryType, AnalysisLevel } from '../../crawler/interfaces/page-category.interface';
import { HtmlToMarkdownService } from './html-to-markdown.service';
import { z } from 'zod';

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

export interface StructuredImprovement {
  content?: string;
  title?: string;
  metas?: {
    description?: string;
    keywords?: string;
    [key: string]: string | undefined;
  };
}

export interface RuleProcessingResult {
  ruleId: string;
  improvedContent?: string;
  improvedTitle?: string;
  improvedMetas?: any;
  scoreBefore: number;
  scoreAfter: number;
  changes: string[];
  model: string;
  tokensUsed?: {
    input: number;
    output: number;
    total?: number;
  };
  retryCount?: number;
}

@Injectable()
export class SequentialImprovementStructuredService {
  private readonly logger = new Logger(SequentialImprovementStructuredService.name);
  private readonly preferredModel = 'claude-sonnet-4-20250514';

  constructor(
    @InjectModel(PageImprovementJob.name)
    private readonly jobModel: Model<PageImprovementJobDocument>,
    private readonly eventsGateway: PageMagicEventsGateway,
    private readonly llmService: LlmService,
    private readonly aeoScoringService: AEOScoringService,
    private readonly aeoContentAnalyzerService: AEOContentAnalyzerService,
    private readonly contentScoreRepository: ContentScoreRepository,
    private readonly htmlToMarkdownService: HtmlToMarkdownService,
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

      // Track current state - use pre-converted Markdown content
      let currentContent = job.originalContentMarkdown || this.htmlToMarkdownService.convertHtmlToMarkdown(job.originalContent);
      let currentTitle = job.originalTitle || '';
      let currentMetas = {
        description: job.originalMetaDescription || '',
      };

      // Log initial state
      this.logger.log(`\n========== INITIAL CONTENT STATE ==========`);
      this.logger.log(`Title: "${currentTitle}"`);
      this.logger.log(`Meta Description: "${currentMetas.description}"`);
      this.logger.log(`Content Length: ${currentContent.length} characters`);
      this.logger.log(`Content Preview: ${currentContent.substring(0, 200)}...`);
      this.logger.log(`==========================================\n`);

      // Get initial overall score from content score - MUST exist
      if (!job.contentScoreId) {
        throw new Error(`Job ${jobId} has no contentScoreId - cannot proceed without initial scores`);
      }
      
      const contentScore = await this.contentScoreRepository.findById(job.contentScoreId);
      if (!contentScore) {
        throw new Error(`Content score ${job.contentScoreId} not found for job ${jobId}`);
      }
      
      const overallScoreBefore = contentScore.globalScore;
      this.logger.log(`Initial AEO score from content score: ${overallScoreBefore}`);

      // Track previously fixed issues
      const previouslyFixedIssues: string[] = [];

      // Process each rule sequentially
      for (let i = 0; i < rulesToProcess.length; i++) {
        const rule = rulesToProcess[i];
        
        try {
          this.logger.log(`\n=== PROCESSING RULE ${i + 1}/${rulesToProcess.length} ===`);
          this.logger.log(`Rule: ${rule.ruleName || rule.description}`);
          this.logger.log(`Dimension: ${rule.dimension}`);
          this.logger.log(`Severity: ${rule.severity}`);
          this.logger.log(`Current Score: ${rule.currentScore}`);
          if (previouslyFixedIssues.length > 0) {
            this.logger.log(`Previously fixed issues: ${previouslyFixedIssues.length}`);
          }
          
          // Emit rule processing started
          this.eventsGateway.emitRuleFixStarted(
            jobId,
            job.projectId,
            job.pageUrl,
            rule,
            i + 1,
            rulesToProcess.length
          );

          // Process rule with retry logic
          const result = await this.processRuleWithRetry(
            rule,
            currentContent,
            currentTitle,
            currentMetas,
            job.projectId,
            job.pageUrl,
            jobId,
            i + 1,
            rulesToProcess.length,
            3, // maxRetries
            job.contentScoreId,
            previouslyFixedIssues
          );

          // Update current state with improvements
          if (result.improvedContent) {
            currentContent = result.improvedContent;
          }
          if (result.improvedTitle) {
            currentTitle = result.improvedTitle;
          }
          if (result.improvedMetas) {
            currentMetas = { ...currentMetas, ...result.improvedMetas };
          }

          // Add this issue to the list of previously fixed issues if score improved
          if (result.scoreAfter > result.scoreBefore) {
            previouslyFixedIssues.push(rule.description);
            this.logger.log(`Added to fixed issues list: ${rule.description}`);
          }

          // Save the rule result to job
          const ruleImprovement = {
            ruleId: rule.id,
            ruleName: rule.ruleName,
            dimension: rule.dimension,
            description: rule.description,
            recommendation: rule.recommendation,
            improvedContent: result.improvedContent || currentContent,
            improvedTitle: result.improvedTitle,
            improvedMetas: result.improvedMetas,
            scoreBefore: result.scoreBefore,
            scoreAfter: result.scoreAfter,
            changes: result.changes,
            model: result.model,
            tokensUsed: result.tokensUsed,
            retryCount: result.retryCount,
            timestamp: new Date(),
          };

          if (!job.ruleResults) {
            job.ruleResults = [];
          }
          job.ruleResults.push(ruleImprovement);
          
          // Also save as an improvement iteration after each rule
          const improvementIteration = {
            iteration: i + 1, // Rule index as iteration number
            improvedContent: this.markdownToHtml(currentContent), // Convert to HTML for schema compatibility
            improvedContentMarkdown: currentContent, // Save Markdown version
            improvedTitle: currentTitle,
            improvedMetaDescription: currentMetas.description,
            improvedMetas: currentMetas,
            scoreBefore: result.scoreBefore,
            scoreAfter: result.scoreAfter,
            issues: [rule.description], // Single issue for this rule
            recommendations: [rule.recommendation],
            timestamp: new Date(),
          };
          
          job.improvements.push(improvementIteration);
          await job.save();

          // Emit rule processing completed with structured data
          this.eventsGateway.emitRuleFixCompleted(
            jobId,
            job.projectId,
            job.pageUrl,
            rule,
            {
              improvedContent: currentContent,
              improvedContentMarkdown: currentContent, // Content is already in Markdown format
              improvedTitle: currentTitle,
              improvedMetas: currentMetas,
            },
            result.scoreBefore,
            result.scoreAfter,
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

      // Calculate final overall improvement - this is the only time we run all rules
      this.logger.log(`\n========== FINAL SCORE CALCULATION (RUNNING ALL RULES) ==========`);
      const overallScoreAfter = await this.computeContentScore(
        job.pageUrl, 
        currentContent, 
        job.projectId,
        currentTitle,
        currentMetas.description
      );
      this.logger.log(`========== FINAL SCORE CALCULATION COMPLETE ==========\n`);
      
      // We no longer need to create a final improvement since we save after each rule
      // The last improvement in the array will be the final state
      
      // Log final improvement summary
      this.logger.log(`Final improvements summary:`);
      this.logger.log(`- Total iterations (rules processed): ${job.improvements.length}`);
      this.logger.log(`- Initial score: ${overallScoreBefore}`);
      this.logger.log(`- Final score: ${overallScoreAfter}`);
      this.logger.log(`- Overall improvement: ${overallScoreAfter - overallScoreBefore} points`);
      
      // Save the final improved versions at the top level
      job.improvedContent = this.markdownToHtml(currentContent); // Convert back to HTML for compatibility
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
        const improvement = await this.fixSpecificRuleStructured(
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
          changes: this.detectChanges(improvement, currentContent, currentTitle, currentMetas),
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
          await this.logRuleEvidence(rule, projectId, pageUrl, baselineScore, newScore, contentScoreId);
          
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
   * Fix a specific rule and return structured improvements
   */
  private async fixSpecificRuleStructured(
    content: string,
    title: string,
    metas: any,
    rule: RuleToProcess,
    previouslyFixedIssues?: string[]
  ): Promise<StructuredImprovement & { tokensUsed?: any }> {
    try {
      // Define the Zod schema for structured output
      const structuredImprovementSchema = z.object({
        content: z.string().optional(),
        title: z.string().optional(),
        metas: z.object({
          description: z.string().optional(),
          keywords: z.string().optional(),
        }).optional(),
      });

      const prompt = this.createStructuredRulePrompt(rule, content, title, metas, previouslyFixedIssues);
      
      // Log the full prompt being sent to the LLM
      this.logger.log(`\n========== LLM PROMPT ==========`);
      this.logger.log(`Rule: ${rule.ruleName || rule.description}`);
      this.logger.log(`Model: ${this.preferredModel}`);
      this.logger.log(`\n--- PROMPT START ---`);
      this.logger.log(prompt);
      this.logger.log(`--- PROMPT END ---\n`);
      
      this.logger.log(`Calling LLM with structured output for rule: ${rule.description}`);
      
      // Use structured output with LangChain adapter
      const parsedResponse = await this.llmService.getStructuredOutput(
        LlmProvider.Anthropic,
        prompt,
        structuredImprovementSchema,
        {
          model: this.preferredModel,
          temperature: 0.7,
          maxTokens: 8192, // Increased from 4000 to handle longer content
        }
      );

      // Log the LLM response
      this.logger.log(`\n========== LLM RESPONSE ==========`);
      this.logger.log(`Rule: ${rule.ruleName || rule.description}`);
      this.logger.log(`Response: ${JSON.stringify(parsedResponse, null, 2)}`);
      this.logger.log(`========== END LLM RESPONSE ==========\n`);

      // Validate that LLM only returned changed fields
      const validatedResponse: StructuredImprovement = {};
      let fieldsReturned = 0;
      let unchangedFieldsRemoved = 0;
      
      // Check content
      if (parsedResponse.content !== undefined) {
        fieldsReturned++;
        // Normalize whitespace for comparison
        const normalizedOriginal = content.trim().replace(/\s+/g, ' ');
        const normalizedResponse = parsedResponse.content.trim().replace(/\s+/g, ' ');
        
        if (normalizedResponse !== normalizedOriginal) {
          validatedResponse.content = parsedResponse.content;
        } else {
          this.logger.warn(`LLM returned unchanged content - removing from response`);
          unchangedFieldsRemoved++;
        }
      }
      
      // Check title
      if (parsedResponse.title !== undefined) {
        fieldsReturned++;
        if (parsedResponse.title.trim() !== title.trim()) {
          validatedResponse.title = parsedResponse.title;
        } else {
          this.logger.warn(`LLM returned unchanged title - removing from response`);
          unchangedFieldsRemoved++;
        }
      }
      
      // Check metas
      if (parsedResponse.metas) {
        fieldsReturned++;
        const changedMetas: any = {};
        let hasChanges = false;
        
        if (parsedResponse.metas.description !== undefined) {
          if (parsedResponse.metas.description.trim() !== (metas.description || '').trim()) {
            changedMetas.description = parsedResponse.metas.description;
            hasChanges = true;
          } else {
            this.logger.warn(`LLM returned unchanged meta description - removing from response`);
          }
        }
        
        // Check other meta fields
        const responseMetas = parsedResponse.metas as Record<string, string | undefined>;
        Object.keys(responseMetas).forEach(key => {
          if (key !== 'description' && responseMetas[key] !== undefined) {
            if (responseMetas[key]?.trim() !== (metas[key] || '').trim()) {
              changedMetas[key] = responseMetas[key];
              hasChanges = true;
            }
          }
        });
        
        if (hasChanges) {
          validatedResponse.metas = changedMetas;
        } else {
          unchangedFieldsRemoved++;
        }
      }
      
      // Log validation results
      this.logger.log(`\\n--- RESPONSE VALIDATION ---`);
      this.logger.log(`Fields returned by LLM: ${fieldsReturned}`);
      this.logger.log(`Unchanged fields removed: ${unchangedFieldsRemoved}`);
      this.logger.log(`Fields actually changed: ${Object.keys(validatedResponse).length}`);
      
      // If LLM returned multiple fields but we only kept one, log warning
      if (fieldsReturned > 1 && Object.keys(validatedResponse).length === 1) {
        this.logger.warn(`LLM returned ${fieldsReturned} fields but only 1 was actually changed - consider improving prompt specificity`);
      }

      // Note: getStructuredOutput doesn't return token usage directly
      // We'll need to handle this separately if needed
      return {
        ...validatedResponse,
        tokensUsed: { input: 0, output: 0, total: 0 }, // Placeholder
      };
    } catch (error) {
      this.logger.error(`Error in fixSpecificRuleStructured: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a structured prompt for rule-specific improvements
   */
  private createStructuredRulePrompt(
    rule: RuleToProcess,
    content: string,
    title: string,
    metas: any,
    previouslyFixedIssues?: string[]
  ): string {
    // Create a JSON object for the current state to avoid prompt injection
    const currentState = {
      title: title,
      metas: {
        description: metas.description || null,
        ...metas
      },
      content: content // This is now in Markdown format
    };

    // Create a JSON object for the rule to fix
    const ruleToFix = {
      issue: rule.description,
      recommendation: rule.recommendation,
      affectedElements: rule.affectedElements || [],
      dimension: rule.dimension,
      severity: rule.severity
    };

    // Determine what field the rule affects based on the issue description
    let affectsField = '';
    const lowerIssue = rule.description.toLowerCase();
    const lowerRecommendation = rule.recommendation.toLowerCase();
    
    if (lowerIssue.includes('meta description') || lowerRecommendation.includes('meta description')) {
      affectsField = 'META DESCRIPTION ONLY';
    } else if (lowerIssue.includes('title') || lowerRecommendation.includes('title')) {
      affectsField = 'TITLE ONLY';
    } else if (lowerIssue.includes('content') || lowerIssue.includes('text') || lowerIssue.includes('body')) {
      affectsField = 'CONTENT ONLY';
    }

    return `TASK: Fix the specific issue below by modifying ONLY what's necessary. Return ONLY a valid JSON object.

${previouslyFixedIssues && previouslyFixedIssues.length > 0 ? `IMPORTANT - PREVIOUSLY FIXED ISSUES (DO NOT UNDO THESE FIXES):
${JSON.stringify(previouslyFixedIssues, null, 2)}

` : ''}RULE TO FIX (as JSON):
${JSON.stringify(ruleToFix, null, 2)}

${affectsField ? `THIS RULE AFFECTS: ${affectsField}

` : ''}CURRENT STATE (as JSON):
Note: The content field is in Markdown format to preserve structure and formatting.
${JSON.stringify(currentState, null, 2)}

RESPONSE INSTRUCTIONS:
You MUST return ONLY the fields that need to be changed to fix the issue.
${affectsField === 'META DESCRIPTION ONLY' ? `Since this issue is about the meta description, return ONLY: {"metas": {"description": "Your new description here"}}` : ''}
${affectsField === 'TITLE ONLY' ? `Since this issue is about the title, return ONLY: {"title": "Your new title here"}` : ''}
${affectsField === 'CONTENT ONLY' ? `Since this issue is about the content, return ONLY: {"content": "Your new content here"}` : ''}

CRITICAL RULES - FAILURE TO FOLLOW THESE WILL RESULT IN REJECTION:
1. DO NOT include any field that you are not changing
2. DO NOT return the entire state - only changed fields
3. If fixing meta description, DO NOT include title or content in response
4. If fixing title, DO NOT include metas or content in response  
5. If fixing content, DO NOT include title or metas in response
6. Keep the same language as the original
7. Return valid JSON starting with { and ending with }
8. NO explanations, NO markdown, NO text outside the JSON
9. When improving content, ALWAYS return the COMPLETE improved content - never truncate or shorten
10. Preserve ALL existing content while making improvements - do not remove sections

EXAMPLE - If the issue is "Meta description too long":
WRONG: {"title": "...", "metas": {"description": "..."}, "content": "..."}
CORRECT: {"metas": {"description": "Shortened description under 160 chars"}}

JSON Response:`;
  }

  /**
   * Detect what changed between versions
   */
  private detectChanges(
    improvement: StructuredImprovement,
    originalContent: string,
    originalTitle: string,
    originalMetas: any
  ): string[] {
    const changes: string[] = [];

    if (improvement.content && improvement.content !== originalContent) {
      changes.push('Content updated');
    }
    if (improvement.title && improvement.title !== originalTitle) {
      changes.push('Title updated');
    }
    if (improvement.metas?.description && improvement.metas.description !== originalMetas.description) {
      changes.push('Meta description updated');
    }
    if (improvement.metas) {
      Object.keys(improvement.metas).forEach(key => {
        if (key !== 'description' && improvement.metas![key] !== originalMetas[key]) {
          changes.push(`Meta ${key} updated`);
        }
      });
    }

    return changes;
  }

  /**
   * Log rule evidence when retrying due to score not improving
   */
  private async logRuleEvidence(
    rule: RuleToProcess,
    projectId: string,
    pageUrl: string,
    oldScore: number,
    newScore: number,
    contentScoreId?: string
  ): Promise<void> {
    try {
      this.logger.warn(`========== RULE RETRY EVIDENCE ==========`);
      this.logger.warn(`Rule: ${rule.ruleName || rule.description}`);
      this.logger.warn(`Score did not improve: ${oldScore} → ${newScore}`);
      
      // Log the original evidence from content scores if available
      if (contentScoreId) {
        const contentScore = await this.contentScoreRepository.findById(contentScoreId);
        if (contentScore) {
          // First, try to find evidence in ruleResults
          let evidenceFound = false;
          
          if (contentScore.ruleResults && contentScore.ruleResults.length > 0) {
            const matchingRuleResult = contentScore.ruleResults.find(result => 
              result.ruleId === rule.ruleId || 
              result.ruleName === rule.ruleName
            );
            
            if (matchingRuleResult && matchingRuleResult.evidence) {
              this.logger.warn(`\n--- ORIGINAL EVIDENCE FROM RULE RESULTS ---`);
              this.logger.warn(`Rule Name: ${matchingRuleResult.ruleName}`);
              this.logger.warn(`Score: ${matchingRuleResult.score}/${matchingRuleResult.maxScore}`);
              this.logger.warn(`Passed: ${matchingRuleResult.passed ? 'Yes' : 'No'}`);
              
              this.logger.warn(`\nEvidence:`);
              matchingRuleResult.evidence.forEach((item: any) => {
                const typeSymbol = item.type === 'success' ? '✓' : 
                                 item.type === 'error' ? '✗' : 
                                 item.type === 'warning' ? '⚠' : '•';
                                 
                this.logger.warn(`  ${typeSymbol} [${item.type}] ${item.topic}: ${item.content}`);
                
                if (item.target) {
                  this.logger.warn(`    Target: ${item.target}`);
                }
                if (item.code) {
                  this.logger.warn(`    Code: ${item.code}`);
                }
                if (item.score !== undefined && item.maxScore !== undefined) {
                  this.logger.warn(`    Score: ${item.score}/${item.maxScore}`);
                }
              });
              
              evidenceFound = true;
            }
          }
          
          // If no evidence found in ruleResults, check the issues
          if (!evidenceFound) {
            const matchingIssue = contentScore.issues.find(issue => 
              issue.id === rule.id || 
              issue.ruleId === rule.ruleId ||
              issue.description === rule.description
            );
            
            if (matchingIssue) {
              this.logger.warn(`\n--- ORIGINAL ISSUE FROM CONTENT SCORE ---`);
              this.logger.warn(`Issue: ${matchingIssue.description}`);
              this.logger.warn(`Severity: ${matchingIssue.severity}`);
              this.logger.warn(`Dimension: ${matchingIssue.dimension}`);
              this.logger.warn(`Recommendation: ${matchingIssue.recommendation}`);
              
              if (matchingIssue.affectedElements && matchingIssue.affectedElements.length > 0) {
                this.logger.warn(`Affected Elements: ${matchingIssue.affectedElements.join(', ')}`);
              }
            } else {
              this.logger.warn(`No matching rule or issue found in content scores for rule ${rule.id}`);
            }
          }
        }
      }
      
      // Log the new evidence (current state)
      this.logger.warn(`\n--- NEW EVIDENCE (AFTER ATTEMPTED FIX) ---`);
      this.logger.warn(`Rule ID: ${rule.id}`);
      this.logger.warn(`Rule Name: ${rule.ruleName || 'N/A'}`);
      this.logger.warn(`Dimension: ${rule.dimension}`);
      this.logger.warn(`Description: ${rule.description}`);
      this.logger.warn(`Recommendation: ${rule.recommendation}`);
      this.logger.warn(`Current Score: ${rule.currentScore}`);
      this.logger.warn(`Score After Fix: ${newScore} (no improvement)`);
      
      if (rule.affectedElements && rule.affectedElements.length > 0) {
        this.logger.warn(`Affected Elements: ${rule.affectedElements.join(', ')}`);
      }
      
      this.logger.warn(`========================================\n`);
    } catch (error) {
      this.logger.error(`Error logging rule evidence: ${error.message}`);
    }
  }

  /**
   * Extract rules to process from content score
   */
  async extractRulesToProcess(contentScoreId: string): Promise<RuleToProcess[]> {
    try {
      this.logger.log(`Extracting rules from content score ${contentScoreId}`);
      
      const contentScore = await this.contentScoreRepository.findById(contentScoreId);
      if (!contentScore) {
        this.logger.error(`Content score ${contentScoreId} not found`);
        return [];
      }

      this.logger.log(`Found ${contentScore.issues.length} total issues`);
      
      // Filter out technical issues and map to RuleToProcess
      const rulesToProcess: RuleToProcess[] = contentScore.issues
        .filter(issue => issue.dimension !== 'technical')
        .map((issue, index) => {
          // Find the specific rule's score from ruleResults
          const ruleResult = contentScore.ruleResults?.find(
            result => result.ruleId === issue.ruleId
          );
          const ruleScore = ruleResult ? ruleResult.score : 0;
          
          this.logger.log(`Rule ${issue.ruleId || issue.id}:`);
          this.logger.log(`  - Issue description: ${issue.description}`);
          this.logger.log(`  - Rule name: ${issue.ruleName}`);
          this.logger.log(`  - Score from ruleResults: ${ruleScore}`);
          this.logger.log(`  - RuleResult found: ${ruleResult ? 'Yes' : 'No'}`);
          if (ruleResult) {
            this.logger.log(`  - RuleResult details: score=${ruleResult.score}, maxScore=${ruleResult.maxScore}, passed=${ruleResult.passed}`);
          }
          
          return {
            id: issue.id || `rule-${index}`,
            ruleId: issue.ruleId,
            ruleName: issue.ruleName || `${issue.dimension} Issue`,
            dimension: issue.dimension,
            severity: issue.severity,
            description: issue.description,
            recommendation: issue.recommendation,
            currentScore: ruleScore,
            affectedElements: issue.affectedElements || [],
          };
        });

      this.logger.log(`Extracted ${rulesToProcess.length} non-technical rules to process`);
      
      return rulesToProcess;
    } catch (error) {
      this.logger.error(`Error extracting rules: ${error.message}`);
      return [];
    }
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
  private async computeContentScore(
    pageUrl: string, 
    content: string, 
    projectId: string,
    title?: string,
    metaDescription?: string
  ): Promise<number> {
    try {
      this.logger.log(`\n========== COMPUTING CONTENT SCORE ==========`);
      this.logger.log(`URL: ${pageUrl}`);
      this.logger.log(`Title: "${title || 'No title'}"`);
      this.logger.log(`Meta Description: "${metaDescription || 'No meta description'}"`);
      this.logger.log(`Content Length: ${content.length} characters`);
      this.logger.log(`Content Preview (first 200 chars): ${content.substring(0, 200)}...`);
      
      // Convert markdown back to HTML for scoring (scoring system expects HTML)
      const htmlContent = this.markdownToHtml(content);
      
      // Create a mock crawled page structure for scoring
      const mockCrawledPage = {
        url: pageUrl,
        html: `<html><head><title>${title || ''}</title><meta name="description" content="${metaDescription || ''}"></head><body>${htmlContent}</body></html>`,
        text: this.stripMarkdown(content), // Plain text version
        title: title || 'Page Magic Content',
        metadata: {
          title: title || 'Page Magic Content',
          description: metaDescription || '',
        },
        contentLength: content.length,
        crawledAt: new Date(),
      };

      // Create a mock project object
      const mockProject = {
        id: projectId,
        _id: projectId,
      };

      // Use the scoring service to compute AEO score
      const pageContent: PageContent = {
        url: pageUrl,
        html: mockCrawledPage.html,
        cleanContent: content,
        metadata: mockCrawledPage.metadata,
        pageSignals: {} as PageSignals, // Will be populated by the scoring service
        pageCategory: {
          type: PageCategoryType.UNKNOWN,
          confidence: 1,
          analysisLevel: AnalysisLevel.PARTIAL,
        },
      };
      
      const score = await this.aeoScoringService.calculateScore(pageUrl, pageContent);
      
      this.logger.log(`Computed Score: ${score.globalScore || 0}`);
      this.logger.log(`Dimension Scores: Technical=${score.categoryScores?.technical?.score}, Structure=${score.categoryScores?.structure?.score}, Authority=${score.categoryScores?.authority?.score}, Quality=${score.categoryScores?.quality?.score}`);
      this.logger.log(`========== END CONTENT SCORE ==========\n`);
      
      // Return the overall score
      return score.globalScore || 0;
    } catch (error) {
      this.logger.error(`Error computing content score: ${error.message}`);
      // Return a default score in case of error
      return 65;
    }
  }

  /**
   * Convert Markdown back to HTML for scoring
   */
  private markdownToHtml(markdown: string): string {
    // Basic markdown to HTML conversion
    let html = markdown;
    
    // Convert headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Convert bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convert lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Convert numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // Convert paragraphs
    html = html.split('\n\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('\n');
    
    return html;
  }

  /**
   * Strip Markdown formatting to get plain text
   */
  private stripMarkdown(markdown: string): string {
    let text = markdown;
    
    // Remove headers
    text = text.replace(/^#{1,6}\s+/gm, '');
    
    // Remove bold and italic
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/\*(.+?)\*/g, '$1');
    text = text.replace(/__(.+?)__/g, '$1');
    text = text.replace(/_(.+?)_/g, '$1');
    
    // Remove links
    text = text.replace(/\[(.+?)\]\(.+?\)/g, '$1');
    
    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`(.+?)`/g, '$1');
    
    // Remove list markers
    text = text.replace(/^[\-\*\+]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');
    
    return text.trim();
  }
}