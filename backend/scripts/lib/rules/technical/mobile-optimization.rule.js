const { BaseRule, EvidenceHelper } = require('../base-rule');

class MobileOptimizationRule extends BaseRule {
  constructor() {
    super(
      'mobile_optimization',
      'Mobile Optimization',
      'technical',
      {
        impactScore: 2, // Medium-high impact
        pageTypes: [], // Applies to all page types
        isDomainLevel: false
      }
    );
  }

  async evaluate(url, content) {
    const evidence = [];
    const issues = [];
    const recommendations = [];
    let score = 0;
    const scoreBreakdown = [];
    const $ = content.$;

    try {
      // Check viewport meta tag
      const viewport = $('meta[name="viewport"]').attr('content');
      if (viewport) {
        score += 40;
        scoreBreakdown.push({ component: 'Viewport meta tag', points: 40 });
        evidence.push(EvidenceHelper.success('Viewport', 'Viewport meta tag present'));
        
        // Check viewport content
        if (viewport.includes('width=device-width')) {
          score += 10;
          scoreBreakdown.push({ component: 'Responsive width', points: 10 });
          evidence.push(EvidenceHelper.success('Viewport', 'Responsive width configured'));
        }
      } else {
        scoreBreakdown.push({ component: 'Missing viewport', points: 0 });
        evidence.push(EvidenceHelper.error('Viewport', 'Missing viewport meta tag'));
        issues.push(this.createIssue(
          'high',
          'Missing viewport meta tag',
          'Add <meta name="viewport" content="width=device-width, initial-scale=1">'
        ));
      }

      // Check for responsive images
      const images = $('img');
      const responsiveImages = images.filter((i, el) => {
        const $img = $(el);
        return $img.attr('srcset') || $img.css('max-width') === '100%';
      });

      if (images.length > 0) {
        const responsiveRatio = responsiveImages.length / images.length;
        const imageScore = Math.round(responsiveRatio * 25);
        score += imageScore;
        scoreBreakdown.push({ component: 'Responsive images', points: imageScore });
        
        if (responsiveRatio >= 0.8) {
          evidence.push(EvidenceHelper.success('Images', `${Math.round(responsiveRatio * 100)}% of images are responsive`));
        } else if (responsiveRatio >= 0.5) {
          evidence.push(EvidenceHelper.warning('Images', `Only ${Math.round(responsiveRatio * 100)}% of images are responsive`));
        } else {
          evidence.push(EvidenceHelper.error('Images', `Only ${Math.round(responsiveRatio * 100)}% of images are responsive`));
          issues.push(this.createIssue(
            'medium',
            'Most images are not responsive',
            'Use srcset or responsive CSS for images'
          ));
        }
      } else {
        score += 25;
        scoreBreakdown.push({ component: 'No images to check', points: 25 });
      }

      // Check for mobile-friendly CSS
      const hasMediaQueries = this.checkMediaQueries(content.html);
      if (hasMediaQueries) {
        score += 25;
        scoreBreakdown.push({ component: 'Media queries detected', points: 25 });
        evidence.push(EvidenceHelper.success('CSS', 'Media queries for responsive design detected'));
      } else {
        scoreBreakdown.push({ component: 'No media queries', points: 0 });
        evidence.push(EvidenceHelper.warning('CSS', 'No media queries detected'));
        recommendations.push('Add CSS media queries for responsive design');
      }

      // Check font sizes
      const tooSmallText = $('*').filter((i, el) => {
        const fontSize = $(el).css('font-size');
        if (fontSize) {
          const size = parseInt(fontSize);
          return size < 12 && size > 0;
        }
        return false;
      });

      if (tooSmallText.length > 0) {
        evidence.push(EvidenceHelper.warning('Font Size', `Found ${tooSmallText.length} elements with small font size`));
        if (tooSmallText.length > 10) {
          score = Math.max(0, score - 10);
          scoreBreakdown.push({ component: 'Small font penalty', points: -10 });
          issues.push(this.createIssue(
            'medium',
            'Text too small for mobile',
            'Use minimum 14px font size for body text'
          ));
        }
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('Mobile', `Error checking mobile optimization: ${error.message}`));
      score = 0;
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }

  checkMediaQueries(html) {
    if (!html) return false;
    
    // Simple check for media queries in inline styles or style tags
    const mediaQueryPattern = /@media[^{]+\{/i;
    return mediaQueryPattern.test(html);
  }
}

module.exports = MobileOptimizationRule;