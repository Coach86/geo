"use client";

import { useState, useEffect } from "react";
import { Target, AlertCircle, TrendingUp, Sparkles, CheckCircle, Clock, X, ExternalLink } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useNavigation } from "@/providers/navigation-provider";
import { apiFetch, buildQueryString } from "@/lib/api/utils";
import { API_ENDPOINTS } from "@/lib/api/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface DataPoint {
  metric: string;
  value: string | number | boolean;
  context: string;
}

interface Evidence {
  id: string;
  type: "visibility_data" | "sentiment_data" | "alignment_data" | "competition_data" | "citation_analysis";
  source: string;
  dataPoints: DataPoint[];
  supportingQuotes: string[];
  statisticalSignificance: number;
  collectedAt: string;
}

interface FeatureGapRecommendation {
  id: string;
  projectId: string;
  organizationId: string;
  type: "feature_gap";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  methodology: string;
  evidence: Evidence[];
  suggestedActions: string[];
  confidenceScore: number;
  impactScore: number;
  implementationDifficulty: "easy" | "medium" | "hard";
  status: "new" | "in_progress" | "completed" | "dismissed" | "implemented";
  batchExecutionId: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    recommendations: FeatureGapRecommendation[];
    total: number;
    limit: number;
    offset: number;
  };
}

const priorityColors = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

const statusColors = {
  new: "default",
  in_progress: "secondary",
  completed: "success",
  dismissed: "outline",
  implemented: "success",
} as const;

const difficultyColors = {
  easy: "success",
  medium: "default", 
  hard: "destructive",
} as const;

export default function FeatureGapPage() {
  const { token } = useAuth();
  const { selectedProject } = useNavigation();
  const [recommendations, setRecommendations] = useState<FeatureGapRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggeringAnalysis, setTriggeringAnalysis] = useState(false);

  useEffect(() => {
    if (!selectedProject?.id || !token) return;

    fetchFeatureGapRecommendations();
  }, [selectedProject, token]);

  const fetchFeatureGapRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = buildQueryString({
        projectId: selectedProject?.id,
        // Show all recommendation types, not just feature_gap
        status: 'new,in_progress'
      });
      
      const data: ApiResponse = await apiFetch<ApiResponse>(
        `${API_ENDPOINTS.RECOMMENDATIONS.USER_LIST}${queryParams}`,
        {
          method: 'GET',
          token,
        }
      );
      
      if (data.success) {
        console.log('API Response:', data);
        console.log('Recommendations data:', data.data);
        console.log('Recommendations array:', data.data.recommendations);
        console.log('Is recommendations an array?', Array.isArray(data.data.recommendations));
        setRecommendations(Array.isArray(data.data.recommendations) ? data.data.recommendations : []);
      } else {
        throw new Error("Failed to load recommendations");
      }
    } catch (err) {
      console.error("Error fetching feature gap recommendations:", err);
      setError(err instanceof Error ? err.message : "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const updateRecommendationStatus = async (id: string, status: FeatureGapRecommendation["status"]) => {
    try {
      await apiFetch(
        API_ENDPOINTS.RECOMMENDATIONS.UPDATE_STATUS(id),
        {
          method: 'PATCH',
          token,
          body: JSON.stringify({ status }),
        }
      );

      // Update local state
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === id ? { ...rec, status } : rec
        )
      );
    } catch (err) {
      console.error("Error updating recommendation status:", err);
    }
  };

  const getConfidenceLevel = (score: number) => {
    if (score >= 0.8) return "High";
    if (score >= 0.6) return "Medium";
    return "Low";
  };

  const getImpactLevel = (score: number) => {
    if (score >= 0.8) return "High";
    if (score >= 0.6) return "Medium";
    return "Low";
  };

  const triggerAnalysis = async () => {
    if (!selectedProject?.id || !token) return;
    
    try {
      setTriggeringAnalysis(true);
      setError(null);
      
      await apiFetch(
        API_ENDPOINTS.RECOMMENDATIONS.TRIGGER_ANALYSIS(selectedProject.id),
        {
          method: 'POST',
          token,
        }
      );
      
      // After triggering analysis, refresh the recommendations
      await fetchFeatureGapRecommendations();
    } catch (err) {
      console.error("Error triggering analysis:", err);
      setError(err instanceof Error ? err.message : "Failed to trigger analysis");
    } finally {
      setTriggeringAnalysis(false);
    }
  };

  if (!selectedProject) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a project to view feature gap recommendations.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-100 rounded-lg">
              <Target className="w-6 h-6 text-accent-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI Recommendations
              </h1>
              <p className="text-gray-600 mt-1">
                AI-generated recommendations and competitive insights for {selectedProject.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={fetchFeatureGapRecommendations}
              variant="outline"
              disabled={loading}
            >
              Refresh
            </Button>
            <Button 
              onClick={triggerAnalysis}
              disabled={triggeringAnalysis || loading}
              className="bg-accent-600 hover:bg-accent-700"
            >
              {triggeringAnalysis ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Running Analysis...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent-600">
              {Array.isArray(recommendations) ? recommendations.length : 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">Features identified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Critical/High</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {Array.isArray(recommendations) ? recommendations.filter(r => r.priority === "critical" || r.priority === "high").length : 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">Priority items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Wins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {Array.isArray(recommendations) ? recommendations.filter(r => r.implementationDifficulty === "easy" && r.priority !== "low").length : 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">Easy to implement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {Array.isArray(recommendations) ? recommendations.filter(r => r.status === "in_progress").length : 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">Being addressed</p>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* No Data State */}
      {!loading && !error && Array.isArray(recommendations) && recommendations.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Recommendations Found
            </h3>
            <p className="text-gray-600 mb-4">
              No AI recommendations have been generated for this project yet.
            </p>
            <Button 
              onClick={fetchFeatureGapRecommendations}
              variant="outline"
            >
              Refresh Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recommendations List */}
      {!loading && !error && Array.isArray(recommendations) && recommendations.length > 0 && (
        <div className="space-y-6">
          {Array.isArray(recommendations) && recommendations.map((recommendation) => (
            <Card key={recommendation.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{recommendation.title}</CardTitle>
                      <Badge variant={priorityColors[recommendation.priority]}>
                        {recommendation.priority}
                      </Badge>
                      <Badge variant={statusColors[recommendation.status]}>
                        {recommendation.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={difficultyColors[recommendation.implementationDifficulty]}>
                        {recommendation.implementationDifficulty} to implement
                      </Badge>
                    </div>
                    <CardDescription className="text-base leading-relaxed">
                      {recommendation.description}
                    </CardDescription>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex gap-6 mt-4">
                  <div className="text-sm">
                    <span className="font-medium">Confidence:</span>{" "}
                    <span className="text-gray-600">
                      {getConfidenceLevel(recommendation.confidenceScore)} ({(recommendation.confidenceScore * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Impact:</span>{" "}
                    <span className="text-gray-600">
                      {getImpactLevel(recommendation.impactScore)} ({(recommendation.impactScore * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Suggested Actions */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Suggested Actions
                  </h4>
                  <ul className="space-y-2">
                    {recommendation.suggestedActions.map((action, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 bg-accent-500 rounded-full mt-2 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Evidence */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Supporting Evidence ({recommendation.evidence.length} data points)
                  </h4>
                  <div className="space-y-3">
                    {recommendation.evidence.map((evidence) => (
                      <div key={evidence.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-sm">{evidence.source}</h5>
                          <Badge variant="outline" className="text-xs">
                            {(evidence.statisticalSignificance * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {evidence.dataPoints.slice(0, 3).map((point, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{point.metric}:</span>{" "}
                              <span className="text-gray-600">{point.context}</span>
                            </div>
                          ))}
                          {evidence.dataPoints.length > 3 && (
                            <p className="text-xs text-gray-500">
                              +{evidence.dataPoints.length - 3} more data points
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Methodology */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Analysis Methodology
                  </h4>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    {recommendation.methodology}
                  </p>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Generated on {new Date(recommendation.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    {recommendation.status === "new" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateRecommendationStatus(recommendation.id, "in_progress")}
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Start Working
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateRecommendationStatus(recommendation.id, "dismissed")}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Dismiss
                        </Button>
                      </>
                    )}
                    {recommendation.status === "in_progress" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateRecommendationStatus(recommendation.id, "implemented")}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateRecommendationStatus(recommendation.id, "new")}
                        >
                          Back to New
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}