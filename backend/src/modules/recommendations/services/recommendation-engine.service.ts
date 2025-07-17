import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReportService } from '../../report/services/report.service';
import { ProjectService } from '../../project/services/project.service';
import { RecommendationRepository } from '../repositories/recommendation.repository';
import { PatternDetectionService } from './pattern-detection.service';
import { LLMAnalysisService } from './llm-analysis.service';
import { 
  RecommendationCandidate,
  RecommendationPriority,
  RecommendationStatus,
  ImplementationDifficulty 
} from '../interfaces/recommendation.interfaces';
import { 
  AnalysisMetadata, 
  AnalysisMetadataDocument 
} from '../schemas/analysis-metadata.schema';
import { BaseAnalyzer } from '../analyzers/base-analyzer';
import { EntityGapAnalyzer } from '../analyzers/entity-gap.analyzer';
import { FeatureGapAnalyzer } from '../analyzers/feature-gap.analyzer';
import { ContentPresenceAnalyzer } from '../analyzers/content-presence.analyzer';
import { LocalizationAnalyzer } from '../analyzers/localization.analyzer';
import { SentimentImprovementAnalyzer } from '../analyzers/sentiment-improvement.analyzer';

@Injectable()
export class RecommendationEngineService {
  private readonly logger = new Logger(RecommendationEngineService.name);
  private analyzers: BaseAnalyzer[];

  constructor(
    @InjectModel(AnalysisMetadata.name)
    private analysisMetadataModel: Model<AnalysisMetadataDocument>,
    private readonly reportService: ReportService,
    private readonly projectService: ProjectService,
    private readonly recommendationRepository: RecommendationRepository,
    private readonly patternDetection: PatternDetectionService,
    private readonly llmAnalysis: LLMAnalysisService,
    private readonly entityGapAnalyzer: EntityGapAnalyzer,
    private readonly featureGapAnalyzer: FeatureGapAnalyzer,
    private readonly contentPresenceAnalyzer: ContentPresenceAnalyzer,
    private readonly localizationAnalyzer: LocalizationAnalyzer,
    private readonly sentimentImprovementAnalyzer: SentimentImprovementAnalyzer,
  ) {
    this.analyzers = [
      this.entityGapAnalyzer,
      this.featureGapAnalyzer,
      this.contentPresenceAnalyzer,
      this.localizationAnalyzer,
      this.sentimentImprovementAnalyzer,
    ];
  }

  async analyzeProject(
    projectId: string,
  ): Promise<{
    recommendationsGenerated: number;
    metadata: AnalysisMetadata;
  }> {
    this.logger.log(`Starting recommendation analysis for project ${projectId}`);
    const startTime = Date.now();

    try {
      const [project, latestReport] = await Promise.all([
        this.projectService.findById(projectId),
        this.reportService.getLatestReport(projectId),
      ]);

      if (!project) {
        this.logger.error(`Project not found: ${projectId}`);
        throw new Error('Project not found');
      }

      if (!project.organizationId) {
        this.logger.error(`Project ${projectId} has no organizationId`);
        throw new Error('Project has no organizationId');
      }

      const organizationId = project.organizationId;

      this.logger.debug(`Project found: ${project.brandName} (${project.projectId})`);
      
      if (!latestReport) {
        this.logger.warn(`No brand report found for project ${projectId}. Recommendations require at least one completed brand report.`);
        throw new Error('No brand report found for project. Please run a brand analysis first to generate recommendations.');
      }

      this.logger.debug(`Latest report found: ${latestReport.id} (${latestReport.createdAt})`);

      const analyzerMetrics = {
        entityGap: { processed: false, candidatesFound: 0, executionTime: 0 },
        featureGap: { processed: false, candidatesFound: 0, executionTime: 0 },
        contentPresence: { processed: false, candidatesFound: 0, executionTime: 0 },
        localization: { processed: false, candidatesFound: 0, executionTime: 0 },
        sentimentImprovement: { processed: false, candidatesFound: 0, executionTime: 0 },
      };

      const allCandidates: RecommendationCandidate[] = [];

      for (const analyzer of this.analyzers) {
        const analyzerStart = Date.now();
        const analyzerType = analyzer.getAnalyzerType();
        const analyzerKey = this.getAnalyzerKey(analyzerType);

        try {
          this.logger.debug(`Running ${analyzerType} analyzer`);
          const candidates = await analyzer.analyzeProject(projectId, latestReport);
          
          this.logger.debug(`${analyzerType} analyzer returned ${candidates.length} raw candidates`);
          candidates.forEach((candidate, index) => {
            this.logger.debug(`  Candidate ${index + 1}: confidence ${candidate.confidenceScore}, threshold ${analyzer.getConfidenceThreshold()}`);
          });
          
          const filteredCandidates = candidates.filter(
            c => c.confidenceScore >= analyzer.getConfidenceThreshold()
          );

          this.logger.debug(`${analyzerType} analyzer: ${filteredCandidates.length} candidates passed confidence threshold`);
          allCandidates.push(...filteredCandidates);
          
          (analyzerMetrics as any)[analyzerKey] = {
            processed: true,
            candidatesFound: filteredCandidates.length,
            executionTime: Date.now() - analyzerStart,
          };

          this.logger.debug(
            `${analyzerType} analyzer found ${filteredCandidates.length} candidates`
          );
        } catch (error) {
          this.logger.error(
            `Error in ${analyzerType} analyzer: ${error.message}`,
            error.stack,
          );
        }
      }

      const enhancedCandidates = await this.llmAnalysis.enhanceRecommendations(
        allCandidates,
        projectId,
      );

      const recommendations = await this.saveRecommendations(
        enhancedCandidates,
        projectId,
        organizationId,
        latestReport.batchExecutionId,
      );

      const metadata = await this.saveAnalysisMetadata({
        projectId,
        batchExecutionId: latestReport.batchExecutionId,
        analyzedAt: new Date(),
        modelsUsed: this.getModelsUsed(latestReport),
        promptsAnalyzed: latestReport.metadata?.promptsExecuted || latestReport.explorer?.summary?.totalPrompts || 0,
        confidenceThreshold: Math.min(...this.analyzers.map(a => a.getConfidenceThreshold())),
        recommendationsGenerated: recommendations.length,
        analyzerMetrics,
      });

      this.logger.log(
        `Completed recommendation analysis for project ${projectId}. ` +
        `Generated ${recommendations.length} recommendations in ${Date.now() - startTime}ms`
      );

      return {
        recommendationsGenerated: recommendations.length,
        metadata,
      };
    } catch (error) {
      this.logger.error(
        `Failed to analyze project ${projectId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async analyzeFromBatch(
    batchExecutionId: string,
  ): Promise<{
    projectsAnalyzed: number;
    totalRecommendations: number;
  }> {
    this.logger.log(`Starting batch recommendation analysis for ${batchExecutionId}`);

    const reports = await this.reportService.findByBatchExecutionId(batchExecutionId);
    let projectsAnalyzed = 0;
    let totalRecommendations = 0;

    for (const report of reports) {
      try {
        // Get project to find organizationId
        const project = await this.projectService.findById(report.projectId);
        if (!project) {
          this.logger.warn(`Project ${report.projectId} not found`);
          continue;
        }
        
        if (!project.organizationId) {
          this.logger.warn(`Project ${report.projectId} has no organizationId`);
          continue;
        }
        
        const result = await this.analyzeProject(
          report.projectId,
        );
        projectsAnalyzed++;
        totalRecommendations += result.recommendationsGenerated;
      } catch (error) {
        this.logger.error(
          `Failed to analyze project ${report.projectId}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Completed batch recommendation analysis. ` +
      `Analyzed ${projectsAnalyzed} projects, generated ${totalRecommendations} recommendations`
    );

    return {
      projectsAnalyzed,
      totalRecommendations,
    };
  }

  private async saveRecommendations(
    candidates: RecommendationCandidate[],
    projectId: string,
    organizationId: string,
    batchExecutionId: string,
  ) {
    const recommendations = candidates.map(candidate => ({
      projectId,
      organizationId,
      type: candidate.type,
      priority: this.calculatePriority(candidate),
      title: candidate.title,
      description: candidate.description,
      methodology: candidate.methodology,
      evidence: candidate.evidence,
      suggestedActions: candidate.suggestedActions,
      confidenceScore: candidate.confidenceScore,
      impactScore: candidate.impactScore,
      implementationDifficulty: this.calculateDifficulty(candidate),
      status: RecommendationStatus.NEW,
      batchExecutionId,
    }));

    return this.recommendationRepository.createMany(recommendations);
  }

  private calculatePriority(
    candidate: RecommendationCandidate
  ): RecommendationPriority {
    const score = candidate.confidenceScore * candidate.impactScore;
    
    if (score >= 0.8) return RecommendationPriority.CRITICAL;
    if (score >= 0.6) return RecommendationPriority.HIGH;
    if (score >= 0.4) return RecommendationPriority.MEDIUM;
    return RecommendationPriority.LOW;
  }

  private calculateDifficulty(
    candidate: RecommendationCandidate
  ): ImplementationDifficulty {
    const actionCount = candidate.suggestedActions.length;
    
    if (actionCount <= 2) return ImplementationDifficulty.EASY;
    if (actionCount <= 4) return ImplementationDifficulty.MEDIUM;
    return ImplementationDifficulty.HARD;
  }

  private async saveAnalysisMetadata(
    data: Partial<AnalysisMetadata>
  ): Promise<AnalysisMetadata> {
    const metadata = new this.analysisMetadataModel(data);
    return metadata.save();
  }

  private getModelsUsed(report: any): string[] {
    const models = new Set<string>();
    
    // Extract models from metadata
    if (report.metadata?.modelsUsed) {
      report.metadata.modelsUsed.forEach((model: string) => models.add(model));
    }
    
    // Also extract from detailed results if available
    if (report.visibility?.detailedResults) {
      report.visibility.detailedResults.forEach((result: any) => {
        if (result.model) {
          models.add(result.model);
        }
      });
    }
    
    return Array.from(models);
  }

  private getAnalyzerKey(type: string): string {
    const mapping = {
      'entity_gap': 'entityGap',
      'feature_gap': 'featureGap',
      'content_presence': 'contentPresence',
      'localization': 'localization',
      'sentiment_improvement': 'sentimentImprovement',
    };
    
    return (mapping as any)[type] || type;
  }
}