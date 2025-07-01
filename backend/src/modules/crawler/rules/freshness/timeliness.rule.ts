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
    scope: 'category',
    categories: ['blog_article', 'news_article', 'documentation_help', 'product_page']
  };
  
  async evaluate(context: RuleContext): Promise<RuleResult> {
    try {
      const currentYear = new Date().getFullYear();
      const cleanContent = context.cleanContent.toLowerCase();
      
      // Check for temporal references
      const temporalAnalysis = this.analyzeTemporalReferences(cleanContent, currentYear);
      
      let score = 100; // Start with perfect score
      const evidence: string[] = [];
      const issues = [];
      
      // Penalize outdated references
      if (temporalAnalysis.outdatedReferences.length > 0) {
        score -= Math.min(temporalAnalysis.outdatedReferences.length * 10, 40);
        evidence.push(`Found ${temporalAnalysis.outdatedReferences.length} outdated references`);
        
        issues.push(this.createIssue(
          'medium',
          `Content contains outdated references (${temporalAnalysis.outdatedReferences.slice(0, 3).join(', ')})`,
          'Update content to reflect current information and remove outdated references'
        ));
      }
      
      // Boost for current references
      if (temporalAnalysis.currentReferences.length > 0) {
        evidence.push(`Found ${temporalAnalysis.currentReferences.length} current references`);
      } else {
        score -= 20; // Penalty for no current references
        evidence.push('No current year references found');
      }
      
      // Check for timeless content indicators
      if (temporalAnalysis.isTimeless) {
        score = Math.max(score, 80); // Timeless content gets at least 80%
        evidence.push('Content appears to be timeless/evergreen');
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
      currentReferences: [...new Set(currentReferences)],
      outdatedReferences: [...new Set(outdatedReferences)],
      isTimeless,
      indicators: [...new Set(indicators)]
    };
  }
}