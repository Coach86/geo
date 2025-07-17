import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  TrendingUp,
  Globe,
  MessageSquare,
  Package,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface Recommendation {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedActions: string[];
  confidenceScore: number;
  impactScore: number;
  status: 'new' | 'in_progress' | 'completed' | 'dismissed';
  implementationDifficulty: 'easy' | 'medium' | 'hard';
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onStatusChange: (id: string, status: string) => void;
  onViewDetails: (id: string) => void;
}

const typeIcons = {
  entity_gap: AlertCircle,
  feature_gap: Package,
  content_presence: Globe,
  localization: Globe,
  sentiment_improvement: MessageSquare,
};

const priorityColors = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

const statusIcons = {
  new: null,
  in_progress: Clock,
  completed: CheckCircle,
  dismissed: XCircle,
};

const difficultyLabels = {
  easy: 'Quick Win',
  medium: 'Moderate Effort',
  hard: 'Major Initiative',
};

export function RecommendationCard({
  recommendation,
  onStatusChange,
  onViewDetails,
}: RecommendationCardProps) {
  const Icon = typeIcons[recommendation.type] || AlertCircle;
  const StatusIcon = statusIcons[recommendation.status];
  
  const getTypeLabel = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getImpactLevel = (score: number) => {
    if (score >= 0.8) return 'Very High';
    if (score >= 0.6) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  };

  return (
    <Card className={`transition-all hover:shadow-lg ${
      recommendation.status === 'dismissed' ? 'opacity-60' : ''
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              recommendation.priority === 'critical' ? 'bg-red-100' :
              recommendation.priority === 'high' ? 'bg-orange-100' :
              recommendation.priority === 'medium' ? 'bg-yellow-100' :
              'bg-green-100'
            }`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg leading-tight">
                {recommendation.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={priorityColors[recommendation.priority]}
                >
                  {recommendation.priority.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(recommendation.type)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {difficultyLabels[recommendation.implementationDifficulty]}
                </Badge>
                {StatusIcon && (
                  <StatusIcon className={`h-4 w-4 ${
                    recommendation.status === 'completed' ? 'text-green-600' :
                    recommendation.status === 'dismissed' ? 'text-gray-400' :
                    'text-blue-600'
                  }`} />
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {recommendation.description}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <div className="flex items-center gap-2">
              <Progress value={recommendation.confidenceScore * 100} className="h-2" />
              <span className="text-xs font-medium">
                {Math.round(recommendation.confidenceScore * 100)}%
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Impact</p>
            <div className="flex items-center gap-2">
              <Progress value={recommendation.impactScore * 100} className="h-2" />
              <span className="text-xs font-medium">
                {getImpactLevel(recommendation.impactScore)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Quick Actions:</p>
          <ul className="space-y-1">
            {recommendation.suggestedActions.slice(0, 2).map((action, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => onViewDetails(recommendation.id)}
            className="flex-1"
          >
            View Details
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          
          {recommendation.status === 'new' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(recommendation.id, 'in_progress')}
            >
              Start Work
            </Button>
          )}
          
          {recommendation.status === 'in_progress' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(recommendation.id, 'completed')}
            >
              Mark Complete
            </Button>
          )}
          
          {recommendation.status !== 'dismissed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange(recommendation.id, 'dismissed')}
            >
              Dismiss
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}