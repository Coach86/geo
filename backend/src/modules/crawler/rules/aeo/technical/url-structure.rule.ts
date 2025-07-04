import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

@Injectable()
export class UrlStructureRule extends BaseAEORule {
  constructor() {
    super(
      'url_structure',
      'URL Structure & Optimization',
      'TECHNICAL' as Category,
      {
        impactScore: 2, // Medium impact
        pageTypes: [], // Applies to all page types
        isDomainLevel: false
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 100;
    let issues = 0;
    const scoreBreakdown: { component: string; points: number }[] = [];

    try {
      const urlObj = new URL(url);
      
      // Start with perfect score
      scoreBreakdown.push({ component: 'Base score', points: 100 });

      // Check URL length
      const urlLength = url.length;
      if (urlLength > 200) {
        score -= 20;
        issues++;
        scoreBreakdown.push({ component: 'URL too long', points: -20 });
        evidence.push(EvidenceHelper.error(`URL too long (${urlLength} chars) - should be under 200 characters`, { score: -20 }));
      } else if (urlLength > 100) {
        score -= 10;
        issues++;
        scoreBreakdown.push({ component: 'URL lengthy', points: -10 });
        evidence.push(EvidenceHelper.warning(`URL is lengthy (${urlLength} chars) - consider shortening`, { score: -10 }));
      } else {
        evidence.push(EvidenceHelper.success(`URL length is good (${urlLength} chars)`, {
          target: 'Optimal URL length under 100 characters'
        }));
      }

      // Check for HTTPS
      if (urlObj.protocol !== 'https:') {
        score -= 30;
        issues++;
        scoreBreakdown.push({ component: 'No HTTPS', points: -30 });
        evidence.push(EvidenceHelper.error('Not using HTTPS protocol', { score: -30 }));
      } else {
        evidence.push(EvidenceHelper.success('Using secure HTTPS protocol'));
      }

      // Check URL structure and readability
      const path = urlObj.pathname;

      // Check for readable, descriptive URLs
      if (this.isDescriptiveUrl(path)) {
        // Extract descriptive words from the URL path
        const segments = path.replace(/^\/|\/$/g, '').split('/');
        const descriptiveWords = segments.flatMap(segment => 
          segment.split('-').filter(word => word.length > 2)
        );
        
        evidence.push(EvidenceHelper.success('URL uses descriptive, readable words', {
          code: descriptiveWords.slice(0, 8).join(', ') + (descriptiveWords.length > 8 ? '...' : ''),
          target: 'Descriptive URLs improve user experience and SEO'
        }));
      } else {
        score -= 15;
        issues++;
        scoreBreakdown.push({ component: 'Non-descriptive URL', points: -15 });
        evidence.push(EvidenceHelper.warning('URL could be more descriptive', { score: -15 }));
      }

      // Check for special characters and encoding
      const specialCharsIssues = this.checkSpecialCharacters(path);
      if (specialCharsIssues.length > 0) {
        const penalty = 10 * specialCharsIssues.length;
        score -= penalty;
        issues += specialCharsIssues.length;
        scoreBreakdown.push({ component: 'Special character issues', points: -penalty });
        specialCharsIssues.forEach(issue => evidence.push(issue));
      } else {
        evidence.push(EvidenceHelper.success('No problematic special characters in URL'));
      }

      // Check for keyword optimization
      const keywordOptimization = this.checkKeywordOptimization(path);
      if (keywordOptimization.optimized) {
        evidence.push(EvidenceHelper.success('URL appears keyword-optimized', {
          target: 'Keyword-optimized URLs improve search visibility'
        }));
      } else {
        evidence.push(EvidenceHelper.warning('URL could be more keyword-optimized'));
        if (keywordOptimization.suggestion) {
          recommendations.push(keywordOptimization.suggestion);
        }
      }

      // Check URL hierarchy
      const hierarchyCheck = this.checkUrlHierarchy(path);
      if (hierarchyCheck.isGood) {
        evidence.push(EvidenceHelper.success('Clear URL hierarchy/structure', {
          target: 'Logical URL structure helps navigation and indexing'
        }));
      } else {
        score -= 10;
        scoreBreakdown.push({ component: 'Poor URL hierarchy', points: -10 });
        evidence.push(EvidenceHelper.warning(`${hierarchyCheck.issue}`, { score: -10 }));
      }

      // Check for parameters
      const params = Array.from(urlObj.searchParams.keys());
      if (params.length > 3) {
        score -= 15;
        issues++;
        scoreBreakdown.push({ component: 'Too many URL parameters', points: -15 });
        evidence.push(EvidenceHelper.warning(`Too many URL parameters (${params.length}) - consider cleaner URLs`, { score: -15 }));
      } else if (params.length > 0) {
        evidence.push(EvidenceHelper.warning(`URL has ${params.length} parameter(s): ${params.join(', ')}`));
      }

      // Check for trailing slash consistency
      if (path !== '/' && path.endsWith('/')) {
        evidence.push(EvidenceHelper.info('Has trailing slash'));
        recommendations.push('Ensure consistency with trailing slashes across site');
      }

      // Check for file extensions
      const hasFileExtension = /\.(html|htm|php|asp|jsp)$/i.test(path);
      if (hasFileExtension) {
        score -= 5;
        scoreBreakdown.push({ component: 'File extension in URL', points: -5 });
        evidence.push(EvidenceHelper.warning('URL includes file extension - consider extension-less URLs', { score: -5 }));
      }

      // Final score adjustment
      score = Math.max(0, Math.min(100, score));

      if (score >= 80) {
        evidence.push(EvidenceHelper.info('◐ Good URL structure with minor improvements possible'));
      } else if (score >= 60) {
        evidence.push(EvidenceHelper.warning('Moderate URL structure - several improvements recommended'));
      } else {
        evidence.push(EvidenceHelper.warning('Poor URL structure - significant improvements needed'));
      }

    } catch (error) {
      evidence.push(EvidenceHelper.info(`Error evaluating URL structure: ${error.message}`));
      score = 0;
    }

    // Add score calculation breakdown
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, undefined, undefined, recommendations);
  }

  private isDescriptiveUrl(path: string): boolean {
    // Remove leading/trailing slashes and split
    const segments = path.replace(/^\/|\/$/g, '').split('/');

    // Check if segments use readable words
    const readablePattern = /^[a-z0-9-]+$/i;
    const hasReadableSegments = segments.every(segment =>
      readablePattern.test(segment) && segment.length > 0
    );

    // Check if using hyphens for word separation (not underscores or camelCase)
    const usesHyphens = segments.some(segment => segment.includes('-'));

    return hasReadableSegments && (segments.length === 0 || usesHyphens || segments.every(s => s.length < 15));
  }

  private checkSpecialCharacters(path: string): EvidenceItem[] {
    const issues: EvidenceItem[] = [];

    // Check for spaces (should be encoded)
    if (path.includes(' ')) {
      issues.push(EvidenceHelper.error('URL contains unencoded spaces', { score: -10 }));
    }

    // Check for underscores
    if (path.includes('_')) {
      issues.push(EvidenceHelper.warning('URL uses underscores - hyphens are preferred', { score: -10 }));
    }

    // Check for uppercase letters
    if (/[A-Z]/.test(path)) {
      issues.push(EvidenceHelper.warning('URL contains uppercase letters - use lowercase', { score: -10 }));
    }

    // Check for special characters that should be avoided
    const problematicChars = /[!@#$%^&*()+=\[\]{};:'"<>?\\|]/;
    if (problematicChars.test(path)) {
      issues.push(EvidenceHelper.error('URL contains special characters that should be avoided', { score: -10 }));
    }

    // Check for double slashes
    if (path.includes('//')) {
      issues.push(EvidenceHelper.warning('URL contains double slashes', { score: -10 }));
    }

    return issues;
  }

  private checkKeywordOptimization(path: string): { optimized: boolean; suggestion: string } {
    const segments = path.toLowerCase().replace(/^\/|\/$/g, '').split('/');

    // Skip root path
    if (segments.length === 0 || (segments.length === 1 && segments[0] === '')) {
      return { optimized: true, suggestion: '' };
    }

    // Check for keyword stuffing
    const wordCounts = new Map<string, number>();
    segments.forEach(segment => {
      const words = segment.split('-');
      words.forEach(word => {
        if (word.length > 2) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });
    });

    const hasKeywordStuffing = Array.from(wordCounts.values()).some(count => count > 2);
    if (hasKeywordStuffing) {
      return {
        optimized: false,
        suggestion: 'Avoid keyword repetition in URL structure'
      };
    }

    // Check if URL is too generic
    const genericTerms = ['page', 'post', 'item', 'content', 'view'];
    const hasGenericTerms = segments.some(segment =>
      genericTerms.some(term => segment === term)
    );

    if (hasGenericTerms) {
      return {
        optimized: false,
        suggestion: 'Replace generic terms with descriptive keywords'
      };
    }

    return { optimized: true, suggestion: '' };
  }

  private checkUrlHierarchy(path: string): { isGood: boolean; issue?: string } {
    const segments = path.replace(/^\/|\/$/g, '').split('/').filter(s => s.length > 0);

    // Check depth
    if (segments.length > 5) {
      return {
        isGood: false,
        issue: `URL hierarchy too deep (${segments.length} levels) - aim for 3-4 levels max`
      };
    }

    // Check for logical hierarchy
    if (segments.length > 1) {
      // Check if segments get more specific (longer) as we go deeper
      let previousLength = segments[0].length;
      let getsMoreSpecific = true;

      for (let i = 1; i < segments.length; i++) {
        if (segments[i].length < previousLength * 0.5) {
          getsMoreSpecific = false;
          break;
        }
      }

      if (!getsMoreSpecific && segments.length > 2) {
        return {
          isGood: false,
          issue: 'URL hierarchy seems illogical - ensure parent-child relationship'
        };
      }
    }

    return { isGood: true };
  }
}
