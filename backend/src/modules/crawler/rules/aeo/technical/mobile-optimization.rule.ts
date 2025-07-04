import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

@Injectable()
export class MobileOptimizationRule extends BaseAEORule {
  constructor() {
    super(
      'mobile_optimization',
      'Mobile Optimization',
      'TECHNICAL' as Category,
      {
        impactScore: 2,
        pageTypes: [],
        isDomainLevel: true
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 100;
    const scoreBreakdown: Array<{item: string, target: number, actual: number}> = [];
    
    const html = content.html || '';
    
    // Check viewport meta tag
    const viewportRegex = /<meta[^>]*name=["']viewport["'][^>]*>/i;
    const viewportMatch = html.match(viewportRegex);
    const hasViewport = !!viewportMatch;
    
    if (hasViewport) {
      evidence.push(EvidenceHelper.success('Viewport meta tag present'));
      const viewportContent = viewportMatch[0].match(/content=["']([^"']+)["']/i);
      if (viewportContent) {
        const contentValue = viewportContent[1];
        if (contentValue.includes('width=device-width')) {
          evidence.push(EvidenceHelper.success('Responsive viewport configuration detected', { score: 30 }));
          scoreBreakdown.push({item: 'Viewport configuration', target: 30, actual: 30});
        } else {
          evidence.push(EvidenceHelper.warning('Viewport tag present but may not be optimally configured', { score: -10 }));
          score -= 10;
          scoreBreakdown.push({item: 'Viewport configuration', target: 30, actual: 20});
        }
      }
    } else {
      evidence.push(EvidenceHelper.error('No viewport meta tag found', { score: -30 }));
      score -= 30;
      scoreBreakdown.push({item: 'Viewport configuration', target: 30, actual: 0});
    }
    
    // Check for responsive design indicators
    const responsiveIndicators = [
      /@media[^{]+\((?:max-|min-)?width/i,
      /class=["'][^"']*(?:col-|grid-|flex-|responsive|mobile)[^"']*["']/i,
      /(?:flex|grid)-(?:wrap|flow|template)/i
    ];
    
    const responsiveMatches = responsiveIndicators.filter(regex => regex.test(html));
    if (responsiveMatches.length > 0) {
      evidence.push(EvidenceHelper.success(`Found ${responsiveMatches.length} responsive design indicators`, { score: 20 }));
      scoreBreakdown.push({item: 'Responsive design patterns', target: 20, actual: 20});
    } else {
      evidence.push(EvidenceHelper.warning('No responsive design patterns detected', { score: -20 }));
      score -= 20;
      scoreBreakdown.push({item: 'Responsive design patterns', target: 20, actual: 0});
    }
    
    // Check Core Web Vitals if available
    if (content.performanceMetrics) {
      const { lcp, fid, cls } = content.performanceMetrics;
      let cwvScore = 0;
      let cwvCount = 0;
      
      if (lcp !== undefined) {
        cwvCount++;
        if (lcp <= 2500) {
          evidence.push(EvidenceHelper.success(`LCP is good (${lcp}ms)`));
          cwvScore++;
        } else if (lcp <= 4000) {
          evidence.push(EvidenceHelper.warning(`LCP needs improvement (${lcp}ms)`));
        } else {
          evidence.push(EvidenceHelper.error(`LCP is poor (${lcp}ms)`));
        }
      }
      
      if (fid !== undefined) {
        cwvCount++;
        if (fid <= 100) {
          evidence.push(EvidenceHelper.success(`FID is good (${fid}ms)`));
          cwvScore++;
        } else if (fid <= 300) {
          evidence.push(EvidenceHelper.warning(`FID needs improvement (${fid}ms)`));
        } else {
          evidence.push(EvidenceHelper.error(`FID is poor (${fid}ms)`));
        }
      }
      
      if (cls !== undefined) {
        cwvCount++;
        if (cls <= 0.1) {
          evidence.push(EvidenceHelper.success(`CLS is good (${cls})`));
          cwvScore++;
        } else if (cls <= 0.25) {
          evidence.push(EvidenceHelper.warning(`CLS needs improvement (${cls})`));
        } else {
          evidence.push(EvidenceHelper.error(`CLS is poor (${cls})`));
        }
      }
      
      if (cwvCount > 0) {
        const cwvPercentage = (cwvScore / cwvCount) * 100;
        if (cwvPercentage < 50) {
          score -= 30;
          scoreBreakdown.push({item: 'Core Web Vitals', target: 30, actual: 0});
        } else if (cwvPercentage < 100) {
          score -= 15;
          scoreBreakdown.push({item: 'Core Web Vitals', target: 30, actual: 15});
        } else {
          scoreBreakdown.push({item: 'Core Web Vitals', target: 30, actual: 30});
        }
      }
    } else {
      evidence.push(EvidenceHelper.info('Core Web Vitals data not available for analysis'));
      scoreBreakdown.push({item: 'Core Web Vitals', target: 30, actual: 0});
    }
    
    // Check for font sizes (simplified check)
    const smallFontMatches = html.match(/font-size:\s*(\d+(?:\.\d+)?)(px|pt|em|rem)/gi) || [];
    let tooSmallFonts = 0;
    
    smallFontMatches.forEach((match: string) => {
      const sizeMatch = match.match(/(\d+(?:\.\d+)?)(px|pt|em|rem)/i);
      if (sizeMatch) {
        const size = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toLowerCase();
        
        // Convert to approximate pixel equivalent
        let pxSize = size;
        if (unit === 'pt') pxSize = size * 1.333;
        else if (unit === 'em' || unit === 'rem') pxSize = size * 16; // assuming 16px base
        
        if (pxSize < 12) {
          tooSmallFonts++;
        }
      }
    });
    
    if (tooSmallFonts > 0) {
      evidence.push(EvidenceHelper.warning(`Found ${tooSmallFonts} instances of fonts smaller than 12px`));
      const fontPenalty = Math.min(20, tooSmallFonts * 5);
      score -= fontPenalty;
      scoreBreakdown.push({item: 'Font readability', target: 20, actual: 20 - fontPenalty});
    } else {
      evidence.push(EvidenceHelper.success('Font sizes appear adequate for mobile'));
      scoreBreakdown.push({item: 'Font readability', target: 20, actual: 20});
    }
    
    // Check for horizontal scrolling indicators
    const hasOverflowX = /overflow-x:\s*scroll|overflow-x:\s*auto/i.test(html);
    const hasWidthOver100 = /width:\s*\d{4,}px|width:\s*[1-9]\d{2,}%/i.test(html);
    
    if (hasOverflowX || hasWidthOver100) {
      evidence.push(EvidenceHelper.warning('Potential horizontal scrolling detected'));
      score -= 15;
      scoreBreakdown.push({item: 'No horizontal scrolling', target: 15, actual: 0});
    } else {
      scoreBreakdown.push({item: 'No horizontal scrolling', target: 15, actual: 15});
    }
    
    // Final scoring adjustment
    score = Math.max(0, score);
    
    // Add score breakdown
    evidence.push(EvidenceHelper.info('Score Breakdown:'));
    scoreBreakdown.forEach(item => {
      const percentage = item.target > 0 ? Math.round((item.actual / item.target) * 100) : 0;
      const icon = percentage >= 100 ? '✓' : percentage >= 50 ? '◐' : '✗';
      evidence.push(EvidenceHelper.info(`${icon} ${item.item}: ${item.actual}/${item.target} points (${percentage}%)`));
    });
    
    const totalTarget = scoreBreakdown.reduce((sum, item) => sum + item.target, 0);
    const totalActual = scoreBreakdown.reduce((sum, item) => sum + item.actual, 0);
    evidence.push(EvidenceHelper.info(`Total: ${totalActual}/${totalTarget} points = ${score}/100`));
    
    if (score >= 80) {
      evidence.push(EvidenceHelper.info('◐ Mobile optimization appears to be well implemented'));
    } else if (score >= 60) {
      evidence.push(EvidenceHelper.warning('Mobile optimization needs improvement'));
    } else if (score >= 40) {
      evidence.push(EvidenceHelper.warning('Significant mobile optimization issues'));
    } else {
      evidence.push(EvidenceHelper.error('Critical mobile optimization problems'));
    }
    
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100`));
    
    return this.createResult(score, evidence, [], {}, recommendations);
  }
}