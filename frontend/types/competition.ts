export interface CompetitionData {
  competitorAnalyses: {
    competitor: string;
    analysisByModel: {
      model: string;
      strengths: string[];
      weaknesses: string[];
    }[];
  }[];
  commonStrengths: string[];
  commonWeaknesses: string[];
}
