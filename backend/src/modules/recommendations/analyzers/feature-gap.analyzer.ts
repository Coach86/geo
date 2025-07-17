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
export class FeatureGapAnalyzer extends BaseAnalyzer {
  private readonly logger = new Logger(FeatureGapAnalyzer.name);
  protected readonly confidenceThreshold: number = 0.2; // Very low threshold for feature gaps

  async analyzeProject(
    projectId: string,
    brandReport: BrandReport
  ): Promise<RecommendationCandidate[]> {
    const candidates: RecommendationCandidate[] = [];

    this.logger.debug(`Analyzing feature gaps for project ${projectId}`);
    this.logger.debug(`Competition data exists: ${!!brandReport.competition?.detailedResults}, length: ${brandReport.competition?.detailedResults?.length || 0}`);
    this.logger.debug(`Visibility data exists: ${!!brandReport.visibility?.detailedResults}, length: ${brandReport.visibility?.detailedResults?.length || 0}`);

    if (!brandReport.competition?.detailedResults || !brandReport.visibility?.detailedResults) {
      this.logger.debug(`Missing required data for feature gap analysis. Competition: ${!!brandReport.competition?.detailedResults}, Visibility: ${!!brandReport.visibility?.detailedResults}`);
      return candidates;
    }

    const competitorFeatures = this.extractCompetitorFeatures(brandReport);
    const brandFeatures = this.extractBrandFeatures(brandReport);
    
    this.logger.debug(`Extracted competitor features: ${competitorFeatures.size} unique features`);
    this.logger.debug(`Extracted brand features: ${brandFeatures.size} unique features`);
    
    const missingFeatures = this.identifyMissingFeatures(
      competitorFeatures,
      brandFeatures
    );

    this.logger.debug(`Missing features identified: ${missingFeatures.size} features`);
    if (missingFeatures.size > 0) {
      this.logger.debug(`Sample missing features: ${Array.from(missingFeatures).slice(0, 5).join(', ')}`);
    }

    if (missingFeatures.size === 0) {
      this.logger.debug(`No missing features found, returning 0 candidates`);
      return candidates;
    }

    const evidence: Evidence[] = [];
    const featureCategories = this.categorizeFeatures(missingFeatures);

    this.logger.debug(`Feature categories: ${JSON.stringify(Object.keys(featureCategories))}`);
    Object.entries(featureCategories).forEach(([category, features]) => {
      this.logger.debug(`Category ${category}: ${features.length} features (${features.slice(0, 3).join(', ')})`);
      if (features.length > 0) {
        const dataPoints: DataPoint[] = features.slice(0, 5).map(feature =>
          this.createDataPoint(
            'missing_feature',
            feature,
            `${category} feature mentioned by competitors but not associated with brand`
          )
        );

        evidence.push(
          this.createEvidence(
            'competition_data',
            `${category} feature analysis`,
            dataPoints,
            [],
            Math.min(features.length / 10, 0.9)
          )
        );
      }
    });

    const mentionGap = this.calculateFeatureMentionGap(brandReport);
    this.logger.debug(`Feature mention gap: ${mentionGap}`);
    
    if (mentionGap > 0.3) {
      this.logger.debug(`Mention gap above threshold (0.3), adding mention gap evidence`);
      evidence.push(
        this.createEvidence(
          'visibility_data',
          'Feature mention frequency',
          [
            this.createDataPoint(
              'feature_mention_gap',
              mentionGap,
              `Competitors mention ${(mentionGap * 100).toFixed(0)}% more features on average`
            ),
          ],
          [],
          0.8
        )
      );
    } else {
      this.logger.debug(`Mention gap below threshold (0.3), not adding mention gap evidence`);
    }

    this.logger.debug(`Total evidence collected: ${evidence.length} pieces`);
    
    if (evidence.length > 0) {
      const confidenceScore = this.calculateConfidenceScore(evidence);
      const impactScore = this.calculateImpactScore(
        RecommendationType.FEATURE_GAP,
        evidence,
        brandReport
      );

      const candidate: RecommendationCandidate = {
        type: RecommendationType.FEATURE_GAP,
        title: this.generateTitle(missingFeatures, featureCategories),
        description: this.generateDescription(missingFeatures, mentionGap),
        evidence,
        confidenceScore,
        impactScore,
        suggestedActions: this.generateSuggestedActions(featureCategories),
        methodology: this.generateMethodology(),
      };

      this.logger.debug(`Creating feature gap candidate: "${candidate.title}" with confidence ${candidate.confidenceScore} and impact ${candidate.impactScore}`);
      candidates.push(candidate);
    } else {
      this.logger.debug(`No evidence collected, not creating any candidates`);
    }

    this.logger.debug(`Returning ${candidates.length} feature gap candidates`);
    return candidates;
  }

  getAnalyzerType(): RecommendationType {
    return RecommendationType.FEATURE_GAP;
  }

  private extractCompetitorFeatures(brandReport: BrandReport): Set<string> {
    const features = new Set<string>();

    if (brandReport.competition.detailedResults) {
      brandReport.competition.detailedResults.forEach(result => {
        // Extract features from brand strengths and weaknesses
        if (result.brandStrengths) {
          result.brandStrengths.forEach(strength => {
            const extractedFeatures = this.extractFeaturesFromText(strength);
            extractedFeatures.forEach(f => features.add(f));
          });
        }
        
        if (result.brandWeaknesses) {
          result.brandWeaknesses.forEach(weakness => {
            const extractedFeatures = this.extractFeaturesFromText(weakness);
            extractedFeatures.forEach(f => features.add(f));
          });
        }
      });
    }

    return features;
  }

  private extractBrandFeatures(brandReport: BrandReport): Set<string> {
    const features = new Set<string>();

    if (brandReport.visibility.detailedResults) {
      brandReport.visibility.detailedResults.forEach(result => {
        if (result.brandMentioned && result.llmResponse) {
          const extractedFeatures = this.extractFeaturesFromText(result.llmResponse);
          extractedFeatures.forEach(f => features.add(f));
        }
      });
    }

    // Extract features from alignment attribute scores
    if (brandReport.alignment?.detailedResults) {
      brandReport.alignment.detailedResults.forEach(result => {
        if (result.attributeScores) {
          result.attributeScores.forEach(score => {
            features.add(score.attribute.toLowerCase().trim());
          });
        }
      });
    }

    return features;
  }

  private extractFeaturesFromText(text: string): string[] {
    const features: string[] = [];
    const patterns = [
      /(?:feature|capability|function|tool|service)s?\s*(?:include|such as|like|:)\s*([^.;\n]+)/gi,
      /(?:offers?|provides?|includes?|supports?|enables?)\s+(?:features?\s+)?(?:like\s+)?([^.;\n]+)/gi,
      /(?:can|able to|allows?|lets you)\s+([^.;\n]+)/gi,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const featureText = match[1].trim().toLowerCase();
        const individualFeatures = featureText
          .split(/,|and/)
          .map(f => f.trim())
          .filter(f => f.length > 3 && f.length < 50);
        
        features.push(...individualFeatures);
      }
    });

    return features;
  }

  private identifyMissingFeatures(
    competitorFeatures: Set<string>,
    brandFeatures: Set<string>
  ): Set<string> {
    const missing = new Set<string>();

    competitorFeatures.forEach(feature => {
      if (!brandFeatures.has(feature) && this.isValidFeature(feature)) {
        missing.add(feature);
      }
    });

    return missing;
  }

  private isValidFeature(feature: string): boolean {
    const invalidPatterns = [
      /^(the|a|an|and|or|but|with|for|to|from|by|in|on|at)\s/i,
      /^\d+$/,
      /^[^a-zA-Z]+$/,
    ];

    return !invalidPatterns.some(pattern => pattern.test(feature));
  }

  private categorizeFeatures(
    features: Set<string>
  ): Record<string, string[]> {
    const categories = {
      integration: [] as string[],
      analytics: [] as string[],
      automation: [] as string[],
      collaboration: [] as string[],
      security: [] as string[],
      performance: [] as string[],
      other: [] as string[],
    };

    const categoryKeywords = {
      integration: ['api', 'integrate', 'connect', 'sync', 'import', 'export'],
      analytics: ['analytics', 'report', 'dashboard', 'metric', 'insight', 'data'],
      automation: ['automate', 'workflow', 'trigger', 'schedule', 'bot'],
      collaboration: ['team', 'share', 'collaborate', 'comment', 'invite'],
      security: ['secure', 'encrypt', 'auth', 'permission', 'compliance'],
      performance: ['fast', 'speed', 'optimize', 'scale', 'performance'],
    };

    features.forEach(feature => {
      let categorized = false;

      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => feature.includes(keyword))) {
          (categories as any)[category].push(feature);
          categorized = true;
          break;
        }
      }

      if (!categorized) {
        categories.other.push(feature);
      }
    });

    return Object.fromEntries(
      Object.entries(categories).filter(([_, features]) => features.length > 0)
    );
  }

  private calculateFeatureMentionGap(brandReport: BrandReport): number {
    let brandFeatureCount = 0;
    let competitorFeatureCount = 0;
    let responseCount = 0;

    if (brandReport.competition.detailedResults) {
      brandReport.competition.detailedResults.forEach(result => {
        responseCount++;
        // Count features from strengths and weaknesses
        if (result.brandStrengths) {
          result.brandStrengths.forEach(strength => {
            const features = this.extractFeaturesFromText(strength);
            competitorFeatureCount += features.length;
          });
        }
      });
    }

    if (brandReport.visibility.detailedResults) {
      brandReport.visibility.detailedResults.forEach(result => {
        if (result.brandMentioned) {
          // Count features extracted from the response
          const features = this.extractFeaturesFromText(result.llmResponse || '');
          brandFeatureCount += features.length;
        }
      });
    }

    if (responseCount === 0 || brandFeatureCount === 0) {
      return 0;
    }

    const avgCompetitorFeatures = competitorFeatureCount / responseCount;
    const avgBrandFeatures = brandFeatureCount / (brandReport.visibility.detailedResults?.length || 1);

    return Math.max(0, (avgCompetitorFeatures - avgBrandFeatures) / avgCompetitorFeatures);
  }

  private generateTitle(
    missingFeatures: Set<string>,
    featureCategories: Record<string, string[]>
  ): string {
    const topCategory = Object.entries(featureCategories)
      .sort(([, a], [, b]) => b.length - a.length)[0];

    if (missingFeatures.size >= 20) {
      return `Missing ${missingFeatures.size} competitive features across multiple categories`;
    } else if (topCategory && topCategory[1].length >= 5) {
      return `Lacking ${topCategory[1].length} ${topCategory[0]} features compared to competitors`;
    } else {
      return `Feature gaps identified in ${Object.keys(featureCategories).length} key areas`;
    }
  }

  private generateDescription(
    missingFeatures: Set<string>,
    mentionGap: number
  ): string {
    const gapPercentage = mentionGap > 0 ? ` Competitors mention ${(mentionGap * 100).toFixed(0)}% more features.` : '';
    
    return `Analysis reveals ${missingFeatures.size} features that competitors highlight but are not associated with your brand.${gapPercentage} This impacts competitive positioning in AI-driven comparisons.`;
  }

  private generateSuggestedActions(
    featureCategories: Record<string, string[]>
  ): string[] {
    const actions: string[] = [];
    const priorityCategories = Object.entries(featureCategories)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 3);

    priorityCategories.forEach(([category, features]) => {
      const exampleFeatures = features.slice(0, 3).join(', ');
      actions.push(
        `Develop and promote ${category} capabilities: ${exampleFeatures}`
      );
    });

    actions.push(
      'Create comprehensive feature comparison content highlighting unique capabilities',
      'Update product documentation to explicitly mention all key features',
      'Publish case studies demonstrating feature usage and benefits'
    );

    return actions.slice(0, 5);
  }

  private generateMethodology(): string {
    return 'Extracted and compared features mentioned for competitors versus brand across all AI responses. Identified gaps by analyzing features exclusively associated with competitors. Categorized missing features and calculated mention frequency disparities.';
  }
}