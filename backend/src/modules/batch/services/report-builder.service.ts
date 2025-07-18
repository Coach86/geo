import { Injectable, Logger } from '@nestjs/common';
import {
  SentimentResults,
  AlignmentResults as AccuracyResults,
  CompetitionResults,
  VisibilityResults as SpontaneousResults,
} from '../interfaces/batch.interfaces';
import {
  ExplorerData,
  SentimentData,
  AlignmentData,
  CompetitionData,
} from '../../report/interfaces/report.interfaces';
import { ExplorerDataService } from './explorer-data.service';
import { VisibilityDataService } from './visibility-data.service';
import { SentimentDataService } from './sentiment-data.service';
import { AlignmentCompetitionDataService } from './alignment-competition-data.service';
import { ReportDataUtilitiesService } from './report-data-utilities.service';

/**
 * Main report builder service that delegates to specialized services.
 * Maintains backward compatibility while using the new modular structure.
 */
@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);

  constructor(
    private readonly explorerDataService: ExplorerDataService,
    private readonly visibilityDataService: VisibilityDataService,
    private readonly sentimentDataService: SentimentDataService,
    private readonly alignmentCompetitionDataService: AlignmentCompetitionDataService,
    private readonly reportDataUtilitiesService: ReportDataUtilitiesService,
  ) {}

  /**
   * Build explorer data from all pipeline results
   * Delegates to ExplorerDataService
   */
  public buildExplorerData(
    spontaneousResults: SpontaneousResults,
    sentimentResults: SentimentResults,
    accuracyResults: AccuracyResults,
    comparisonResults: CompetitionResults,
    projectWebsite?: string,
    competitorDetails?: Array<{ name: string; website?: string }>,
  ): ExplorerData {
    return this.explorerDataService.buildExplorerData(
      spontaneousResults,
      sentimentResults,
      accuracyResults,
      comparisonResults,
      projectWebsite,
      competitorDetails,
    );
  }

  /**
   * Build visibility data from visibility results
   * Delegates to VisibilityDataService
   */
  public buildVisibilityData(
    visibilityResults: SpontaneousResults, 
    brandName: string, 
    competitors: string[] = []
  ) {
    return this.visibilityDataService.buildVisibilityData(visibilityResults, brandName, competitors);
  }

  /**
   * Build sentiment data from sentiment results
   * Delegates to SentimentDataService
   */
  public buildSentimentData(sentimentResults: SentimentResults): SentimentData {
    return this.sentimentDataService.buildSentimentData(sentimentResults);
  }

  /**
   * Build alignment data from alignment results
   * Delegates to AlignmentCompetitionDataService
   */
  public buildAlignmentData(accuracyResults: AccuracyResults): AlignmentData {
    return this.alignmentCompetitionDataService.buildAlignmentData(accuracyResults);
  }

  /**
   * Build competition data from competition results
   * Delegates to AlignmentCompetitionDataService
   */
  public buildCompetitionData(
    comparisonResults: CompetitionResults,
    brandName: string,
    competitors: string[]
  ): CompetitionData {
    return this.alignmentCompetitionDataService.buildCompetitionData(comparisonResults, brandName, competitors);
  }

  /**
   * Extract models used from all pipeline results
   */
  extractModelsUsed(
    visibilityResults: SpontaneousResults,
    sentimentResults: SentimentResults,
    alignmentResults: AccuracyResults,
    competitionResults: CompetitionResults,
  ): string[] {
    const models = new Set<string>();
    
    // Extract models from all results
    const allResults = [
      ...(visibilityResults.results || []),
      ...(sentimentResults.results || []),
      ...(alignmentResults.results || []),
      ...(competitionResults.results || [])
    ];
    
    allResults.forEach(result => {
      if (result.llmModel) {
        models.add(result.llmModel);
      }
    });
    
    return Array.from(models);
  }

  /**
   * Count total prompts executed across all results
   * Delegates to ReportDataUtilitiesService
   */
  countPromptsExecuted(
    visibilityResults: SpontaneousResults,
    sentimentResults: SentimentResults,
    alignmentResults: AccuracyResults,
    competitionResults: CompetitionResults,
  ): number {
    return this.reportDataUtilitiesService.countPromptsExecuted(
      visibilityResults,
      sentimentResults,
      alignmentResults,
      competitionResults,
    );
  }

  /**
   * Get LLM versions from results
   */
  getLlmVersions(results: any[]): Record<string, string> {
    const versions: Record<string, string> = {};

    for (const result of results) {
      if (result.llmModel && !versions[result.llmModel]) {
        versions[result.llmModel] = `${result.llmModel.toLowerCase()}-version`;
      }
    }

    return versions;
  }
}