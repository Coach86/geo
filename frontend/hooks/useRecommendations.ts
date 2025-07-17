import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { recommendationsApi, Recommendation, RecommendationSummary } from '@/lib/api/recommendations';
import { useToast } from '@/components/ui/use-toast';

interface UseRecommendationsOptions {
  projectId?: string;
  autoRefresh?: boolean;
}

interface UseRecommendationsReturn {
  recommendations: Recommendation[];
  summary: RecommendationSummary | null;
  loading: boolean;
  error: Error | null;
  isAnalyzing: boolean;
  refetch: () => void;
  updateStatus: (id: string, status: Recommendation['status']) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  triggerAnalysis: () => Promise<void>;
}

export function useRecommendations(options: UseRecommendationsOptions = {}): UseRecommendationsReturn {
  const { projectId, autoRefresh = true } = options;
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState<RecommendationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [recommendationsData, summaryData] = await Promise.all([
        recommendationsApi.getRecommendations(projectId ? { projectId } : {}),
        projectId ? recommendationsApi.getProjectSummary(projectId) : null,
      ]);

      setRecommendations(recommendationsData.recommendations);
      if (summaryData) {
        setSummary(summaryData);
      }
    } catch (err) {
      setError(err as Error);
      toast({
        title: 'Error',
        description: 'Failed to load recommendations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  const updateStatus = async (id: string, status: Recommendation['status']) => {
    try {
      const updated = await recommendationsApi.updateStatus(id, status);
      
      setRecommendations(prev =>
        prev.map(rec => rec.id === id ? updated : rec)
      );

      // Update summary counts
      if (summary) {
        const oldRec = recommendations.find(r => r.id === id);
        if (oldRec) {
          setSummary(prev => {
            if (!prev) return prev;
            const newSummary = { ...prev };
            
            // Update status counts
            newSummary.byStatus[oldRec.status] = (newSummary.byStatus[oldRec.status] || 1) - 1;
            newSummary.byStatus[status] = (newSummary.byStatus[status] || 0) + 1;
            
            return newSummary;
          });
        }
      }

      toast({
        title: 'Status Updated',
        description: `Recommendation marked as ${status}`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update recommendation status',
        variant: 'destructive',
      });
    }
  };

  const dismiss = async (id: string) => {
    try {
      await recommendationsApi.dismiss(id);
      
      setRecommendations(prev =>
        prev.map(rec => rec.id === id 
          ? { ...rec, status: 'dismissed' as const }
          : rec
        )
      );

      toast({
        title: 'Recommendation Dismissed',
        description: 'The recommendation has been dismissed',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to dismiss recommendation',
        variant: 'destructive',
      });
    }
  };

  const triggerAnalysis = async () => {
    if (!projectId) return;

    try {
      setIsAnalyzing(true);
      const result = await recommendationsApi.triggerAnalysis(projectId);
      
      toast({
        title: 'Analysis Started',
        description: 'Analyzing your brand data...',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to start analysis',
        variant: 'destructive',
      });
      setIsAnalyzing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Socket.IO event handlers
  useEffect(() => {
    if (!socket || !isConnected || !projectId || !autoRefresh) return;

    // Subscribe to project events
    socket.emit('subscribeToProject', { projectId });

    // Handle real-time updates
    socket.on('recommendationCreated', (data) => {
      if (data.projectId === projectId) {
        setRecommendations(prev => [...prev, data.recommendation]);
        
        toast({
          title: 'New Recommendation',
          description: `${data.recommendation.title}`,
        });
      }
    });

    socket.on('recommendationUpdated', (data) => {
      if (data.projectId === projectId) {
        setRecommendations(prev =>
          prev.map(rec => rec.id === data.recommendation.id 
            ? { ...rec, ...data.recommendation }
            : rec
          )
        );
      }
    });

    socket.on('analysisStarted', (data) => {
      if (data.projectId === projectId) {
        setIsAnalyzing(true);
      }
    });

    socket.on('analysisProgress', (data) => {
      if (data.projectId === projectId) {
        toast({
          title: 'Analysis Progress',
          description: `Analyzing ${data.progress.currentAnalyzer} (${data.progress.analyzersCompleted}/${data.progress.totalAnalyzers})`,
        });
      }
    });

    socket.on('analysisCompleted', (data) => {
      if (data.projectId === projectId) {
        setIsAnalyzing(false);
        
        toast({
          title: 'Analysis Complete',
          description: `Generated ${data.result.recommendationsGenerated} new recommendations`,
        });

        // Refresh recommendations
        fetchRecommendations();
      }
    });

    // Cleanup
    return () => {
      socket.emit('unsubscribeFromProject', { projectId });
      socket.off('recommendationCreated');
      socket.off('recommendationUpdated');
      socket.off('analysisStarted');
      socket.off('analysisProgress');
      socket.off('analysisCompleted');
    };
  }, [socket, isConnected, projectId, autoRefresh, fetchRecommendations, toast]);

  return {
    recommendations,
    summary,
    loading,
    error,
    isAnalyzing,
    refetch: fetchRecommendations,
    updateStatus,
    dismiss,
    triggerAnalysis,
  };
}