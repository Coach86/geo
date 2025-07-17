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
export class EntityGapAnalyzer extends BaseAnalyzer {
  private readonly logger = new Logger(EntityGapAnalyzer.name);
  protected readonly confidenceThreshold: number = 0.3; // Lower threshold for entity gaps

  async analyzeProject(
    projectId: string,
    brandReport: BrandReport
  ): Promise<RecommendationCandidate[]> {
    const candidates: RecommendationCandidate[] = [];

    this.logger.debug(`Analyzing entity gaps for project ${projectId}`);
    this.logger.debug(`Visibility model visibility exists: ${!!brandReport.visibility?.modelVisibility}, length: ${brandReport.visibility?.modelVisibility?.length || 0}`);

    if (!brandReport.visibility?.modelVisibility) {
      this.logger.debug(`Missing visibility.modelVisibility data for entity gap analysis`);
      return candidates;
    }

    const modelVisibilityArray = brandReport.visibility.modelVisibility;
    const overallRate = brandReport.visibility.overallMentionRate;

    const lowVisibilityModels: string[] = [];
    const noVisibilityModels: string[] = [];
    const evidence: Evidence[] = [];

    this.logger.debug(`Overall mention rate: ${overallRate}`);

    // Convert array to object for easier access
    const modelVisibility: Record<string, number> = {};
    modelVisibilityArray.forEach(({ model, mentionRate }) => {
      modelVisibility[model] = mentionRate;
      this.logger.debug(`Model ${model}: mention rate ${mentionRate}`);
      
      if (mentionRate === 0) {
        noVisibilityModels.push(model);
      } else if (mentionRate < 0.3) {
        lowVisibilityModels.push(model);
      }
    });

    this.logger.debug(`Models with no visibility: ${noVisibilityModels.length} (${noVisibilityModels.join(', ')})`);
    this.logger.debug(`Models with low visibility: ${lowVisibilityModels.length} (${lowVisibilityModels.join(', ')})`);

    if (noVisibilityModels.length > 0) {
      const dataPoints: DataPoint[] = noVisibilityModels.map(model =>
        this.createDataPoint(
          'model_visibility',
          0,
          `${model} has zero brand recognition`
        )
      );

      evidence.push(
        this.createEvidence(
          'visibility_data',
          'Model visibility analysis',
          dataPoints,
          [],
          1.0
        )
      );
    }

    if (lowVisibilityModels.length > 0) {
      const dataPoints: DataPoint[] = lowVisibilityModels.map(model =>
        this.createDataPoint(
          'model_visibility',
          modelVisibility[model],
          `${model} recognition rate: ${(modelVisibility[model] * 100).toFixed(1)}%`
        )
      );

      const significance = lowVisibilityModels.length / Object.keys(modelVisibility).length;
      
      evidence.push(
        this.createEvidence(
          'visibility_data',
          'Model visibility analysis',
          dataPoints,
          [],
          significance
        )
      );
    }

    if (overallRate < 0.2) {
      evidence.push(
        this.createEvidence(
          'visibility_data',
          'Overall visibility metrics',
          [
            this.createDataPoint(
              'overall_mention_rate',
              overallRate,
              `Overall brand mention rate: ${(overallRate * 100).toFixed(1)}%`
            ),
          ],
          [],
          0.9
        )
      );
    }

    if (evidence.length > 0) {
      const allAffectedModels = [...noVisibilityModels, ...lowVisibilityModels];
      const confidenceScore = this.calculateConfidenceScore(evidence);
      const impactScore = this.calculateImpactScore(
        RecommendationType.ENTITY_GAP,
        evidence,
        brandReport
      );

      const candidate: RecommendationCandidate = {
        type: RecommendationType.ENTITY_GAP,
        title: this.generateTitle(noVisibilityModels, lowVisibilityModels, overallRate),
        description: this.generateDescription(allAffectedModels, overallRate),
        evidence,
        confidenceScore,
        impactScore,
        suggestedActions: this.generateSuggestedActions(
          allAffectedModels,
          overallRate
        ),
        methodology: this.generateMethodology(),
      };

      candidates.push(candidate);
    }

    return candidates;
  }

  getAnalyzerType(): RecommendationType {
    return RecommendationType.ENTITY_GAP;
  }

  private generateTitle(
    noVisibilityModels: string[],
    lowVisibilityModels: string[],
    overallRate: number
  ): string {
    if (noVisibilityModels.length > 0) {
      const modelList = noVisibilityModels.slice(0, 2).join(', ');
      const others = noVisibilityModels.length > 2 ? ` and ${noVisibilityModels.length - 2} others` : '';
      return `Zero brand recognition in ${modelList}${others}`;
    } else if (lowVisibilityModels.length >= 3) {
      return `Low brand recognition across ${lowVisibilityModels.length} AI models`;
    } else if (overallRate < 0.1) {
      return `Critical brand visibility gap: ${(overallRate * 100).toFixed(0)}% overall recognition`;
    }
    return `Brand recognition below 30% in key AI models`;
  }

  private generateDescription(
    affectedModels: string[],
    overallRate: number
  ): string {
    const modelCount = affectedModels.length;
    const rate = (overallRate * 100).toFixed(0);
    
    if (modelCount > 0) {
      return `Your brand has limited or no recognition in ${modelCount} AI models, with an overall mention rate of ${rate}%. This significantly impacts your AI-driven discoverability.`;
    }
    
    return `Your brand's overall AI visibility is critically low at ${rate}%, limiting potential customer discovery through AI assistants and search.`;
  }

  private generateSuggestedActions(
    affectedModels: string[],
    overallRate: number
  ): string[] {
    const actions: string[] = [];

    if (affectedModels.length > 0) {
      actions.push(
        `Create targeted content for models with zero recognition: ${affectedModels.slice(0, 3).join(', ')}`
      );
    }

    if (overallRate < 0.2) {
      actions.push(
        'Develop comprehensive brand definition content including company overview, mission, and key differentiators'
      );
    }

    actions.push(
      'Submit structured data and brand information to major search engines and knowledge bases',
      'Create authoritative content on high-domain-authority platforms',
      'Engage in strategic PR to increase brand mentions in training data sources',
      'Monitor brand recognition progress across all AI models monthly'
    );

    return actions.slice(0, 5);
  }

  private generateMethodology(): string {
    return 'Analyzed brand mention rates across all tested AI models. Identified models with zero or low (<30%) brand recognition. Statistical significance based on the proportion of affected models and overall mention rate below critical thresholds.';
  }
}