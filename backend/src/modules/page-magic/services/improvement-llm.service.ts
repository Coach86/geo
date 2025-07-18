import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
import { z } from 'zod';
import { RuleToProcess, StructuredImprovement } from './sequential-improvement-structured.service';

/**
 * Service responsible for LLM interactions during page improvement.
 * Handles prompt generation, structured output parsing, and response processing.
 */
@Injectable()
export class ImprovementLlmService {
  private readonly logger = new Logger(ImprovementLlmService.name);
  private readonly preferredModel = 'claude-sonnet-4-20250514';

  constructor(
    private readonly llmService: LlmService,
  ) {}

  /**
   * Fix a specific rule and return structured improvements
   */
  async fixSpecificRuleStructured(
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
      this.logger.log(prompt);
      this.logger.log(`========== END PROMPT ==========\n`);

      this.logger.log(`Calling LLM with ${this.preferredModel} for rule: ${rule.id}`);

      const structuredResponse = await this.llmService.getStructuredOutput(
        LlmProvider.Anthropic,
        prompt,
        structuredImprovementSchema,
        {
          model: this.preferredModel,
        }
      );

      // Log the structured response
      this.logger.log(`\n========== LLM STRUCTURED RESPONSE ==========`);
      this.logger.log(JSON.stringify(structuredResponse, null, 2));
      this.logger.log(`========== END RESPONSE ==========\n`);

      return {
        ...structuredResponse,
        tokensUsed: { input: 0, output: 0 } // Usage not available in structured response
      };

    } catch (error) {
      this.logger.error(`Error getting structured output for rule ${rule.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a detailed prompt for fixing a specific rule with structured output
   */
  private createStructuredRulePrompt(
    rule: RuleToProcess,
    content: string,
    title: string,
    metas: any,
    previouslyFixedIssues?: string[]
  ): string {
    // List previously fixed issues to avoid undoing improvements
    const previousFixesContext = previouslyFixedIssues && previouslyFixedIssues.length > 0
      ? `\n\nThe following issues have ALREADY been fixed - DO NOT undo these improvements:\n${previouslyFixedIssues.map(issue => `- ${issue}`).join('\n')}`
      : '';

    return `You are a professional content optimizer tasked with improving a web page to fix a specific SEO/content issue.
Your goal is to make minimal, targeted changes that directly address the issue while preserving the overall content quality.

CURRENT ISSUE TO FIX:
Rule: ${rule.ruleName || rule.description}
Dimension: ${rule.dimension}
Severity: ${rule.severity}
Current Score: ${rule.currentScore}
Problem: ${rule.description}
Recommendation: ${rule.recommendation}
${rule.affectedElements ? `Affected Elements: ${rule.affectedElements.join(', ')}` : ''}
${previousFixesContext}

CURRENT CONTENT:
Title: ${title}
Meta Description: ${metas?.description || 'None'}
Content:
${content}

INSTRUCTIONS:
1. Make ONLY the minimal changes necessary to fix the specific issue described above
2. Preserve the existing content structure and quality
3. DO NOT make unrelated improvements or optimizations
4. DO NOT undo any previously fixed issues
5. If the issue cannot be fixed or doesn't apply, return empty fields

Return a JSON object with ONLY the fields that need to be changed:
- content: The improved content (Markdown format) - only if content needs to change
- title: The improved title - only if title needs to change  
- metas: Object with description and/or keywords - only if meta tags need to change

If no changes are needed for a field, omit it from the response.`;
  }

  /**
   * Create a prompt for overall content improvement
   */
  createOverallImprovementPrompt(
    content: string,
    title: string,
    metas: any,
    rules: RuleToProcess[]
  ): string {
    const rulesSummary = rules.map(r => 
      `- ${r.ruleName || r.description} (${r.dimension}, ${r.severity}): ${r.recommendation}`
    ).join('\n');

    return `You are a professional content optimizer. Improve this web page to address multiple SEO/content issues.

CURRENT ISSUES TO FIX:
${rulesSummary}

CURRENT CONTENT:
Title: ${title}
Meta Description: ${metas?.description || 'None'}
Content:
${content}

INSTRUCTIONS:
1. Address ALL the issues listed above in a single, cohesive improvement
2. Maintain the overall message and quality of the content
3. Make the content more engaging and valuable to readers
4. Ensure all changes work together harmoniously

Return a JSON object with the improved content:
- content: The improved content (Markdown format)
- title: The improved title
- metas: Object with description and keywords`;
  }
}