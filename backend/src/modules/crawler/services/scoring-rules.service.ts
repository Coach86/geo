import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScoringRulesConfig, BrandCriteria } from '../interfaces/scoring-rules.interface';
import { DEFAULT_SCORING_RULES } from '../config/default-scoring-rules';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ScoringRulesService {
  private readonly logger = new Logger(ScoringRulesService.name);
  private scoringRules: ScoringRulesConfig;
  private customRulesPath: string;

  constructor(private readonly configService: ConfigService) {
    this.customRulesPath = this.configService.get<string>(
      'SCORING_RULES_PATH',
      path.join(process.cwd(), 'config', 'scoring-rules.json')
    );
    this.loadScoringRules();
  }

  async loadScoringRules(): Promise<void> {
    try {
      // Try to load custom rules from file
      const customRulesContent = await fs.readFile(this.customRulesPath, 'utf-8');
      const customRules = JSON.parse(customRulesContent) as ScoringRulesConfig;
      this.scoringRules = this.mergeRules(DEFAULT_SCORING_RULES, customRules);
      this.logger.log('Loaded custom scoring rules from file');
    } catch (error) {
      // Fall back to default rules
      this.scoringRules = DEFAULT_SCORING_RULES;
      this.logger.log('Using default scoring rules');
    }
  }

  private mergeRules(defaultRules: ScoringRulesConfig, customRules: Partial<ScoringRulesConfig>): ScoringRulesConfig {
    return {
      dimensions: {
        ...defaultRules.dimensions,
        ...customRules.dimensions,
      },
      globalScoreFormula: {
        ...defaultRules.globalScoreFormula,
        ...customRules.globalScoreFormula,
      },
    };
  }

  async saveScoringRules(rules: ScoringRulesConfig): Promise<void> {
    try {
      const dir = path.dirname(this.customRulesPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.customRulesPath, JSON.stringify(rules, null, 2));
      this.scoringRules = rules;
      this.logger.log('Saved custom scoring rules to file');
    } catch (error) {
      this.logger.error('Failed to save scoring rules', error);
      throw error;
    }
  }

  getScoringRules(): ScoringRulesConfig {
    return this.scoringRules;
  }

  getDimensionRules(dimension: keyof ScoringRulesConfig['dimensions']): ScoringRulesConfig['dimensions'][typeof dimension] {
    return this.scoringRules.dimensions[dimension];
  }

  updateBrandCriteria(projectId: string, brandKeywords: string[], requiredTerms: string[] = [], outdatedTerms: string[] = []): BrandCriteria {
    // Create project-specific brand criteria
    const baseCriteria = this.scoringRules.dimensions.brand.criteria;
    return {
      ...baseCriteria,
      brandKeywords: [...new Set([...baseCriteria.brandKeywords, ...brandKeywords])],
      requiredTerms: [...new Set([...baseCriteria.requiredTerms, ...requiredTerms])],
      outdatedTerms: [...new Set([...baseCriteria.outdatedTerms, ...outdatedTerms])],
    };
  }

  calculateDimensionScore(value: number, dimension: keyof ScoringRulesConfig['dimensions']): number {
    const dimensionRules = this.scoringRules.dimensions[dimension];
    const thresholds = dimensionRules.thresholds;

    // Find the appropriate threshold
    for (const threshold of thresholds) {
      if (value >= threshold.min && (!threshold.max || value <= threshold.max)) {
        return threshold.score;
      }
    }

    // Default to lowest score if no threshold matches
    return thresholds[0]?.score || 0;
  }

  getGlobalScoreWeights() {
    return this.scoringRules.globalScoreFormula.weights;
  }

  // Admin endpoint to update rules dynamically
  async updateDimensionRules(
    dimension: keyof ScoringRulesConfig['dimensions'],
    updates: any
  ): Promise<void> {
    this.scoringRules.dimensions[dimension] = {
      ...this.scoringRules.dimensions[dimension],
      ...updates,
    } as any;
    await this.saveScoringRules(this.scoringRules);
  }

  // Get scoring rules as JSON for admin UI
  exportRulesAsJson(): string {
    return JSON.stringify(this.scoringRules, null, 2);
  }

  // Import rules from JSON
  async importRulesFromJson(jsonString: string): Promise<void> {
    try {
      const rules = JSON.parse(jsonString) as ScoringRulesConfig;
      await this.saveScoringRules(rules);
    } catch (error) {
      this.logger.error('Failed to import rules from JSON', error);
      throw new Error('Invalid JSON format for scoring rules');
    }
  }
}