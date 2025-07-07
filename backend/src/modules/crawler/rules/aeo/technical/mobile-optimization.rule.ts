import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';


// Evidence topics for this rule
enum MobileOptimizationTopic {
  VIEWPORT_CONFIG = 'Viewport Config',
  MOBILE = 'Mobile',
  NO_VIEWPORT = 'No Viewport'
}

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
    const scoreBreakdown: { component: string; points: number }[] = [
      { component: 'Base score', points: 100 }
    ];
    
    // Add base score evidence
    evidence.push(EvidenceHelper.base(100));
    
    const html = content.html || '';
    
    // Check viewport meta tag
    const viewportRegex = /<meta[^>]*name=["']viewport["'][^>]*>/i;
    const viewportMatch = html.match(viewportRegex);
    const hasViewport = !!viewportMatch;
    
    if (hasViewport) {
      evidence.push(EvidenceHelper.success(MobileOptimizationTopic.VIEWPORT_CONFIG, 'Viewport meta tag present', { 
        score: 0, 
        target: 'Essential for mobile responsiveness' 
      }));
      const viewportContent = viewportMatch[0].match(/content=["']([^"']+)["']/i);
      if (viewportContent) {
        const contentValue = viewportContent[1];
        if (contentValue.includes('width=device-width')) {
          evidence.push(EvidenceHelper.success(MobileOptimizationTopic.VIEWPORT_CONFIG, 'Responsive viewport configuration detected', { score: 0 }));
          // No penalty - keep base score
        } else {
          evidence.push(EvidenceHelper.warning(MobileOptimizationTopic.VIEWPORT_CONFIG, 'Viewport tag present but may not be optimally configured', { 
            score: -10, 
            target: 'Add width=device-width for optimal mobile experience'
          }));
          score -= 10;
          scoreBreakdown.push({ component: 'Sub-optimal viewport configuration', points: -10 });
        }
      }
    } else {
      evidence.push(EvidenceHelper.error(MobileOptimizationTopic.NO_VIEWPORT, 'No viewport meta tag found', { 
        score: -30, 
        target: 'Add viewport meta tag for mobile responsiveness'
      }));
      score -= 30;
      scoreBreakdown.push({ component: 'Missing viewport meta tag', points: -30 });
    }
    
    // Check for responsive design indicators
    const responsiveIndicators = [
      /@media[^{]+\((?:max-|min-)?width/i,
      /class=["'][^"']*(?:col-|grid-|flex-|responsive|mobile)[^"']*["']/i,
      /(?:flex|grid)-(?:wrap|flow|template)/i
    ];
    
    const responsiveMatches = responsiveIndicators.filter(regex => regex.test(html));
    if (responsiveMatches.length > 0) {
      evidence.push(EvidenceHelper.success(MobileOptimizationTopic.VIEWPORT_CONFIG, `Found ${responsiveMatches.length} responsive design indicators`, { score: 0 }));
      // No penalty - keep base score
    } else {
      evidence.push(EvidenceHelper.warning(MobileOptimizationTopic.VIEWPORT_CONFIG, 'No responsive design patterns detected', { 
        score: -20, 
        target: 'Add CSS media queries and responsive design patterns'
      }));
      score -= 20;
      scoreBreakdown.push({ component: 'Missing responsive design patterns', points: -20 });
    }
    
    // Check Core Web Vitals if available
    if (content.performanceMetrics) {
      const { lcp, fid, cls } = content.performanceMetrics;
      let cwvScore = 0;
      let cwvCount = 0;
      
      if (lcp !== undefined) {
        cwvCount++;
        if (lcp <= 2500) {
          evidence.push(EvidenceHelper.success(MobileOptimizationTopic.VIEWPORT_CONFIG, `LCP is good (${lcp}ms)`, {
            score: 0,
            target: 'Good LCP performance'
          }));
          cwvScore++;
        } else if (lcp <= 4000) {
          evidence.push(EvidenceHelper.warning(MobileOptimizationTopic.VIEWPORT_CONFIG, `LCP needs improvement (${lcp}ms)`, {
            target: 'Optimize LCP to ≤2.5s for better mobile experience'
          }));
        } else {
          evidence.push(EvidenceHelper.error(MobileOptimizationTopic.VIEWPORT_CONFIG, `LCP is poor (${lcp}ms)`, {
            target: 'Critical: Optimize LCP to ≤2.5s'
          }));
        }
      }
      
      if (fid !== undefined) {
        cwvCount++;
        if (fid <= 100) {
          evidence.push(EvidenceHelper.success(MobileOptimizationTopic.VIEWPORT_CONFIG, `FID is good (${fid}ms)`, {
            score: 0,
            target: 'Good FID performance'
          }));
          cwvScore++;
        } else if (fid <= 300) {
          evidence.push(EvidenceHelper.warning(MobileOptimizationTopic.VIEWPORT_CONFIG, `FID needs improvement (${fid}ms)`, {
            target: 'Optimize FID to ≤100ms for better interactivity'
          }));
        } else {
          evidence.push(EvidenceHelper.error(MobileOptimizationTopic.VIEWPORT_CONFIG, `FID is poor (${fid}ms)`, {
            target: 'Critical: Optimize FID to ≤100ms'
          }));
        }
      }
      
      if (cls !== undefined) {
        cwvCount++;
        if (cls <= 0.1) {
          evidence.push(EvidenceHelper.success(MobileOptimizationTopic.VIEWPORT_CONFIG, `CLS is good (${cls})`, {
            score: 0,
            target: 'Good CLS performance'
          }));
          cwvScore++;
        } else if (cls <= 0.25) {
          evidence.push(EvidenceHelper.warning(MobileOptimizationTopic.VIEWPORT_CONFIG, `CLS needs improvement (${cls})`, {
            target: 'Optimize CLS to ≤0.1 for better visual stability'
          }));
        } else {
          evidence.push(EvidenceHelper.error(MobileOptimizationTopic.VIEWPORT_CONFIG, `CLS is poor (${cls})`, {
            target: 'Critical: Optimize CLS to ≤0.1'
          }));
        }
      }
      
      if (cwvCount > 0) {
        const cwvPercentage = (cwvScore / cwvCount) * 100;
        if (cwvPercentage < 50) {
          score -= 30;
          scoreBreakdown.push({ component: 'Poor Core Web Vitals', points: -30 });
        } else if (cwvPercentage < 100) {
          score -= 15;
          scoreBreakdown.push({ component: 'Moderate Core Web Vitals', points: -15 });
        }
        // No penalty for good Core Web Vitals
      }
    } else {
      evidence.push(EvidenceHelper.info(MobileOptimizationTopic.VIEWPORT_CONFIG, 'Core Web Vitals data not available for analysis', {
        target: 'Enable performance monitoring for Core Web Vitals analysis'
      }));
      score -= 30;
      scoreBreakdown.push({ component: 'Core Web Vitals data unavailable', points: -30 });
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
      const fontPenalty = Math.min(20, tooSmallFonts * 5);
      evidence.push(EvidenceHelper.warning(MobileOptimizationTopic.VIEWPORT_CONFIG, `Found ${tooSmallFonts} instances of fonts smaller than 12px`, {
        score: -fontPenalty,
        target: 'Use fonts ≥12px for better mobile readability'
      }));
      score -= fontPenalty;
      scoreBreakdown.push({ component: 'Small font sizes penalty', points: -fontPenalty });
    } else {
      evidence.push(EvidenceHelper.success(MobileOptimizationTopic.MOBILE, 'Font sizes appear adequate for mobile', {
        score: 0,
        target: 'Good font readability for mobile'
      }));
      // No penalty for good font sizes
    }
    
    // Check for horizontal scrolling indicators
    const hasOverflowX = /overflow-x:\s*scroll|overflow-x:\s*auto/i.test(html);
    const hasWidthOver100 = /width:\s*\d{4,}px|width:\s*[1-9]\d{2,}%/i.test(html);
    
    if (hasOverflowX || hasWidthOver100) {
      evidence.push(EvidenceHelper.warning(MobileOptimizationTopic.VIEWPORT_CONFIG, 'Potential horizontal scrolling detected', {
        score: -15,
        target: 'Eliminate horizontal scrolling for better mobile UX'
      }));
      score -= 15;
      scoreBreakdown.push({ component: 'Horizontal scrolling penalty', points: -15 });
    } else {
      evidence.push(EvidenceHelper.success(MobileOptimizationTopic.VIEWPORT_CONFIG, 'No horizontal scrolling detected', {
        score: 0,
        target: 'Good mobile layout without horizontal scrolling'
      }));
      // No penalty for good layout
    }
    
    // Final scoring adjustment
    score = Math.max(0, score);
    
    // Add standard score calculation explanation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    if (score >= 80) {
      evidence.push(EvidenceHelper.info(MobileOptimizationTopic.MOBILE, '◐ Mobile optimization appears to be well implemented'));
    } else if (score >= 60) {
      evidence.push(EvidenceHelper.warning(MobileOptimizationTopic.MOBILE, 'Mobile optimization needs improvement'));
    } else if (score >= 40) {
      evidence.push(EvidenceHelper.warning(MobileOptimizationTopic.MOBILE, 'Significant mobile optimization issues'));
    } else {
      evidence.push(EvidenceHelper.error(MobileOptimizationTopic.MOBILE, 'Critical mobile optimization problems'));
    }
    
    return this.createResult(score, evidence, [], {}, recommendations);
  }
}