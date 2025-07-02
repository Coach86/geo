import { Injectable, Logger } from '@nestjs/common';
import { BaseBrandRule } from './base-brand.rule';
import { RuleContext, RuleResult, RuleExecutionScope } from '../interfaces/rule.interface';
import { LlmProvider } from '../../../llm/interfaces/llm-provider.enum';
import { HYBRID_CONSTANTS } from '../../config/scoring-constants';

@Injectable()
export class KeywordAlignmentRule extends BaseBrandRule {
  
  id = 'brand-keyword-alignment';
  name = 'Brand Keyword Alignment';
  description = 'Evaluates how well brand values and attributes are reflected in the content using AI analysis';
  applicability = { scope: 'all' as const };
  executionScope: RuleExecutionScope = 'page';
  priority = 9;
  weight = 0.6;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { cleanContent, projectContext, trackedLLMService, url } = context;
    const keyBrandAttributes = projectContext.keyBrandAttributes || [];
    const brandName = projectContext.brandName;
    
    const issues: any[] = [];
    const evidence = [];
    let score = 0;

    if (keyBrandAttributes.length === 0) {
      // No keywords defined, give neutral score
      score = 70;
      evidence.push('No brand keywords defined for evaluation');
      return this.createResult(score, 100, evidence, { keyBrandAttributes }, issues);
    }

    // If no LLM service available, fallback to basic analysis
    if (!trackedLLMService) {
      this.logger.warn('No LLM service available for brand alignment analysis');
      score = 50;
      evidence.push('Unable to perform AI-based brand alignment analysis');
      issues.push(this.createIssue(
        'medium',
        'AI analysis unavailable',
        'Enable AI analysis for more accurate brand alignment scoring'
      ));
      return this.createResult(score, 100, evidence, { keyBrandAttributes }, issues);
    }

    try {
      // Use AI to analyze if brand values are reflected in content
      const brandAlignmentPrompt = `Analyze if the following brand values and attributes are genuinely reflected in the content below.

Brand: ${brandName}
Key Brand Attributes: ${keyBrandAttributes.join(', ')}

Content to analyze:
${cleanContent.substring(0, 3000)}

Please evaluate:
1. How well does the content reflect each brand attribute?
2. Are the brand values authentically integrated or just superficially mentioned?
3. Does the content communicate the brand's core values effectively?

Respond with:
ALIGNMENT_SCORE: [0-100]
ATTRIBUTES_REFLECTED: [list of attributes that are well-reflected]
MISSING_ATTRIBUTES: [list of attributes that are poorly reflected or missing]
AUTHENTICITY: [HIGH/MEDIUM/LOW]
BRIEF_ANALYSIS: [2-3 sentences explaining the alignment]`;

      const response = await trackedLLMService.call(
        url,
        'brand_alignment_analysis',
        LlmProvider.OpenAILangChain,
        brandAlignmentPrompt,
        {
          model: HYBRID_CONSTANTS.LLM.MODEL,
          temperature: HYBRID_CONSTANTS.LLM.TEMPERATURE,
          maxTokens: HYBRID_CONSTANTS.LLM.MAX_TOKENS,
        }
      );

      // Parse the AI response
      const alignmentData = this.parseBrandAlignmentResponse(response.text);
      score = alignmentData.score;

      // Add evidence based on AI analysis
      evidence.push(alignmentData.analysis);
      evidence.push(`Brand authenticity: ${alignmentData.authenticity}`);
      
      if (alignmentData.attributesReflected.length > 0) {
        evidence.push(`Well-reflected attributes: ${alignmentData.attributesReflected.join(', ')}`);
      }
      
      if (alignmentData.missingAttributes.length > 0) {
        evidence.push(`Poorly reflected attributes: ${alignmentData.missingAttributes.join(', ')}`);
      }

      // Generate issues based on score and missing attributes
      if (score < 50) {
        issues.push(this.createIssue(
          'high',
          'Brand values poorly reflected in content',
          `Focus on authentically integrating these brand attributes: ${alignmentData.missingAttributes.join(', ')}`
        ));
      } else if (score < 70) {
        issues.push(this.createIssue(
          'medium',
          'Brand alignment needs improvement',
          'Strengthen the connection between content and brand values'
        ));
      } else if (score < 85) {
        issues.push(this.createIssue(
          'low',
          'Some brand attributes could be better emphasized',
          'Consider highlighting brand values more prominently'
        ));
      }

      // Add specific issues for low authenticity
      if (alignmentData.authenticity === 'LOW') {
        issues.push(this.createIssue(
          'medium',
          'Brand mentions feel superficial',
          'Integrate brand values more naturally and authentically into the content'
        ));
      }

      return this.createResult(
        score,
        100,
        evidence,
        {
          keyBrandAttributes,
          attributesReflected: alignmentData.attributesReflected,
          missingAttributes: alignmentData.missingAttributes,
          authenticity: alignmentData.authenticity,
          aiAnalysis: alignmentData.analysis
        },
        issues
      );

    } catch (error) {
      this.logger.error('Error in brand alignment AI analysis:', error);
      // Fallback to basic scoring on error
      score = 50;
      evidence.push('AI analysis failed - using fallback scoring');
      issues.push(this.createIssue(
        'medium',
        'Brand alignment analysis incomplete',
        'AI analysis encountered an error'
      ));
      
      return this.createResult(score, 100, evidence, { keyBrandAttributes, error: error.message }, issues);
    }
  }

  /**
   * Parse the brand alignment response from AI
   */
  private parseBrandAlignmentResponse(response: string): {
    score: number;
    attributesReflected: string[];
    missingAttributes: string[];
    authenticity: string;
    analysis: string;
  } {
    try {
      const lines = response.split('\n');
      let score = 50;
      let attributesReflected: string[] = [];
      let missingAttributes: string[] = [];
      let authenticity = 'MEDIUM';
      let analysis = '';

      for (const line of lines) {
        if (line.startsWith('ALIGNMENT_SCORE:')) {
          const scoreMatch = line.match(/\d+/);
          if (scoreMatch) {
            score = Math.min(100, Math.max(0, parseInt(scoreMatch[0])));
          }
        } else if (line.startsWith('ATTRIBUTES_REFLECTED:')) {
          const attrs = line.substring('ATTRIBUTES_REFLECTED:'.length).trim();
          attributesReflected = attrs
            .split(',')
            .map(a => a.trim())
            .filter(a => a.length > 0);
        } else if (line.startsWith('MISSING_ATTRIBUTES:')) {
          const attrs = line.substring('MISSING_ATTRIBUTES:'.length).trim();
          missingAttributes = attrs
            .split(',')
            .map(a => a.trim())
            .filter(a => a.length > 0);
        } else if (line.startsWith('AUTHENTICITY:')) {
          const auth = line.substring('AUTHENTICITY:'.length).trim().toUpperCase();
          if (['HIGH', 'MEDIUM', 'LOW'].includes(auth)) {
            authenticity = auth;
          }
        } else if (line.startsWith('BRIEF_ANALYSIS:')) {
          analysis = line.substring('BRIEF_ANALYSIS:'.length).trim();
        }
      }

      // If no analysis provided, create one
      if (!analysis) {
        analysis = `Brand alignment score: ${score}/100`;
      }

      return {
        score,
        attributesReflected,
        missingAttributes,
        authenticity,
        analysis
      };
    } catch (error) {
      this.logger.error('Error parsing brand alignment response:', error);
      // Return default values on parse error
      return {
        score: 50,
        attributesReflected: [],
        missingAttributes: [],
        authenticity: 'MEDIUM',
        analysis: 'Unable to parse AI response'
      };
    }
  }
}