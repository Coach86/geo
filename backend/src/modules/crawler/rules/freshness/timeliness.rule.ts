import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult, RuleDimension, RuleApplicability } from '../interfaces/rule.interface';

/**
 * Rule that evaluates content timeliness and relevance
 * Checks if content references current events, trends, or outdated information
 */
export class TimelinessRule extends BaseRule {
  id = 'timeliness';
  name = 'Content Timeliness & Relevance';
  dimension: RuleDimension = 'freshness';
  description = 'Evaluates if content references current information and avoids outdated references';
  priority = 80;
  weight = 0.2; // 20% of freshness score
  
  applicability: RuleApplicability = {
    scope: 'all' as const
  };
  
  async evaluate(context: RuleContext): Promise<RuleResult> {
    try {
      const currentYear = new Date().getFullYear();
      const cleanContent = context.cleanContent.toLowerCase();
      
      // Check for temporal references
      const temporalAnalysis = this.analyzeTemporalReferences(cleanContent, currentYear);
      
      let score = 0; // Start with 0
      const evidence: string[] = [];
      const issues = [];
      
      // Score based on content type and temporal references
      if (temporalAnalysis.isTimeless && temporalAnalysis.outdatedReferences.length === 0) {
        // Timeless content without outdated references
        score = 60; // Base score for timeless content
        evidence.push('Content appears to be timeless/evergreen');
        
        // Bonus for having some current references even in timeless content
        if (temporalAnalysis.currentReferences.length > 0) {
          score += 20;
          evidence.push(`Found ${temporalAnalysis.currentReferences.length} current references`);
        }
      } else {
        // Time-sensitive content - score based on current references
        if (temporalAnalysis.currentReferences.length >= 3) {
          score = 100;
          evidence.push(`Excellent timeliness: ${temporalAnalysis.currentReferences.length} current references found`);
        } else if (temporalAnalysis.currentReferences.length >= 2) {
          score = 80;
          evidence.push(`Good timeliness: ${temporalAnalysis.currentReferences.length} current references found`);
        } else if (temporalAnalysis.currentReferences.length === 1) {
          score = 60;
          evidence.push(`Some timeliness: 1 current reference found`);
        } else {
          score = 0;
          evidence.push('No current year references found');
          issues.push(this.createIssue(
            'high',
            'Content lacks temporal references',
            'Add current year references or recent updates to improve content freshness'
          ));
        }
      }
      
      // Penalize outdated references regardless of content type
      if (temporalAnalysis.outdatedReferences.length > 0) {
        const penalty = Math.min(temporalAnalysis.outdatedReferences.length * 20, 60);
        score = Math.max(0, score - penalty);
        evidence.push(`Found ${temporalAnalysis.outdatedReferences.length} outdated references (penalty: -${penalty})`);
        
        issues.push(this.createIssue(
          'medium',
          `Content contains outdated references (${temporalAnalysis.outdatedReferences.slice(0, 3).join(', ')})`,
          'Update content to reflect current information and remove outdated references'
        ));
      }
      
      const details = {
        currentReferences: temporalAnalysis.currentReferences.length,
        outdatedReferences: temporalAnalysis.outdatedReferences.length,
        isTimeless: temporalAnalysis.isTimeless,
        temporalIndicators: temporalAnalysis.indicators
      };
      
      return this.createResult(score, 100, evidence, details, issues);
      
    } catch (error) {
      this.logger.error('Error evaluating timeliness:', error);
      return this.createResult(
        80,
        100,
        ['Failed to analyze content timeliness'],
        { error: error.message }
      );
    }
  }
  
  /**
   * Analyze temporal references in content
   */
  private analyzeTemporalReferences(content: string, currentYear: number): {
    currentReferences: string[];
    outdatedReferences: string[];
    isTimeless: boolean;
    indicators: string[];
  } {
    const currentReferences: string[] = [];
    const outdatedReferences: string[] = [];
    const indicators: string[] = [];
    
    // Check for year references
    const yearPattern = /\b(20\d{2})\b/g;
    const yearMatches = content.match(yearPattern) || [];
    
    yearMatches.forEach(yearStr => {
      const year = parseInt(yearStr);
      if (year === currentYear || year === currentYear - 1) {
        currentReferences.push(yearStr);
      } else if (year < currentYear - 2 && year > 2000) {
        outdatedReferences.push(yearStr);
      }
    });
    
    // Check for outdated technology/version references
    const outdatedPatterns = [
      /windows\s*(xp|vista|7|8)/gi,
      /internet\s*explorer\s*[6-9]/gi,
      /flash\s*player/gi,
      /jquery\s*1\./gi,
      /angular\s*1\./gi,
      /php\s*5\./gi,
      /python\s*2\./gi,
      /java\s*[6-7]/gi
    ];
    
    outdatedPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        outdatedReferences.push(...matches);
        indicators.push('outdated technology');
      }
    });
    
    // Check for current technology/trends
    const currentPatterns = [
      new RegExp(`\\b${currentYear}\\s*(update|version|release|edition)`, 'gi'),
      /latest\s*(version|update|release)/gi,
      /recently\s*(updated|released|launched)/gi,
      /new\s*in\s*\d{4}/gi
    ];
    
    currentPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        currentReferences.push(...matches);
        indicators.push('current references');
      }
    });
    
    // Check for timeless content indicators
    const timelessPatterns = [
      /best\s*practices/gi,
      /fundamental/gi,
      /principle/gi,
      /guide\s*to/gi,
      /how\s*to/gi,
      /introduction\s*to/gi,
      /basics\s*of/gi
    ];
    
    let timelessScore = 0;
    timelessPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        timelessScore++;
        indicators.push('timeless content');
      }
    });
    
    const isTimeless = timelessScore >= 3 && outdatedReferences.length === 0;
    
    return {
      currentReferences: Array.from(new Set(currentReferences)),
      outdatedReferences: Array.from(new Set(outdatedReferences)),
      isTimeless,
      indicators: Array.from(new Set(indicators))
    };
  }
}