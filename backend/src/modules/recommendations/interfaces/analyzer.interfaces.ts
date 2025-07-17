import { BrandReport } from '../../report/schemas/brand-report.schema';
import { RecommendationCandidate, RecommendationType } from './recommendation.interfaces';

export interface BaseAnalyzer {
  analyzeProject(
    projectId: string,
    brandReport: BrandReport
  ): Promise<RecommendationCandidate[]>;
  
  getAnalyzerType(): RecommendationType;
  
  getConfidenceThreshold(): number;
}