import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';


// Evidence topics for this rule
enum MultimodalContentTopic {
  MEDIA_OPTIMIZATION = 'Media Optimization',
  FRESHNESS = 'Freshness',
  MEDIA_STATS = 'Media Stats',
  NO_MULTIMEDIA = 'No Multimedia'
}

@Injectable()
export class MultimodalContentRule extends BaseAEORule {
  constructor() {
    super(
      'multimodal_content',
      'Multimodal Content',
      'STRUCTURE' as Category,
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
    const scoreBreakdown: { component: string; points: number }[] = [];
    
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
    
    evidence.push(EvidenceHelper.info(MultimodalContentTopic.MEDIA_STATS, `Total media elements: ${totalMedia}`));
    evidence.push(EvidenceHelper.info(MultimodalContentTopic.MEDIA_STATS, `Media types used: ${uniqueMediaTypes} (Images: ${mediaTypes.images}, Videos: ${mediaTypes.videos}, Audio: ${mediaTypes.audio}, Interactive: ${mediaTypes.interactive})`));
    
    // Score based on total media count (30 points max)
    if (totalMedia >= 10) {
      evidence.push(EvidenceHelper.success(MultimodalContentTopic.FRESHNESS, 'Rich multimedia content', { target: '≥10 media elements', score: 30, maxScore: 30 }));
      score += 30;
      scoreBreakdown.push({ component: 'Rich multimedia content', points: 30 });
    } else if (totalMedia >= 5) {
      evidence.push(EvidenceHelper.warning(MultimodalContentTopic.FRESHNESS, 'Good multimedia presence', { target: '≥10 media elements for full points', score: 20, maxScore: 30 }));
      score += 20;
      scoreBreakdown.push({ component: 'Good multimedia presence', points: 20 });
    } else if (totalMedia >= 2) {
      evidence.push(EvidenceHelper.warning(MultimodalContentTopic.FRESHNESS, 'Limited multimedia content', { target: '≥10 media elements for full points', score: 10, maxScore: 30 }));
      score += 10;
      scoreBreakdown.push({ component: 'Limited multimedia content', points: 10 });
    } else if (totalMedia >= 1) {
      evidence.push(EvidenceHelper.warning(MultimodalContentTopic.FRESHNESS, 'Minimal multimedia', { target: '≥10 media elements for full points', score: 5, maxScore: 30 }));
      score += 5;
      scoreBreakdown.push({ component: 'Minimal multimedia', points: 5 });
    } else {
      evidence.push(EvidenceHelper.error(MultimodalContentTopic.NO_MULTIMEDIA, 'No multimedia content found', { target: 'Add images, videos, or interactive content', score: 0, maxScore: 30 }));
      scoreBreakdown.push({ component: 'No multimedia content', points: 0 });
    }
    
    // Score based on diversity of media types (20 points max)
    if (uniqueMediaTypes >= 3) {
      evidence.push(EvidenceHelper.success(MultimodalContentTopic.MEDIA_STATS, 'Diverse media types', { target: '≥3 different media types', score: 20, maxScore: 20 }));
      score += 20;
      scoreBreakdown.push({ component: 'Diverse media types', points: 20 });
    } else if (uniqueMediaTypes >= 2) {
      evidence.push(EvidenceHelper.warning(MultimodalContentTopic.MEDIA_STATS, 'Multiple media types', { target: '≥3 different media types for full points', score: 15, maxScore: 20 }));
      score += 15;
      scoreBreakdown.push({ component: 'Multiple media types', points: 15 });
    } else if (uniqueMediaTypes === 1) {
      evidence.push(EvidenceHelper.warning(MultimodalContentTopic.MEDIA_STATS, 'Single media type only', { target: '≥3 different media types for full points', score: 10, maxScore: 20 }));
      score += 10;
      scoreBreakdown.push({ component: 'Single media type only', points: 10 });
    } else {
      scoreBreakdown.push({ component: 'No media diversity', points: 0 });
    }
    
    // Check for media optimization
    const lazyLoadingCount = (html.match(/loading=["']lazy["']/gi) || []).length;
    const srcsetCount = (html.match(/srcset=["'][^"']+["']/gi) || []).length;
    
    if (mediaTypes.images > 0) {
      const lazyLoadPercentage = (lazyLoadingCount / mediaTypes.images) * 100;
      const srcsetPercentage = (srcsetCount / mediaTypes.images) * 100;
      
      if (lazyLoadPercentage >= 50) {
        evidence.push(EvidenceHelper.success(MultimodalContentTopic.MEDIA_OPTIMIZATION, `Lazy loading implemented (${lazyLoadPercentage.toFixed(0)}% of images)`, { target: '≥50% images with lazy loading', score: 15, maxScore: 15 }));
        score += 15;
        scoreBreakdown.push({ component: 'Lazy loading optimization', points: 15 });
      } else if (lazyLoadingCount > 0) {
        evidence.push(EvidenceHelper.warning(MultimodalContentTopic.MEDIA_OPTIMIZATION, `Some lazy loading (${lazyLoadingCount} images)`, { target: '≥50% images with lazy loading for full points', score: 8, maxScore: 15 }));
        score += 8;
        scoreBreakdown.push({ component: 'Partial lazy loading', points: 8 });
      } else {
        evidence.push(EvidenceHelper.error(MultimodalContentTopic.MEDIA_OPTIMIZATION, 'No lazy loading implemented', { target: '≥50% images with lazy loading', score: 0, maxScore: 15 }));
        scoreBreakdown.push({ component: 'No lazy loading', points: 0 });
      }
      
      if (srcsetPercentage >= 50) {
        evidence.push(EvidenceHelper.success(MultimodalContentTopic.MEDIA_OPTIMIZATION, `Responsive images with srcset (${srcsetPercentage.toFixed(0)}%)`, { target: '≥50% images with srcset', score: 15, maxScore: 15 }));
        score += 15;
        scoreBreakdown.push({ component: 'Responsive images (srcset)', points: 15 });
      } else if (srcsetCount > 0) {
        evidence.push(EvidenceHelper.warning(MultimodalContentTopic.MEDIA_OPTIMIZATION, `Some responsive images (${srcsetCount})`, { target: '≥50% images with srcset for full points', score: 8, maxScore: 15 }));
        score += 8;
        scoreBreakdown.push({ component: 'Partial responsive images', points: 8 });
      } else {
        evidence.push(EvidenceHelper.error(MultimodalContentTopic.MEDIA_OPTIMIZATION, 'No responsive images (srcset)', { target: '≥50% images with srcset', score: 0, maxScore: 15 }));
        scoreBreakdown.push({ component: 'No responsive images', points: 0 });
      }
    }
    
    // Check for media descriptions/captions
    const figureCount = (html.match(/<figure[^>]*>/gi) || []).length;
    const figcaptionCount = (html.match(/<figcaption[^>]*>/gi) || []).length;
    
    if (figureCount > 0 && figcaptionCount > 0) {
      evidence.push(EvidenceHelper.success(MultimodalContentTopic.MEDIA_OPTIMIZATION, `Media with captions (${figcaptionCount} captions)`, { target: 'Use <figcaption> for media descriptions', score: 10, maxScore: 10 }));
      score += 10;
      scoreBreakdown.push({ component: 'Media captions', points: 10 });
    } else {
      evidence.push(EvidenceHelper.error(MultimodalContentTopic.MEDIA_OPTIMIZATION, 'No media captions found', { target: 'Use <figcaption> for media descriptions', score: 0, maxScore: 10 }));
      scoreBreakdown.push({ component: 'No media captions', points: 0 });
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
      evidence.push(EvidenceHelper.success(MultimodalContentTopic.MEDIA_STATS, 'Accessibility features (transcripts/captions)', { target: 'Include transcripts and alt text', score: 10, maxScore: 10 }));
      score += 10;
      scoreBreakdown.push({ component: 'Accessibility features', points: 10 });
    } else {
      evidence.push(EvidenceHelper.error(MultimodalContentTopic.MEDIA_STATS, 'No accessibility features found', { target: 'Include transcripts and alt text', score: 0, maxScore: 10 }));
      scoreBreakdown.push({ component: 'No accessibility features', points: 0 });
    }
    
    // Final scoring
    score = Math.min(100, Math.max(0, score));
    
    if (score >= 80) {
      evidence.push(EvidenceHelper.info(MultimodalContentTopic.MEDIA_OPTIMIZATION, '◐ Excellent multimodal content implementation'));
    } else if (score >= 60) {
      evidence.push(EvidenceHelper.warning(MultimodalContentTopic.FRESHNESS, 'Good multimedia usage'));
    } else if (score >= 40) {
      evidence.push(EvidenceHelper.warning(MultimodalContentTopic.FRESHNESS, 'Basic multimedia presence'));
    } else if (score >= 20) {
      evidence.push(EvidenceHelper.warning(MultimodalContentTopic.FRESHNESS, 'Limited multimedia engagement'));
    } else {
      evidence.push(EvidenceHelper.error(MultimodalContentTopic.MEDIA_OPTIMIZATION, 'Lacks multimodal content'));
    }
    
    // Add detailed score calculation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, [], {}, recommendations);
  }
}