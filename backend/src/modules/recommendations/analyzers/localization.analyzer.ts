import { Injectable, Logger } from '@nestjs/common';
import { BaseAnalyzer } from './base-analyzer';
import { BrandReport } from '../../report/schemas/brand-report.schema';
import {
  RecommendationCandidate,
  RecommendationType,
  Evidence,
  DataPoint,
} from '../interfaces/recommendation.interfaces';
import { MARKETS } from '../../../common/constants/markets';

@Injectable()
export class LocalizationAnalyzer extends BaseAnalyzer {
  private readonly logger = new Logger(LocalizationAnalyzer.name);
  protected readonly confidenceThreshold: number = 0.5; // Lower threshold for localization

  async analyzeProject(
    projectId: string,
    brandReport: BrandReport
  ): Promise<RecommendationCandidate[]> {
    const candidates: RecommendationCandidate[] = [];

    if (!brandReport.visibility?.detailedResults) {
      return candidates;
    }

    const languageAnalysis = this.analyzeLanguageVisibility(brandReport);
    const marketAnalysis = this.analyzeMarketCoverage(brandReport);
    const localizationGaps = this.identifyLocalizationGaps(
      languageAnalysis,
      marketAnalysis
    );

    const evidence: Evidence[] = [];

    if (localizationGaps.languageGaps.length > 0) {
      const dataPoints: DataPoint[] = localizationGaps.languageGaps.map(gap =>
        this.createDataPoint(
          'language_visibility',
          gap.visibilityRate,
          `${gap.language} visibility: ${(gap.visibilityRate * 100).toFixed(1)}% (${gap.responses} responses)`
        )
      );

      evidence.push(
        this.createEvidence(
          'visibility_data',
          'Language-specific visibility analysis',
          dataPoints,
          [],
          Math.min(localizationGaps.languageGaps.length / languageAnalysis.size, 0.9)
        )
      );
    }

    if (localizationGaps.marketGaps.length > 0) {
      const dataPoints: DataPoint[] = localizationGaps.marketGaps.map(gap =>
        this.createDataPoint(
          'market_coverage',
          gap.coverage,
          `${gap.market} market coverage: ${(gap.coverage * 100).toFixed(1)}%`
        )
      );

      evidence.push(
        this.createEvidence(
          'visibility_data',
          'Market coverage analysis',
          dataPoints,
          [],
          Math.min(localizationGaps.marketGaps.length / 5, 0.8)
        )
      );
    }

    if (localizationGaps.missingLocalizations.length > 0) {
      const dataPoints: DataPoint[] = localizationGaps.missingLocalizations.map(loc =>
        this.createDataPoint(
          'missing_localization',
          loc.market,
          `No localized content detected for ${loc.market} (${loc.language})`
        )
      );

      evidence.push(
        this.createEvidence(
          'visibility_data',
          'Localization coverage',
          dataPoints.slice(0, 5),
          [],
          0.7
        )
      );
    }

    if (evidence.length > 0) {
      const confidenceScore = this.calculateConfidenceScore(evidence);
      const impactScore = this.calculateImpactScore(
        RecommendationType.LOCALIZATION,
        evidence,
        brandReport
      );

      const candidate: RecommendationCandidate = {
        type: RecommendationType.LOCALIZATION,
        title: this.generateTitle(localizationGaps),
        description: this.generateDescription(localizationGaps),
        evidence,
        confidenceScore,
        impactScore,
        suggestedActions: this.generateSuggestedActions(localizationGaps),
        methodology: this.generateMethodology(),
      };

      candidates.push(candidate);
    }

    return candidates;
  }

  getAnalyzerType(): RecommendationType {
    return RecommendationType.LOCALIZATION;
  }

  private analyzeLanguageVisibility(
    brandReport: BrandReport
  ): Map<string, { mentioned: number; total: number; rate: number }> {
    const languageStats = new Map<string, { mentioned: number; total: number; rate: number }>();

    brandReport.visibility.detailedResults?.forEach(result => {
      if (result.llmResponse) {
        const language = this.detectLanguage(result.llmResponse);
        
        if (!languageStats.has(language)) {
          languageStats.set(language, { mentioned: 0, total: 0, rate: 0 });
        }
        
        const stats = languageStats.get(language)!;
        stats.total++;
        
        if (result.brandMentioned) {
          stats.mentioned++;
        }
        
        stats.rate = stats.mentioned / stats.total;
      }
    });

    return languageStats;
  }

  private analyzeMarketCoverage(
    brandReport: BrandReport
  ): Map<string, { coverage: number; languages: Set<string> }> {
    const marketStats = new Map<string, { coverage: number; languages: Set<string> }>();

    // Since marketVisibility is not in the schema, we'll calculate it
    const marketCoverage = this.calculateMarketCoverage(brandReport);
    
    Object.entries(marketCoverage).forEach(([market, coverage]) => {
      marketStats.set(market, {
        coverage,
        languages: new Set(),
      });
    });

    if (brandReport.visibility.detailedResults) {
      brandReport.visibility.detailedResults?.forEach(result => {
        if (result.llmResponse) {
          const language = this.detectLanguage(result.llmResponse);
          const market = this.getMarketFromModel(result.model);
          const stats = marketStats.get(market);
          
          if (stats) {
            stats.languages.add(language);
          }
        }
      });
    }

    return marketStats;
  }

  private identifyLocalizationGaps(
    languageAnalysis: Map<string, { mentioned: number; total: number; rate: number }>,
    marketAnalysis: Map<string, { coverage: number; languages: Set<string> }>
  ): {
    languageGaps: Array<{ language: string; visibilityRate: number; responses: number }>;
    marketGaps: Array<{ market: string; coverage: number }>;
    missingLocalizations: Array<{ market: string; language: string }>;
  } {
    const languageGaps: Array<{ language: string; visibilityRate: number; responses: number }> = [];
    const marketGaps: Array<{ market: string; coverage: number }> = [];
    const missingLocalizations: Array<{ market: string; language: string }> = [];

    languageAnalysis.forEach((stats, language) => {
      if (stats.rate < 0.3 && stats.total >= 5 && language !== 'unknown') {
        languageGaps.push({
          language: this.getLanguageName(language),
          visibilityRate: stats.rate,
          responses: stats.total,
        });
      }
    });

    marketAnalysis.forEach((stats, market) => {
      if (stats.coverage < 0.2) {
        marketGaps.push({ market, coverage: stats.coverage });

        const expectedLanguages = this.getExpectedLanguagesForMarket(market);
        expectedLanguages.forEach(language => {
          if (!stats.languages.has(language)) {
            missingLocalizations.push({
              market,
              language: this.getLanguageName(language),
            });
          }
        });
      }
    });

    return {
      languageGaps: languageGaps.sort((a, b) => a.visibilityRate - b.visibilityRate),
      marketGaps: marketGaps.sort((a, b) => a.coverage - b.coverage),
      missingLocalizations: missingLocalizations.slice(0, 10),
    };
  }

  private getLanguageName(code: string): string {
    const languageNames = {
      en: 'English',
      fr: 'French',
      es: 'Spanish',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ja: 'Japanese',
      zh: 'Chinese',
      ko: 'Korean',
      unknown: 'Unknown',
    };

    return (languageNames as Record<string, string>)[code] || code;
  }

  private getExpectedLanguagesForMarket(market: string): string[] {
    const marketLanguages: Record<string, string[]> = {
      'United States': ['en'],
      'United Kingdom': ['en'],
      'France': ['fr'],
      'Germany': ['de'],
      'Spain': ['es'],
      'Italy': ['it'],
      'Brazil': ['pt'],
      'Portugal': ['pt'],
      'Japan': ['ja'],
      'China': ['zh'],
      'South Korea': ['ko'],
      'Canada': ['en', 'fr'],
      'Switzerland': ['de', 'fr', 'it'],
      'Belgium': ['fr', 'nl'],
    };

    return marketLanguages[market] || ['en'];
  }

  private generateTitle(localizationGaps: {
    languageGaps: Array<{ language: string; visibilityRate: number; responses: number }>;
    marketGaps: Array<{ market: string; coverage: number }>;
    missingLocalizations: Array<{ market: string; language: string }>;
  }): string {
    const { languageGaps, marketGaps, missingLocalizations } = localizationGaps;

    if (languageGaps.length >= 3) {
      return `Low visibility in ${languageGaps.length} languages`;
    } else if (marketGaps.length >= 3) {
      return `Missing presence in ${marketGaps.length} key markets`;
    } else if (missingLocalizations.length >= 5) {
      return `Localization needed for ${missingLocalizations.length} market-language pairs`;
    } else if (languageGaps.length > 0 && languageGaps[0].visibilityRate < 0.1) {
      return `Critical visibility gap in ${languageGaps[0].language} content`;
    }
    
    return 'Localization gaps limiting global reach';
  }

  private generateDescription(localizationGaps: {
    languageGaps: Array<{ language: string; visibilityRate: number; responses: number }>;
    marketGaps: Array<{ market: string; coverage: number }>;
    missingLocalizations: Array<{ market: string; language: string }>;
  }): string {
    const { languageGaps, marketGaps, missingLocalizations } = localizationGaps;
    const issues: string[] = [];

    if (languageGaps.length > 0) {
      const languages = languageGaps.slice(0, 3).map((g: { language: string; visibilityRate: number; responses: number }) => g.language).join(', ');
      issues.push(`Low brand visibility in ${languages}`);
    }

    if (marketGaps.length > 0) {
      issues.push(`Poor coverage in ${marketGaps.length} markets`);
    }

    if (missingLocalizations.length > 0) {
      issues.push(`Missing localized content for key regions`);
    }

    return issues.join('. ') + '. This limits your ability to reach and engage international audiences through AI-driven discovery.';
  }

  private generateSuggestedActions(localizationGaps: {
    languageGaps: Array<{ language: string; visibilityRate: number; responses: number }>;
    marketGaps: Array<{ market: string; coverage: number }>;
    missingLocalizations: Array<{ market: string; language: string }>;
  }): string[] {
    const actions: string[] = [];
    const { languageGaps, marketGaps, missingLocalizations } = localizationGaps;

    const priorityLanguages = languageGaps.slice(0, 2);
    if (priorityLanguages.length > 0) {
      priorityLanguages.forEach(({ language }: { language: string; visibilityRate: number; responses: number }) => {
        actions.push(`Create native ${language} content and documentation`);
      });
    }

    const priorityMarkets = marketGaps.slice(0, 2);
    if (priorityMarkets.length > 0) {
      priorityMarkets.forEach(({ market }: { market: string; coverage: number }) => {
        actions.push(`Develop market-specific content for ${market}`);
      });
    }

    if (missingLocalizations.length > 0) {
      actions.push(
        'Implement comprehensive content localization strategy',
        'Partner with local content creators in target markets'
      );
    }

    actions.push(
      'Optimize content for multilingual SEO and AI discovery',
      'Submit localized content to region-specific platforms and directories'
    );

    return actions.slice(0, 5);
  }

  private generateMethodology(): string {
    return 'Analyzed brand visibility by language and market coverage. Identified languages with <30% visibility rate and markets with <20% coverage. Cross-referenced market expectations with actual language presence to find localization gaps.';
  }

  private calculateMarketCoverage(brandReport: BrandReport): Record<string, number> {
    const marketCoverage: Record<string, number> = {};
    
    // Initialize with main markets
    const markets = ['United States', 'United Kingdom', 'France', 'Germany', 'Spain', 'Italy', 'Brazil', 'Japan', 'China', 'South Korea'];
    markets.forEach(market => {
      marketCoverage[market] = 0;
    });

    // Calculate coverage based on model responses
    if (brandReport.visibility?.detailedResults) {
      const marketMentions: Record<string, { mentioned: number; total: number }> = {};
      
      brandReport.visibility.detailedResults?.forEach(result => {
        const market = this.getMarketFromModel(result.model);
        if (market !== 'Global') {
          if (!marketMentions[market]) {
            marketMentions[market] = { mentioned: 0, total: 0 };
          }
          marketMentions[market].total++;
          if (result.brandMentioned) {
            marketMentions[market].mentioned++;
          }
        }
      });
      
      Object.entries(marketMentions).forEach(([market, stats]) => {
        marketCoverage[market] = stats.total > 0 ? stats.mentioned / stats.total : 0;
      });
    }
    
    return marketCoverage;
  }

  private getMarketFromModel(model: string): string {
    const modelMarkets: Record<string, string> = {
      'gpt': 'United States',
      'claude': 'United States',
      'gemini': 'United States',
      'mistral': 'France',
      'qwen': 'China',
    };
    
    const modelLower = model.toLowerCase();
    for (const [key, market] of Object.entries(modelMarkets)) {
      if (modelLower.includes(key)) {
        return market;
      }
    }
    
    return 'Global';
  }
}