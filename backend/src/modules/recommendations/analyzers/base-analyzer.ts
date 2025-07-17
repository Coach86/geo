import { BrandReport } from '../../report/schemas/brand-report.schema';
import {
  RecommendationCandidate,
  RecommendationType,
  Evidence,
  DataPoint,
} from '../interfaces/recommendation.interfaces';
import { MARKETS } from '../../../common/constants/markets';

export abstract class BaseAnalyzer {
  protected readonly confidenceThreshold: number = 0.7;

  abstract analyzeProject(
    projectId: string,
    brandReport: BrandReport
  ): Promise<RecommendationCandidate[]>;

  abstract getAnalyzerType(): RecommendationType;

  getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }

  protected calculateConfidenceScore(evidence: Evidence[]): number {
    const dataPointCount = evidence.reduce(
      (sum, e) => sum + e.dataPoints.length,
      0
    );

    const hasMultipleSources = new Set(evidence.map((e) => e.type)).size > 1;

    let confidence = Math.min(dataPointCount / 50, 0.5);
    if (hasMultipleSources) confidence += 0.2;

    const avgSignificance =
      evidence.reduce((sum, e) => sum + e.statisticalSignificance, 0) /
      evidence.length;

    confidence += avgSignificance * 0.3;

    return Math.min(confidence, 1.0);
  }

  protected calculateImpactScore(
    type: RecommendationType,
    evidence: Evidence[],
    brandReport: BrandReport
  ): number {
    const baseImpact = {
      [RecommendationType.ENTITY_GAP]: 0.9,
      [RecommendationType.FEATURE_GAP]: 0.7,
      [RecommendationType.CONTENT_PRESENCE]: 0.8,
      [RecommendationType.LOCALIZATION]: 0.6,
      [RecommendationType.COMPETITIVE_POSITIONING]: 0.7,
      [RecommendationType.SENTIMENT_IMPROVEMENT]: 0.5,
    };

    let impact = baseImpact[type] || 0.5;

    const mentionRate = brandReport.visibility.overallMentionRate;
    if (mentionRate < 0.1) impact *= 1.2;
    if (mentionRate < 0.3) impact *= 1.1;

    return Math.min(impact, 1.0);
  }

  protected detectLanguage(text: string): string {
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

  protected getMarketFromLanguage(language: string): string {
    const languageToMarket: Record<string, string> = {
      en: 'United States',
      fr: 'France',
      es: 'Spain',
      de: 'Germany',
      it: 'Italy',
      pt: 'Brazil',
      ja: 'Japan',
      zh: 'China',
      ko: 'South Korea',
    };

    return languageToMarket[language] || 'Global';
  }

  protected createEvidence(
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

  protected createDataPoint(
    metric: string,
    value: any,
    context: string
  ): DataPoint {
    return {
      metric,
      value,
      context,
    };
  }
}