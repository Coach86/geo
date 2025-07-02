import { Injectable, Logger } from '@nestjs/common';
import { TrackedLLMService } from './tracked-llm.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
import { PageSignalExtractorService } from './page-signal-extractor.service';
import { PageSignals } from '../interfaces/page-signals.interface';
import { 
  UnifiedKPIResult, 
  validateUnifiedKPIResult 
} from '../schemas/unified-kpi-result.schema';

interface AnalysisContext {
  brandName: string;
  keyBrandAttributes: string[];
  competitors: string[];
}

@Injectable()
export class UnifiedKPIAnalyzerService {
  private readonly logger = new Logger(UnifiedKPIAnalyzerService.name);

  constructor(
    private readonly trackedLLMService: TrackedLLMService,
    private readonly pageSignalExtractor: PageSignalExtractorService,
  ) {}

  /**
   * Analyze a page using unified single-pass LLM approach
   */
  async analyze(
    html: string, 
    metadata: any, 
    context: AnalysisContext,
    url?: string
  ): Promise<UnifiedKPIResult> {
    try {
      // Extract structured signals first
      const pageSignals = this.pageSignalExtractor.extract(html, metadata, context);
      const cleanContent = this.pageSignalExtractor.getCleanContent(html);

      // Build unified prompt
      const prompt = this.buildUnifiedPrompt(pageSignals, cleanContent, context);

      // Call LLM with optimized settings using LangChain adapter
      const model = 'gpt-3.5-turbo-0125';
      const response = await this.trackedLLMService.call(
        url || 'unknown',
        'unified_analysis',
        LlmProvider.OpenAILangChain,
        prompt,
        {
          model,
          temperature: 0, // Consistent results
          maxTokens: 1000, // Limit response size
        }
      );

      // Parse and validate response
      const parsedResult = this.parseUnifiedResponse(response.text);
      
      // Add LLM data to the result
      const resultWithLLMData: UnifiedKPIResult = {
        ...parsedResult,
        llmData: {
          prompt,
          response: response.text,
          model,
          tokensUsed: response.tokenUsage ? {
            input: response.tokenUsage.input,
            output: response.tokenUsage.output,
          } : undefined,
        },
      };
      
      this.logger.debug(`Analysis completed for content with ${pageSignals.content.wordCount} words`);
      
      return resultWithLLMData;
    } catch (error) {
      this.logger.error('Error in unified KPI analysis:', error);
      throw new Error(`Unified KPI analysis failed: ${error.message}`);
    }
  }

  /**
   * Build the unified prompt template
   */
  private buildUnifiedPrompt(
    pageSignals: PageSignals, 
    cleanContent: string, 
    context: AnalysisContext
  ): string {
    return `You are an expert content analyst. Analyze this webpage and score it across 5 dimensions (0-100 each).

PRE-EXTRACTED SIGNALS:
${JSON.stringify(pageSignals, null, 2)}

RAW CONTENT (truncated):
${cleanContent}

BRAND CONTEXT:
- Brand: ${context.brandName}
- Key attributes: ${context.keyBrandAttributes.join(', ')}
- Competitors: ${context.competitors.join(', ')}

SCORING CRITERIA:

AUTHORITY (0-100):
- 20: No authority signals
- 40: Little trust; generic links; vague author  
- 60: Moderate authority OR 1 credible citation
- 80: Named expert author + domain authority OR 2+ citations
- 100: High-authority domain + credentialed author + 2+ citations

FRESHNESS (0-100):
- 20: No date signals
- 40: >365 days old
- 60: 181-365 days old  
- 80: 91-180 days old
- 100: ≤90 days old

STRUCTURE (0-100):
- 20: No meaningful structure or schema
- 40: Multiple H1s, messy HTML, minimal schema; avg >30 words/sentence
- 60: Some hierarchy issues, basic schema; avg ≤30 words/sentence
- 80: Minor gaps, partial schema; avg ≤25 words/sentence
- 100: Perfect hierarchy, full schema; avg ≤20 words/sentence

SNIPPET EXTRACTABILITY (0-100):
- 20: Wall of text; no lists/headings/Q&A
- 40: Long paragraphs, few lists/Q&A
- 60: Some lists/Q&A but large chunks dominate
- 80: At least one strong extractable block, minor issues
- 100: Multiple direct-answer blocks, ≤25-word sentences

BRAND ALIGNMENT (0-100):
- 20: Completely off-brand
- 40: Significant mismatch
- 60: Some outdated/missing elements
- 80: Minor tone/terminology drift
- 100: Flawless alignment

Return JSON:
{
  "scores": {
    "authority": number,
    "freshness": number,
    "structure": number,
    "brandAlignment": number
  },
  "details": {
    "authority": { "hasAuthor": boolean, "citationCount": number, "domainAuthority": "low|medium|high", "authorCredentials": boolean },
    "freshness": { "daysSinceUpdate": number, "hasDateSignals": boolean, "publishDate": "YYYY-MM-DD", "modifiedDate": "YYYY-MM-DD" },
    "structure": { "h1Count": number, "avgSentenceWords": number, "hasSchema": boolean, "headingHierarchyScore": number },
    "brand": { "brandMentions": number, "alignmentIssues": ["issue1", "issue2"], "consistencyScore": number, "missingKeywords": ["keyword1"] }
  },
  "issues": [
    {
      "dimension": "authority|freshness|structure|brand",
      "severity": "critical|high|medium|low",
      "description": "specific issue",
      "recommendation": "actionable fix"
    }
  ],
  "explanation": "Brief explanation of scoring rationale"
}`;
  }

  /**
   * Parse and validate LLM response
   */
  private parseUnifiedResponse(response: string): UnifiedKPIResult {
    try {
      this.logger.debug(`Raw LLM response: ${response.substring(0, 500)}...`);
      
      // Extract JSON from response if wrapped in text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      
      this.logger.debug(`Extracted JSON: ${jsonStr.substring(0, 500)}...`);
      
      const parsed = JSON.parse(jsonStr);
      
      // Validate against schema
      const result = validateUnifiedKPIResult(parsed);
      this.logger.log(`Successfully parsed and validated LLM response`);
      return result;
    } catch (error) {
      this.logger.error('Failed to parse LLM response:', { 
        error: error.message, 
        responseLength: response.length,
        responsePreview: response.substring(0, 200)
      });
      
      // Return fallback result
      return this.getFallbackResult();
    }
  }

  /**
   * Fallback result when LLM parsing fails
   */
  private getFallbackResult(): UnifiedKPIResult {
    return {
      scores: {
        authority: 50,
        freshness: 50,
        structure: 50,
        brandAlignment: 50,
      },
      details: {
        authority: {
          hasAuthor: false,
          citationCount: 0,
          domainAuthority: 'low',
          authorCredentials: false,
        },
        freshness: {
          hasDateSignals: false,
        },
        structure: {
          h1Count: 1,
          avgSentenceWords: 20,
          hasSchema: false,
          headingHierarchyScore: 50,
        },
        brand: {
          brandMentions: 0,
          alignmentIssues: ['Analysis failed - using fallback'],
          consistencyScore: 50,
          missingKeywords: [],
        },
      },
      issues: [
        {
          dimension: 'structure',
          severity: 'high',
          description: 'Analysis failed - fallback result used',
          recommendation: 'Retry analysis or check content format',
        },
      ],
      explanation: 'Analysis failed and fallback result was used. Please retry or check content format.',
    };
  }

  /**
   * Calculate estimated token usage for cost tracking
   */
  estimateTokenUsage(pageSignals: PageSignals, cleanContent: string): number {
    // Rough estimation: prompt template + signals + content
    const promptTemplate = 2000; // Base prompt tokens
    const signalsTokens = JSON.stringify(pageSignals).length / 4; // Rough estimation
    const contentTokens = cleanContent.length / 4; // Rough estimation
    const expectedResponse = 400; // Expected response tokens
    
    return Math.ceil(promptTemplate + signalsTokens + contentTokens + expectedResponse);
  }
}