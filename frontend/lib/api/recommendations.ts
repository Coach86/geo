import { apiClient } from '../api-client';

export interface Recommendation {
  id: string;
  projectId: string;
  organizationId: string;
  type: 'entity_gap' | 'feature_gap' | 'content_presence' | 'localization' | 'sentiment_improvement';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  methodology: string;
  evidence: Evidence[];
  suggestedActions: string[];
  confidenceScore: number;
  impactScore: number;
  implementationDifficulty: 'easy' | 'medium' | 'hard';
  status: 'new' | 'in_progress' | 'completed' | 'dismissed' | 'implemented';
  batchExecutionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  type: 'visibility_data' | 'sentiment_data' | 'alignment_data' | 'competition_data' | 'citation_analysis';
  source: string;
  dataPoints: DataPoint[];
  supportingQuotes: string[];
  statisticalSignificance: number;
  collectedAt: string;
}

export interface DataPoint {
  metric: string;
  value: any;
  context: string;
}

export interface RecommendationSummary {
  total: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  lastAnalyzed: string | null;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  total: number;
  limit: number;
  offset: number;
}

export interface RecommendationFilters {
  projectId?: string;
  type?: string;
  status?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}

export const recommendationsApi = {
  // Get all recommendations with filters
  async getRecommendations(filters: RecommendationFilters = {}): Promise<RecommendationsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/recommendations?${params.toString()}`);
    return response.data;
  },

  // Get a single recommendation
  async getRecommendation(id: string): Promise<Recommendation> {
    const response = await apiClient.get(`/recommendations/${id}`);
    return response.data;
  },

  // Update recommendation status
  async updateStatus(id: string, status: Recommendation['status']): Promise<Recommendation> {
    const response = await apiClient.patch(`/recommendations/${id}/status`, { status });
    return response.data;
  },

  // Dismiss a recommendation
  async dismiss(id: string): Promise<Recommendation> {
    const response = await apiClient.post(`/recommendations/${id}/dismiss`);
    return response.data;
  },

  // Delete a recommendation
  async deleteRecommendation(id: string): Promise<void> {
    await apiClient.delete(`/recommendations/${id}`);
  },

  // Get project recommendation summary
  async getProjectSummary(projectId: string): Promise<RecommendationSummary> {
    const response = await apiClient.get(`/recommendations/project/${projectId}/summary`);
    return response.data;
  },

  // Trigger analysis for a project
  async triggerAnalysis(projectId: string): Promise<{ message: string; recommendationsGenerated: number }> {
    const response = await apiClient.post(`/recommendations/project/${projectId}/analyze`);
    return response.data;
  },

  // User endpoints (for non-admin users)
  async getUserRecommendations(filters: RecommendationFilters = {}): Promise<RecommendationsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/user/recommendations?${params.toString()}`);
    return response.data;
  },

  async getUserSummary(): Promise<{
    totalRecommendations: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
    projects: string[];
  }> {
    const response = await apiClient.get('/user/recommendations/summary');
    return response.data;
  },

  async getProjectRecommendations(projectId: string, type?: string, limit?: number): Promise<RecommendationsResponse> {
    const params = new URLSearchParams({ projectId });
    if (type) params.append('type', type);
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get(`/user/recommendations/project/${projectId}?${params.toString()}`);
    return response.data;
  },
};