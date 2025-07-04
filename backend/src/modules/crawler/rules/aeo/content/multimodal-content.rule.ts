import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

@Injectable()
export class MultimodalContentRule extends BaseAEORule {
  constructor() {
    super(
      'multimodal_content',
      'Multimodal Content',
      'CONTENT' as Category,
      {
        impactScore: 3,
        pageTypes: [],
        isDomainLevel: true
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 0;
    
    const html = content.html || '';
    
    // Count different media types
    const mediaTypes = {
      images: 0,
      videos: 0,
      audio: 0,
      interactive: 0,
      infographics: 0
    };
    
    // Count images
    mediaTypes.images = (html.match(/<img[^>]*>/gi) || []).length;
    
    // Count videos (various embed types)
    const videoPatterns = [
      /<video[^>]*>/gi,
      /<iframe[^>]*(?:youtube|vimeo|wistia|dailymotion)[^>]*>/gi,
      /embed\/[a-zA-Z0-9_-]{11}/gi,  // YouTube embed pattern
      /player\.vimeo\.com/gi
    ];
    
    videoPatterns.forEach(pattern => {
      const matches = html.match(pattern) || [];
      mediaTypes.videos += matches.length;
    });
    
    // Count audio elements
    const audioPatterns = [
      /<audio[^>]*>/gi,
      /soundcloud\.com/gi,
      /spotify\.com/gi,
      /<iframe[^>]*(?:soundcloud|spotify)[^>]*>/gi
    ];
    
    audioPatterns.forEach(pattern => {
      const matches = html.match(pattern) || [];
      mediaTypes.audio += matches.length;
    });
    
    // Count interactive elements
    const interactivePatterns = [
      /<(?:canvas|svg)[^>]*>/gi,
      /data-interactive/gi,
      /<script[^>]*type=["'](?:application\/ld\+json|module)["'][^>]*>/gi,
      /class=["'][^"']*(?:interactive|widget|calculator|quiz)[^"']*["']/gi
    ];
    
    interactivePatterns.forEach(pattern => {
      const matches = html.match(pattern) || [];
      mediaTypes.interactive += matches.length;
    });
    
    // Check for infographics (images with specific patterns)
    const infographicPatterns = [
      /(?:infographic|data-visualization|chart|graph)/gi,
      /<img[^>]*(?:alt|title)=["'][^"']*(?:infographic|chart|graph|diagram)[^"']*["'][^>]*>/gi
    ];
    
    infographicPatterns.forEach(pattern => {
      const matches = html.match(pattern) || [];
      mediaTypes.infographics += matches.length;
    });
    
    // Calculate total media elements
    const totalMedia = Object.values(mediaTypes).reduce((sum, count) => sum + count, 0);
    const uniqueMediaTypes = Object.values(mediaTypes).filter(count => count > 0).length;
    
    evidence.push(EvidenceHelper.info(`Total media elements: ${totalMedia}`));
    evidence.push(EvidenceHelper.info(`Media types used: ${uniqueMediaTypes} (Images: ${mediaTypes.images}, Videos: ${mediaTypes.videos}, Audio: ${mediaTypes.audio}, Interactive: ${mediaTypes.interactive})`));
    
    // Score based on total media count
    if (totalMedia >= 10) {
      evidence.push(EvidenceHelper.success('Rich multimedia content', { target: 'guidance', score: 30 }));
      score += 30;
    } else if (totalMedia >= 5) {
      evidence.push(EvidenceHelper.warning('Good multimedia presence', { target: 'guidance', score: 20 }));
      score += 20;
    } else if (totalMedia >= 2) {
      evidence.push(EvidenceHelper.warning('Limited multimedia content', { target: 'guidance', score: 10 }));
      score += 10;
    } else if (totalMedia >= 1) {
      evidence.push(EvidenceHelper.warning('Minimal multimedia', { target: 'guidance', score: 5 }));
      score += 5;
    } else {
      evidence.push(EvidenceHelper.error('No multimedia content found'));
    }
    
    // Score based on diversity of media types
    if (uniqueMediaTypes >= 3) {
      evidence.push(EvidenceHelper.success('Diverse media types', { target: 'guidance', score: 25 }));
      score += 25;
    } else if (uniqueMediaTypes >= 2) {
      evidence.push(EvidenceHelper.warning('Multiple media types', { target: 'guidance', score: 15 }));
      score += 15;
    } else if (uniqueMediaTypes === 1) {
      evidence.push(EvidenceHelper.warning('Single media type only', { target: 'guidance', score: 5 }));
      score += 5;
    }
    
    // Check for media optimization
    const lazyLoadingCount = (html.match(/loading=["']lazy["']/gi) || []).length;
    const srcsetCount = (html.match(/srcset=["'][^"']+["']/gi) || []).length;
    
    if (mediaTypes.images > 0) {
      const lazyLoadPercentage = (lazyLoadingCount / mediaTypes.images) * 100;
      const srcsetPercentage = (srcsetCount / mediaTypes.images) * 100;
      
      if (lazyLoadPercentage >= 50) {
        evidence.push(EvidenceHelper.success(`Lazy loading implemented (${lazyLoadPercentage.toFixed(0)}% of images)`, { target: 'guidance', score: 10 }));
        score += 10;
      } else if (lazyLoadingCount > 0) {
        evidence.push(EvidenceHelper.warning(`Some lazy loading (${lazyLoadingCount} images)`, { target: 'guidance', score: 5 }));
        score += 5;
      }
      
      if (srcsetPercentage >= 50) {
        evidence.push(EvidenceHelper.success(`Responsive images with srcset (${srcsetPercentage.toFixed(0)}%)`, { target: 'guidance', score: 10 }));
        score += 10;
      } else if (srcsetCount > 0) {
        evidence.push(EvidenceHelper.warning(`Some responsive images (${srcsetCount})`, { target: 'guidance', score: 5 }));
        score += 5;
      }
    }
    
    // Check for media descriptions/captions
    const figureCount = (html.match(/<figure[^>]*>/gi) || []).length;
    const figcaptionCount = (html.match(/<figcaption[^>]*>/gi) || []).length;
    
    if (figureCount > 0 && figcaptionCount > 0) {
      evidence.push(EvidenceHelper.success(`Media with captions (${figcaptionCount} captions)`, { target: 'guidance', score: 10 }));
      score += 10;
    }
    
    // Check for transcripts or alternative content
    const transcriptPatterns = [
      /transcript/gi,
      /closed[\s-]caption/gi,
      /subtitles?/gi,
      /alternative[\s-]text/gi
    ];
    
    let hasAccessibility = false;
    transcriptPatterns.forEach(pattern => {
      if (pattern.test(html)) {
        hasAccessibility = true;
      }
    });
    
    if (hasAccessibility) {
      evidence.push(EvidenceHelper.success('Accessibility features (transcripts/captions)', { target: 'guidance', score: 10 }));
      score += 10;
    }
    
    // Final scoring
    score = Math.min(100, Math.max(0, score));
    
    if (score >= 80) {
      evidence.push(EvidenceHelper.info('◐ Excellent multimodal content implementation'));
    } else if (score >= 60) {
      evidence.push(EvidenceHelper.warning('Good multimedia usage'));
    } else if (score >= 40) {
      evidence.push(EvidenceHelper.warning('Basic multimedia presence'));
    } else if (score >= 20) {
      evidence.push(EvidenceHelper.warning('Limited multimedia engagement'));
    } else {
      evidence.push(EvidenceHelper.error('Lacks multimodal content'));
    }
    
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100`));
    
    return this.createResult(score, evidence, [], {}, recommendations);
  }
}