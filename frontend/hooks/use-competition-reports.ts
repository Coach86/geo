import { useState, useEffect, useMemo } from 'react';
import { getAggregatedCompetition } from '@/lib/api/report';
import { AggregatedCitations } from '@/types/citations';

interface CompetitionData {
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

interface UseCompetitionReportsReturn {
  loading: boolean;
  error: string | null;
  competitionData: CompetitionData | null;
  citations?: AggregatedCitations;
  availableModels: string[];
  brandName: string;
}

export function useCompetitionReports(
  projectId: string | null,
  selectedModels: string[],
  token: string | null,
  isAllTime: boolean = false,
  dateRange?: { startDate: Date; endDate: Date }
): UseCompetitionReportsReturn {
  const [aggregatedData, setAggregatedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch aggregated competition data
  useEffect(() => {
    const fetchAggregatedData = async () => {
      if (!token || !dateRange || !projectId) {
        setAggregatedData(null);
        return;
      }
      
      const startDate = dateRange.startDate.toISOString();
      const endDate = dateRange.endDate.toISOString();

      setLoading(true);
      setError(null);

      try {
        const data = await getAggregatedCompetition(projectId, token, {
          startDate,
          endDate,
          models: selectedModels,
          includeVariation: !isAllTime
        });

        setAggregatedData(data);
      } catch (err: any) {
        console.error('Error fetching aggregated competition data:', err);
        setError(err.message || 'Failed to load competition data');
        setAggregatedData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAggregatedData();
  }, [dateRange, selectedModels, token, isAllTime, projectId]);

  // Process the data
  const result = useMemo(() => {
    if (!aggregatedData) {
      return {
        loading: false,
        error: null,
        competitionData: null,
        citations: undefined,
        availableModels: [],
        brandName: 'Brand'
      };
    }

    // Transform the aggregated data to match CompetitionData interface
    const competitionData: CompetitionData = {
      competitorAnalyses: aggregatedData.competitorInsights?.map((insight: any) => ({
        competitor: insight.competitor,
        analysisByModel: aggregatedData.availableModels?.map((model: string) => ({
          model,
          strengths: insight.topStrengths || [],
          weaknesses: insight.topWeaknesses || []
        })) || []
      })) || [],
      commonStrengths: aggregatedData.commonStrengths || [],
      commonWeaknesses: aggregatedData.commonWeaknesses || []
    };

    return {
      loading: false,
      error: null,
      competitionData,
      citations: aggregatedData.citations,
      availableModels: aggregatedData.availableModels || [],
      brandName: aggregatedData.brandName || 'Brand'
    };
  }, [aggregatedData]);

  return {
    loading,
    error,
    ...result
  };
}