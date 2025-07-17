import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RecommendationCard } from './RecommendationCard';
import { RecommendationDetails } from './RecommendationDetails';
import { useRecommendations } from '@/hooks/useRecommendations';
import { Recommendation } from '@/lib/api/recommendations';
import {
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Download,
  Filter,
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

interface RecommendationsDashboardProps {
  projectId: string;
}

export function RecommendationsDashboard({ projectId }: RecommendationsDashboardProps) {
  const {
    recommendations,
    summary,
    loading,
    error,
    isAnalyzing,
    refetch,
    updateStatus,
    dismiss,
    triggerAnalysis,
  } = useRecommendations({ projectId });

  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');

  const handleStatusChange = (id: string, status: Recommendation['status']) => {
    updateStatus(id, status);
  };

  const exportRecommendations = () => {
    const dataStr = JSON.stringify(filteredRecommendations, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `recommendations-${projectId}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const filteredRecommendations = recommendations.filter((rec: Recommendation) => {
    if (filterType !== 'all' && rec.type !== filterType) return false;
    if (filterPriority !== 'all' && rec.priority !== filterPriority) return false;
    if (filterStatus === 'active' && (rec.status === 'dismissed' || rec.status === 'completed')) return false;
    if (filterStatus === 'completed' && rec.status !== 'completed') return false;
    if (filterStatus === 'dismissed' && rec.status !== 'dismissed') return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedRecommendation) {
    return (
      <RecommendationDetails
        recommendation={selectedRecommendation}
        onBack={() => setSelectedRecommendation(null)}
        onStatusChange={handleStatusChange}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Recommendations</h2>
          <p className="text-muted-foreground">
            Actionable insights to improve your brand's AI visibility
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportRecommendations}
            disabled={recommendations.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={triggerAnalysis}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Recommendations
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  New & Active
                </CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summary.byStatus.new || 0) + (summary.byStatus.in_progress || 0)}
              </div>
              <Progress 
                value={(((summary.byStatus.new || 0) + (summary.byStatus.in_progress || 0)) / summary.total) * 100} 
                className="h-2 mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.byStatus.completed || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(((summary.byStatus.completed || 0) / summary.total) * 100)}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  High Priority
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summary.byPriority.critical || 0) + (summary.byPriority.high || 0)}
              </div>
              <div className="flex gap-2 mt-2">
                <Badge variant="destructive" className="text-xs">
                  {summary.byPriority.critical || 0} Critical
                </Badge>
                <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                  {summary.byPriority.high || 0} High
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recommendations</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="entity_gap">Entity Gap</SelectItem>
                  <SelectItem value="feature_gap">Feature Gap</SelectItem>
                  <SelectItem value="content_presence">Content Presence</SelectItem>
                  <SelectItem value="localization">Localization</SelectItem>
                  <SelectItem value="sentiment_improvement">Sentiment</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecommendations.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No recommendations found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your filters or run a new analysis
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRecommendations.map(recommendation => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onStatusChange={handleStatusChange}
                  onViewDetails={id => {
                    const rec = recommendations.find(r => r.id === id);
                    setSelectedRecommendation(rec);
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}