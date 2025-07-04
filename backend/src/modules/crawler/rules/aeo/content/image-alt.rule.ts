import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

@Injectable()
export class ImageAltRule extends BaseAEORule {
  constructor() {
    super(
      'image_alt',
      'Image Alt Attributes',
      'CONTENT' as Category,
      {
        impactScore: 2,
        pageTypes: [],
        isDomainLevel: false
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 0;
    const scoreBreakdown: { component: string; points: number }[] = [];
    
    const html = content.html || '';
    
    // Find all images
    const imgPattern = /<img[^>]*>/gi;
    const images = html.match(imgPattern) || [];
    const totalImages = images.length;
    
    if (totalImages === 0) {
      evidence.push(EvidenceHelper.info('No images found on page'));
      return this.createResult(100, evidence);
    }
    
    // Check alt attributes
    let imagesWithAlt = 0;
    let imagesWithEmptyAlt = 0;
    let imagesWithDescriptiveAlt = 0;
    const emptyAltImages: string[] = [];
    
    images.forEach((img: string) => {
      const altMatch = img.match(/alt=["']([^"']*?)["']/i);
      
      if (altMatch) {
        imagesWithAlt++;
        const altText = altMatch[1].trim();
        
        if (altText.length === 0) {
          imagesWithEmptyAlt++;
          // Extract src for empty alt tracking
          const srcMatch = img.match(/src=["']([^"']*?)["']/i);
          const src = srcMatch ? srcMatch[1] : 'unknown';
          emptyAltImages.push(src);
        } else if (altText.length > 10 && !/(image|photo|picture|img|icon)\d*$/i.test(altText)) {
          imagesWithDescriptiveAlt++;
        }
      }
    });
    
    const altPercentage = (imagesWithAlt / totalImages) * 100;
    const descriptivePercentage = (imagesWithDescriptiveAlt / totalImages) * 100;
    
    // Combined image statistics
    evidence.push(EvidenceHelper.info(
      `Total images: ${totalImages}, with alt attribute: ${imagesWithAlt} (${altPercentage.toFixed(1)}%), descriptive: ${imagesWithDescriptiveAlt} (${descriptivePercentage.toFixed(1)}%)`,
      { score: totalImages > 0 ? 5 : 0 }
    ));
    
    if (imagesWithEmptyAlt > 0) {
      const imageList = emptyAltImages.map((src, index) => {
        const filename = src.split('/').pop() || src;
        return `${index + 1}. ${filename.length > 50 ? filename.substring(0, 47) + '...' : filename}`;
      }).join('\n');
      
      evidence.push(EvidenceHelper.warning(`${imagesWithEmptyAlt} images have empty alt attributes`, { 
        code: imageList,
        target: 'Add descriptive alt text for better accessibility',
        score: -5 * imagesWithEmptyAlt
      }));
      recommendations.push('Add descriptive alt text to images with empty alt attributes');
    }
    
    // Scoring based on alt coverage
    if (altPercentage >= 90) {
      score += 40;
      scoreBreakdown.push({ component: 'Excellent alt coverage (≥90%)', points: 40 });
    } else if (altPercentage >= 75) {
      score += 30;
      scoreBreakdown.push({ component: 'Good alt coverage (75-89%)', points: 30 });
    } else if (altPercentage >= 50) {
      score += 20;
      scoreBreakdown.push({ component: 'Moderate alt coverage (50-74%)', points: 20 });
    } else if (altPercentage >= 25) {
      score += 10;
      scoreBreakdown.push({ component: 'Poor alt coverage (25-49%)', points: 10 });
    } else {
      scoreBreakdown.push({ component: 'Very poor alt coverage (<25%)', points: 0 });
    }
    
    // Scoring based on descriptive quality
    if (descriptivePercentage >= 75) {
      score += 40;
      scoreBreakdown.push({ component: 'Most alt texts descriptive (≥75%)', points: 40 });
    } else if (descriptivePercentage >= 50) {
      score += 30;
      scoreBreakdown.push({ component: 'Many alt texts descriptive (50-74%)', points: 30 });
    } else if (descriptivePercentage >= 25) {
      score += 20;
      scoreBreakdown.push({ component: 'Some alt texts descriptive (25-49%)', points: 20 });
    } else {
      score += 10;
      scoreBreakdown.push({ component: 'Few alt texts descriptive (<25%)', points: 10 });
    }
    
    // Check for common bad patterns
    const genericAltPattern = /alt=["'](?:image|photo|picture|img|icon|logo|banner)\d*["']/gi;
    const genericAlts = html.match(genericAltPattern) || [];
    
    if (genericAlts.length > 0) {
      evidence.push(EvidenceHelper.warning(`Found ${genericAlts.length} generic alt texts`));
      recommendations.push('Replace generic alt texts with descriptive alternatives');
      score -= 10;
      scoreBreakdown.push({ component: 'Generic alt texts penalty', points: -10 });
    }
    
    // Bonus for figure/figcaption usage
    const figureCount = (html.match(/<figure[^>]*>/gi) || []).length;
    const figcaptionCount = (html.match(/<figcaption[^>]*>/gi) || []).length;
    
    if (figureCount > 0 && figcaptionCount > 0) {
      evidence.push(EvidenceHelper.success(`Using semantic figure/figcaption elements`));
      score += 10;
      scoreBreakdown.push({ component: 'Semantic figure/figcaption bonus', points: 10 });
    }
    
    // Final scoring
    score = Math.min(100, Math.max(0, score));
    
    // Add score calculation explanation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, [], {}, recommendations);
  }
}