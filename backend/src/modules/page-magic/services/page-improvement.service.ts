import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';

export interface ImprovementResult {
  improvedContent: string;
  improvedTitle?: string;
  improvedMetaDescription?: string;
  changes: string[];
  reasoning: string;
  model: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
}

@Injectable()
export class PageImprovementService {
  private readonly logger = new Logger(PageImprovementService.name);
  private readonly preferredModel = 'claude-sonnet-4-20250514'; // Claude 4 Sonnet

  constructor(private readonly llmService: LlmService) {}

  /**
   * Improve page content using Claude 4 to address issues and recommendations
   */
  async improvePageContent(
    originalContent: string,
    issues: string[],
    recommendations: string[],
    iteration: number,
    originalTitle?: string,
    originalMetaDescription?: string,
    customPrompt?: string,
  ): Promise<ImprovementResult> {
    try {
      this.logger.log(`Starting content improvement - iteration ${iteration}`);
      this.logger.log(`Original content length: ${originalContent.length} characters`);
      this.logger.log(`Number of issues to address: ${issues.length}`);
      this.logger.log(`Number of recommendations to follow: ${recommendations.length}`);
      
      const prompt = customPrompt || this.createDefaultPrompt(
        originalContent,
        issues,
        recommendations,
        originalTitle,
        originalMetaDescription,
      );

      this.logger.log(`Built improvement prompt, length: ${prompt.length} characters`);
      this.logger.log(`Using model: ${this.preferredModel}`);

      // Use Claude 4 Sonnet for content improvement
      this.logger.log('Calling Claude 4 Sonnet for content improvement...');
      const response = await this.llmService.call(
        LlmProvider.Anthropic,
        prompt,
        {
          model: this.preferredModel,
          temperature: 0.7,
          maxTokens: 4000,
          webAccess: false, // Don't need web access for content improvement
        }
      );
      
      this.logger.log(`Claude 4 response received, length: ${response.text.length} characters`);
      this.logger.log(`Token usage: ${JSON.stringify(response.tokenUsage)}`);
      
      // Log the full response
      this.logger.log('=== CLAUDE IMPROVEMENT RESPONSE ===');
      this.logger.log('Full response:');
      this.logger.log(response.text);
      this.logger.log('=== END RESPONSE ===');

      this.logger.log(`Content improvement completed for iteration ${iteration}`);
      
      // Parse the response to extract improved content and reasoning
      this.logger.log('Parsing Claude 4 response to extract structured information...');
      const parsedResponse = this.parseImprovementResponse(response.text);
      
      this.logger.log(`Parsed response - Improved content length: ${parsedResponse.improvedContent.length} characters`);
      this.logger.log(`Parsed response - Improved title: "${parsedResponse.improvedTitle || 'unchanged'}"`);
      this.logger.log(`Parsed response - Improved meta description: "${parsedResponse.improvedMetaDescription || 'unchanged'}"`);
      this.logger.log(`Parsed response - Changes count: ${parsedResponse.changes.length}`);
      
      return {
        improvedContent: parsedResponse.improvedContent,
        improvedTitle: parsedResponse.improvedTitle,
        improvedMetaDescription: parsedResponse.improvedMetaDescription,
        changes: parsedResponse.changes,
        reasoning: parsedResponse.reasoning,
        model: response.modelVersion || this.preferredModel,
        tokensUsed: response.tokenUsage || { input: 0, output: 0, total: 0 },
      };
    } catch (error) {
      this.logger.error(`Error improving content: ${error.message}`);
      throw new Error(`Failed to improve content: ${error.message}`);
    }
  }

  /**
   * Create a simple default prompt (fallback only)
   */
  private createDefaultPrompt(
    content: string,
    issues: string[],
    recommendations: string[],
    originalTitle?: string,
    originalMetaDescription?: string,
  ): string {
    return `You are an expert content optimizer. Please improve the following content:

CONTENT:
${content}

ISSUES TO ADDRESS:
${issues.join('\n')}

RECOMMENDATIONS:
${recommendations.join('\n')}

Return only a JSON object with this structure:
{
  "improvedContent": "The improved content in markdown format",
  "changes": ["List of changes made"]
}`;
  }

  /**
   * Parse the Claude 4 response to extract structured information
   */
  private parseImprovementResponse(responseText: string): {
    improvedContent: string;
    improvedTitle?: string;
    improvedMetaDescription?: string;
    changes: string[];
    reasoning: string;
  } {
    try {
      // First try to parse as JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        return {
          improvedContent: parsed.improvedContent || responseText.trim(),
          improvedTitle: parsed.improvedTitle,
          improvedMetaDescription: parsed.improvedMetaDescription,
          changes: Array.isArray(parsed.changes) ? parsed.changes : ['Content optimized for better SEO and AI visibility'],
          reasoning: parsed.reasoning || 'Content improvement completed',
        };
      }
      
      // Fallback to regex parsing if not JSON format
      const titleMatch = responseText.match(/IMPROVED TITLE:\s*(.*?)(?=\n\s*IMPROVED META DESCRIPTION:|$)/i);
      const metaMatch = responseText.match(/IMPROVED META DESCRIPTION:\s*(.*?)(?=\n\s*IMPROVED CONTENT:|$)/i);
      const contentMatch = responseText.match(/IMPROVED CONTENT:\s*([\s\S]*?)(?=\n\s*CHANGES MADE:|$)/i);
      const changesMatch = responseText.match(/CHANGES MADE:\s*([\s\S]*?)(?=\n\s*REASONING:|$)/i);
      const reasoningMatch = responseText.match(/REASONING:\s*([\s\S]*?)$/i);

      const improvedTitle = titleMatch?.[1]?.trim();
      const improvedMetaDescription = metaMatch?.[1]?.trim();
      const improvedContent = contentMatch?.[1]?.trim() || responseText.trim();
      const changesText = changesMatch?.[1]?.trim() || '';
      const reasoning = reasoningMatch?.[1]?.trim() || 'Content improvement completed';

      // Parse changes into array
      const changes = changesText
        .split('\n')
        .map(line => line.replace(/^[-*•]\s*/, '').trim())
        .filter(line => line.length > 0);

      return {
        improvedContent,
        improvedTitle,
        improvedMetaDescription,
        changes: changes.length > 0 ? changes : ['Content optimized for better SEO and AI visibility'],
        reasoning,
      };
    } catch (error) {
      this.logger.warn(`Error parsing improvement response: ${error.message}`);
      
      // Fallback - return the entire response as improved content
      return {
        improvedContent: responseText.trim(),
        changes: ['Content improved using AI optimization'],
        reasoning: 'Content has been optimized for better performance',
      };
    }
  }

  /**
   * Check if Claude 4 is available
   */
  isClaudeAvailable(): boolean {
    return this.llmService.isProviderAvailable(LlmProvider.Anthropic);
  }

  /**
   * Get fallback model if Claude 4 is not available
   */
  getFallbackModel(): string {
    // Fallback to Claude 3.7 Sonnet or GPT-4o
    if (this.llmService.isProviderAvailable(LlmProvider.Anthropic)) {
      return 'claude-3-7-sonnet-20250219';
    }
    return 'gpt-4o';
  }

}