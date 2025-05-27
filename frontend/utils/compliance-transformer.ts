import type {
  ComplianceResults,
  ComplianceSummary,
  DetailedComplianceResult,
  AttributeScore,
  AttributeAlignmentSummaryItem,
} from "@/types/compliance";

// Transform API accord data to compliance format
export function transformAccordToCompliance(accordData: any, accuracyData?: any): ComplianceResults {
  if (!accordData) {
    throw new Error("No accord data available in report");
  }

  const attributes = accordData.attributes || [];
  
  // Calculate overall compliance score from accord score
  const scoreMatch = accordData.score?.value?.match(/(\d+)/);
  const overallComplianceScore = scoreMatch ? parseFloat(scoreMatch[1]) / 10 : 0;

  // Transform attributes to alignment summary
  const attributeAlignmentSummary: AttributeAlignmentSummaryItem[] = attributes.map((attr: any) => ({
    name: attr.name,
    mentionRate: attr.rate,
    alignment: attr.alignment,
  }));

  // Calculate average attribute scores
  const averageAttributeScores: Record<string, number> = {};
  attributes.forEach((attr: any) => {
    const rate = parseFloat(attr.rate) / 100;
    averageAttributeScores[attr.name] = rate;
  });

  const summary: ComplianceSummary = {
    overallComplianceScore,
    averageAttributeScores,
    attributeAlignmentSummary,
  };

  // Create detailed results for the attribute scores table
  const detailedResults: DetailedComplianceResult[] = [];
  
  // If we have accuracy data, use it directly (same structure as AccuracyTab)
  if (accuracyData?.results && Array.isArray(accuracyData.results)) {
    // Use the actual accuracy results from batch execution
    accuracyData.results.forEach((result: any) => {
      detailedResults.push({
        llmProvider: result.llmProvider,
        promptIndex: result.promptIndex,
        originalPrompt: result.originalPrompt,
        llmResponse: result.llmResponse,
        attributeScores: result.attributeScores || [],
        citations: result.citations || [],
        toolUsage: result.toolUsage || [],
        error: result.error,
      });
    });
    
    return { summary, detailedResults };
  }
  
  // If no accuracy data available, return empty results
  return { summary, detailedResults: [] };
}