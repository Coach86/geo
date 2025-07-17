import { Injectable, Logger } from '@nestjs/common';
import { BrandReport } from '../../report/schemas/brand-report.schema';
import { 
  Evidence, 
  DataPoint,
  RecommendationType 
} from '../interfaces/recommendation.interfaces';

@Injectable()
export class PatternDetectionService {
  private readonly logger = new Logger(PatternDetectionService.name);

  private createEvidence(
    type: Evidence['type'],
    source: string,
    dataPoints: DataPoint[],
    supportingQuotes: string[] = [],
    significance: number = 0.8
  ): Evidence {
    return {
      id: this.generateId(),
      type,
      source,
      dataPoints,
      supportingQuotes,
      statisticalSignificance: significance,
      collectedAt: new Date(),
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  detectEntityGaps(brandReport: BrandReport): Evidence[] {
    const evidence: Evidence[] = [];

    if (!brandReport.visibility?.modelVisibility) {
      return evidence;
    }

    const modelVisibility = brandReport.visibility.modelVisibility;
    const overallRate = brandReport.visibility.overallMentionRate;

    const dataPoints: DataPoint[] = [];
    const lowVisibilityModels: string[] = [];

    modelVisibility.forEach(({ model, mentionRate }) => {
      if (mentionRate < 0.3) {
        lowVisibilityModels.push(model);
        dataPoints.push({
          metric: 'model_visibility',
          value: mentionRate,
          context: `${model} recognition rate: ${(mentionRate * 100).toFixed(1)}%`,
        });
      }
    });

    if (lowVisibilityModels.length > 0) {
      const significance = lowVisibilityModels.length / modelVisibility.length;
      
      evidence.push(this.createEvidence(
        'visibility_data',
        'Model visibility analysis',
        dataPoints,
        [],
        significance
      ));
    }

    if (overallRate < 0.2) {
      evidence.push(this.createEvidence(
        'visibility_data',
        'Overall visibility metrics',
        [{
          metric: 'overall_mention_rate',
          value: overallRate,
          context: `Overall brand mention rate: ${(overallRate * 100).toFixed(1)}%`,
        }],
        [],
        0.9
      ));
    }

    return evidence;
  }

  detectFeatureGaps(brandReport: BrandReport): Evidence[] {
    const evidence: Evidence[] = [];
    
    if (!brandReport.visibility?.detailedResults) {
      return evidence;
    }

    const mentionedFeatures = new Set<string>();
    const missingFeatures = new Set<string>();
    
    brandReport.visibility.detailedResults.forEach(result => {
      if (result.brandMentioned && result.llmResponse) {
        const features = this.extractFeatures(result.llmResponse);
        features.forEach(f => mentionedFeatures.add(f));
      }
    });

    const competitorFeatures = this.extractCompetitorFeatures(brandReport);
    
    competitorFeatures.forEach(feature => {
      if (!mentionedFeatures.has(feature)) {
        missingFeatures.add(feature);
      }
    });

    if (missingFeatures.size > 0) {
      const dataPoints: DataPoint[] = Array.from(missingFeatures).map(feature => ({
        metric: 'missing_feature',
        value: feature,
        context: `Feature mentioned by competitors but not associated with brand`,
      }));

      evidence.push(this.createEvidence(
        'competition_data',
        'Feature comparison analysis',
        dataPoints.slice(0, 10),
        [],
        Math.min(missingFeatures.size / 10, 0.9)
      ));
    }

    return evidence;
  }

  detectContentGaps(brandReport: BrandReport): Evidence[] {
    const evidence: Evidence[] = [];
    
    if (!brandReport.visibility?.detailedResults) {
      return evidence;
    }
    
    // Analyze content gaps based on citation patterns
    const dataPoints: DataPoint[] = [];
    let responsesWithoutCitations = 0;
    let totalResponses = 0;
    
    brandReport.visibility.detailedResults.forEach(result => {
      if (result.brandMentioned) {
        totalResponses++;
        if (!result.citations || result.citations.length === 0) {
          responsesWithoutCitations++;
        }
      }
    });
    
    const noCitationRate = totalResponses > 0 ? responsesWithoutCitations / totalResponses : 0;
    
    if (noCitationRate > 0.5) {
      dataPoints.push({
        metric: 'citation_gap',
        value: noCitationRate,
        context: `${(noCitationRate * 100).toFixed(1)}% of responses lack citations`,
      });
      
      evidence.push(this.createEvidence(
        'visibility_data',
        'Citation analysis',
        dataPoints,
        [],
        noCitationRate
      ));
    }

    return evidence;
  }

  detectLocalizationIssues(brandReport: BrandReport): Evidence[] {
    const evidence: Evidence[] = [];
    
    if (!brandReport.visibility?.detailedResults) {
      return evidence;
    }

    const languageVisibility = new Map<string, number>();
    const totalResponses = new Map<string, number>();

    brandReport.visibility.detailedResults.forEach(result => {
      const language = this.detectLanguage(result.llmResponse);
      
      if (!totalResponses.has(language)) {
        totalResponses.set(language, 0);
        languageVisibility.set(language, 0);
      }
      
      totalResponses.set(language, totalResponses.get(language)! + 1);
      
      if (result.brandMentioned) {
        languageVisibility.set(
          language, 
          languageVisibility.get(language)! + 1
        );
      }
    });

    const dataPoints: DataPoint[] = [];
    
    languageVisibility.forEach((mentioned, language) => {
      const total = totalResponses.get(language)!;
      const rate = mentioned / total;
      
      if (rate < 0.3 && total >= 5) {
        dataPoints.push({
          metric: 'language_visibility',
          value: rate,
          context: `Low visibility in ${language} responses: ${(rate * 100).toFixed(1)}%`,
        });
      }
    });

    if (dataPoints.length > 0) {
      evidence.push(this.createEvidence(
        'visibility_data',
        'Language-specific visibility analysis',
        dataPoints,
        [],
        Math.min(dataPoints.length / languageVisibility.size, 0.8)
      ));
    }

    return evidence;
  }

  detectSentimentPatterns(brandReport: BrandReport): Evidence[] {
    const evidence: Evidence[] = [];
    
    if (brandReport.sentiment?.overallScore === undefined) {
      return evidence;
    }

    const avgScore = brandReport.sentiment.overallScore;
    const dataPoints: DataPoint[] = [];

    if (avgScore < 0.4) {
      dataPoints.push({
        metric: 'average_sentiment',
        value: avgScore,
        context: `Low average sentiment score: ${avgScore.toFixed(2)}/1.0`,
      });
    }

    // Model sentiment scores removed - not in current schema

    // Category sentiment analysis removed - not in current schema

    if (dataPoints.length > 0) {
      evidence.push(this.createEvidence(
        'sentiment_data',
        'Sentiment analysis',
        dataPoints,
        [],
        Math.min(dataPoints.length / 5, 0.9)
      ));
    }

    return evidence;
  }

  private extractFeatures(text: string): string[] {
    const features: string[] = [];
    const featurePatterns = [
      /(?:feature|capability|function|service|tool|option):\s*([^,.\n]+)/gi,
      /(?:offers?|provides?|includes?|supports?)\s+([^,.\n]+)/gi,
      /(?:can|able to|allows?|enables?)\s+([^,.\n]+)/gi,
    ];

    featurePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        features.push(match[1].trim().toLowerCase());
      }
    });

    return [...new Set(features)];
  }

  private extractCompetitorFeatures(brandReport: BrandReport): Set<string> {
    const features = new Set<string>();
    
    if (!brandReport.competition?.detailedResults) {
      return features;
    }

    // Extract features from competition analysis
    brandReport.competition.detailedResults.forEach(result => {
      if (result.brandStrengths) {
        result.brandStrengths.forEach(strength => {
          const extractedFeatures = strength.toLowerCase().split(/\s+/);
          extractedFeatures.forEach(f => features.add(f));
        });
      }
    });

    return features;
  }

  private detectLanguage(text: string): string {
    const languagePatterns = {
      en: /\b(the|is|are|have|will|can|and|or|but)\b/i,
      fr: /\b(le|la|les|est|sont|avoir|et|ou|mais)\b/i,
      es: /\b(el|la|los|las|es|son|y|o|pero)\b/i,
      de: /\b(der|die|das|ist|sind|haben|und|oder|aber)\b/i,
      it: /\b(il|la|i|le|è|sono|e|o|ma)\b/i,
      pt: /\b(o|a|os|as|é|são|e|ou|mas)\b/i,
      ja: /[\u3040-\u309f\u30a0-\u30ff]/,
      zh: /[\u4e00-\u9fff]/,
      ko: /[\uac00-\ud7af]/,
    };

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(text)) return lang;
    }

    return 'unknown';
  }
}