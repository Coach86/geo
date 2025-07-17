import { Injectable, Logger } from '@nestjs/common';
import { BaseAnalyzer } from './base-analyzer';
import { BrandReport } from '../../report/schemas/brand-report.schema';
import {
  RecommendationCandidate,
  RecommendationType,
  Evidence,
  DataPoint,
} from '../interfaces/recommendation.interfaces';

@Injectable()
export class ContentPresenceAnalyzer extends BaseAnalyzer {
  private readonly logger = new Logger(ContentPresenceAnalyzer.name);
  protected readonly confidenceThreshold: number = 0.4; // Lower threshold for content presence

  async analyzeProject(
    projectId: string,
    brandReport: BrandReport
  ): Promise<RecommendationCandidate[]> {
    const candidates: RecommendationCandidate[] = [];

    if (!brandReport.visibility) {
      return candidates;
    }

    const channelGaps = this.identifyChannelGaps(brandReport);
    const citationGaps = this.analyzeCitationPatterns(brandReport);
    const contentTypeGaps = this.analyzeContentTypes(brandReport);

    const evidence: Evidence[] = [];

    if (channelGaps.length > 0) {
      const dataPoints: DataPoint[] = channelGaps.map(({ channel, rate }) =>
        this.createDataPoint(
          'channel_visibility',
          rate,
          `${channel} visibility: ${(rate * 100).toFixed(1)}%`
        )
      );

      evidence.push(
        this.createEvidence(
          'visibility_data',
          'Channel visibility analysis',
          dataPoints,
          [],
          channelGaps.length / 7 // Total number of channels analyzed
        )
      );
    }

    if (citationGaps.noCitations) {
      evidence.push(
        this.createEvidence(
          'citation_analysis',
          'Citation pattern analysis',
          [
            this.createDataPoint(
              'citation_rate',
              0,
              'No authoritative sources cite your brand'
            ),
          ],
          [],
          0.9
        )
      );
    } else if (citationGaps.lowCitationRate) {
      evidence.push(
        this.createEvidence(
          'citation_analysis',
          'Citation frequency analysis',
          [
            this.createDataPoint(
              'citation_rate',
              citationGaps.citationRate,
              `Only ${(citationGaps.citationRate * 100).toFixed(0)}% of responses include citations`
            ),
          ],
          [],
          0.7
        )
      );
    }

    if (contentTypeGaps.length > 0) {
      const dataPoints: DataPoint[] = contentTypeGaps.map(gap =>
        this.createDataPoint(
          'content_type_gap',
          gap.type,
          gap.description
        )
      );

      evidence.push(
        this.createEvidence(
          'visibility_data',
          'Content type analysis',
          dataPoints,
          [],
          Math.min(contentTypeGaps.length / 5, 0.8)
        )
      );
    }

    if (evidence.length > 0) {
      const confidenceScore = this.calculateConfidenceScore(evidence);
      const impactScore = this.calculateImpactScore(
        RecommendationType.CONTENT_PRESENCE,
        evidence,
        brandReport
      );

      const candidate: RecommendationCandidate = {
        type: RecommendationType.CONTENT_PRESENCE,
        title: this.generateTitle(channelGaps, citationGaps, contentTypeGaps),
        description: this.generateDescription(channelGaps, citationGaps, contentTypeGaps),
        evidence,
        confidenceScore,
        impactScore,
        suggestedActions: this.generateSuggestedActions(
          channelGaps,
          citationGaps,
          contentTypeGaps
        ),
        methodology: this.generateMethodology(),
      };

      candidates.push(candidate);
    }

    return candidates;
  }

  getAnalyzerType(): RecommendationType {
    return RecommendationType.CONTENT_PRESENCE;
  }

  private identifyChannelGaps(
    brandReport: BrandReport
  ): Array<{ channel: string; rate: number }> {
    const gaps: Array<{ channel: string; rate: number }> = [];
    
    // Since channelVisibility is not in the schema, we'll calculate it from citation sources
    const channelVisibility = this.calculateChannelVisibility(brandReport);

    const channelPriority: Record<string, number> = {
      'search_results': 0.9,
      'documentation': 0.8,
      'tutorials': 0.7,
      'videos': 0.6,
      'forums': 0.5,
      'social_media': 0.4,
      'news': 0.3,
    };

    Object.entries(channelVisibility).forEach(([channel, rate]) => {
      if (rate < 0.1) {
        gaps.push({ channel, rate });
      } else if (rate < 0.3 && channelPriority[channel] >= 0.6) {
        gaps.push({ channel, rate });
      }
    });

    return gaps.sort((a, b) => a.rate - b.rate);
  }

  private analyzeCitationPatterns(brandReport: BrandReport): {
    noCitations: boolean;
    lowCitationRate: boolean;
    citationRate: number;
    uniqueSources: number;
  } {
    let totalResponses = 0;
    let responsesWithCitations = 0;
    const uniqueSources = new Set<string>();

    if (brandReport.visibility?.detailedResults) {
      brandReport.visibility.detailedResults.forEach(result => {
        if (result.brandMentioned) {
          totalResponses++;
          if (result.citations && result.citations.length > 0) {
            responsesWithCitations++;
            result.citations.forEach(citation => {
              if (citation.url) {
                uniqueSources.add(citation.url.toLowerCase());
              }
            });
          }
        }
      });
    }

    const citationRate = totalResponses > 0 
      ? responsesWithCitations / totalResponses 
      : 0;

    return {
      noCitations: uniqueSources.size === 0,
      lowCitationRate: citationRate < 0.3 && citationRate > 0,
      citationRate,
      uniqueSources: uniqueSources.size,
    };
  }

  private analyzeContentTypes(brandReport: BrandReport): Array<{
    type: string;
    description: string;
  }> {
    const gaps: Array<{ type: string; description: string }> = [];
    const contentTypePresence = {
      hasOfficialWebsite: false,
      hasDocumentation: false,
      hasTutorials: false,
      hasAPIReference: false,
      hasCaseStudies: false,
      hasVideoContent: false,
      hasBlogContent: false,
    };

    if (brandReport.visibility?.detailedResults) {
      brandReport.visibility.detailedResults.forEach(result => {
        if (result.brandMentioned && result.llmResponse) {
          const response = result.llmResponse.toLowerCase();
          
          if (response.includes('official website') || response.includes('website')) {
            contentTypePresence.hasOfficialWebsite = true;
          }
          if (response.includes('documentation') || response.includes('docs')) {
            contentTypePresence.hasDocumentation = true;
          }
          if (response.includes('tutorial') || response.includes('guide')) {
            contentTypePresence.hasTutorials = true;
          }
          if (response.includes('api') && response.includes('reference')) {
            contentTypePresence.hasAPIReference = true;
          }
          if (response.includes('case study') || response.includes('customer story')) {
            contentTypePresence.hasCaseStudies = true;
          }
          if (response.includes('video') || response.includes('youtube')) {
            contentTypePresence.hasVideoContent = true;
          }
          if (response.includes('blog') || response.includes('article')) {
            contentTypePresence.hasBlogContent = true;
          }
        }
      });
    }

    if (!contentTypePresence.hasOfficialWebsite) {
      gaps.push({
        type: 'official_website',
        description: 'No official website mentioned in AI responses',
      });
    }
    if (!contentTypePresence.hasDocumentation) {
      gaps.push({
        type: 'documentation',
        description: 'Missing comprehensive product documentation',
      });
    }
    if (!contentTypePresence.hasTutorials) {
      gaps.push({
        type: 'tutorials',
        description: 'Lack of tutorial or guide content',
      });
    }
    if (!contentTypePresence.hasCaseStudies) {
      gaps.push({
        type: 'case_studies',
        description: 'No customer success stories or case studies found',
      });
    }

    return gaps;
  }

  private generateTitle(
    channelGaps: Array<{ channel: string; rate: number }>,
    citationGaps: any,
    contentTypeGaps: Array<{ type: string; description: string }>
  ): string {
    if (citationGaps.noCitations) {
      return 'No authoritative sources cite your brand';
    } else if (channelGaps.length >= 3) {
      return `Missing presence in ${channelGaps.length} key content channels`;
    } else if (contentTypeGaps.length >= 3) {
      return `Lacking ${contentTypeGaps.length} essential content types`;
    } else if (channelGaps.length > 0 && channelGaps[0].rate === 0) {
      return `Zero visibility in ${channelGaps[0].channel.replace('_', ' ')}`;
    }
    return 'Content presence gaps limiting AI discoverability';
  }

  private generateDescription(
    channelGaps: Array<{ channel: string; rate: number }>,
    citationGaps: any,
    contentTypeGaps: Array<{ type: string; description: string }>
  ): string {
    const issues: string[] = [];

    if (citationGaps.noCitations) {
      issues.push('AI models cannot find authoritative sources about your brand');
    } else if (citationGaps.lowCitationRate) {
      issues.push(`Only ${(citationGaps.citationRate * 100).toFixed(0)}% of responses include source citations`);
    }

    if (channelGaps.length > 0) {
      issues.push(`Low or no presence in ${channelGaps.length} content channels`);
    }

    if (contentTypeGaps.length > 0) {
      issues.push(`Missing ${contentTypeGaps.length} critical content types`);
    }

    return issues.join('. ') + '. This significantly impacts how AI systems understand and recommend your brand.';
  }

  private generateSuggestedActions(
    channelGaps: Array<{ channel: string; rate: number }>,
    citationGaps: any,
    contentTypeGaps: Array<{ type: string; description: string }>
  ): string[] {
    const actions: string[] = [];

    if (citationGaps.noCitations || citationGaps.lowCitationRate) {
      actions.push(
        'Publish authoritative content on high-domain-authority platforms',
        'Secure mentions in industry publications and research papers'
      );
    }

    const priorityChannels = channelGaps
      .filter(gap => gap.rate === 0)
      .slice(0, 2);
    
    if (priorityChannels.length > 0) {
      priorityChannels.forEach(({ channel }) => {
        const channelName = channel.replace('_', ' ');
        actions.push(`Create and optimize content for ${channelName}`);
      });
    }

    const priorityContent = contentTypeGaps.slice(0, 2);
    if (priorityContent.length > 0) {
      priorityContent.forEach(({ type }) => {
        const contentType = type.replace('_', ' ');
        actions.push(`Develop comprehensive ${contentType}`);
      });
    }

    if (actions.length < 5) {
      actions.push(
        'Implement structured data markup for better AI comprehension',
        'Create a centralized knowledge base with API access'
      );
    }

    return actions.slice(0, 5);
  }

  private generateMethodology(): string {
    return 'Analyzed brand visibility across content channels, citation patterns in AI responses, and presence of essential content types. Identified gaps where visibility falls below 10% or critical content types are missing.';
  }

  private calculateChannelVisibility(brandReport: BrandReport): Record<string, number> {
    const channelCounts: Record<string, number> = {
      'search_results': 0,
      'documentation': 0,
      'tutorials': 0,
      'videos': 0,
      'forums': 0,
      'social_media': 0,
      'news': 0,
    };

    let totalResponses = 0;

    // Analyze citations to determine channel presence
    if (brandReport.explorer?.citations) {
      brandReport.explorer.citations.forEach(citation => {
        if (citation.brandMentioned) {
          totalResponses++;
          const domain = citation.website?.toLowerCase() || '';
          
          if (domain.includes('google') || domain.includes('bing') || domain.includes('search')) {
            channelCounts['search_results']++;
          } else if (domain.includes('docs') || domain.includes('documentation')) {
            channelCounts['documentation']++;
          } else if (domain.includes('tutorial') || domain.includes('guide')) {
            channelCounts['tutorials']++;
          } else if (domain.includes('youtube') || domain.includes('vimeo')) {
            channelCounts['videos']++;
          } else if (domain.includes('reddit') || domain.includes('forum') || domain.includes('stackoverflow')) {
            channelCounts['forums']++;
          } else if (domain.includes('twitter') || domain.includes('facebook') || domain.includes('linkedin')) {
            channelCounts['social_media']++;
          } else if (domain.includes('news') || domain.includes('press')) {
            channelCounts['news']++;
          }
        }
      });
    }

    // Calculate visibility rates
    const channelVisibility: Record<string, number> = {};
    Object.entries(channelCounts).forEach(([channel, count]) => {
      channelVisibility[channel] = totalResponses > 0 ? count / totalResponses : 0;
    });

    return channelVisibility;
  }
}