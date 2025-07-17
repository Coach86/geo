import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  BarChart3,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface Evidence {
  type: string;
  source: string;
  dataPoints: Array<{
    metric: string;
    value: any;
    context: string;
  }>;
  supportingQuotes: string[];
  statisticalSignificance: number;
}

interface Recommendation {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  methodology: string;
  evidence: Evidence[];
  suggestedActions: string[];
  confidenceScore: number;
  impactScore: number;
  status: 'new' | 'in_progress' | 'completed' | 'dismissed';
  implementationDifficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
  updatedAt: string;
}

interface RecommendationDetailsProps {
  recommendation: Recommendation;
  onBack: () => void;
  onStatusChange: (id: string, status: string) => void;
}

export function RecommendationDetails({
  recommendation,
  onBack,
  onStatusChange,
}: RecommendationDetailsProps) {
  const [notes, setNotes] = useState('');
  const [completedActions, setCompletedActions] = useState<Set<number>>(new Set());

  const handleActionToggle = (index: number) => {
    const newCompleted = new Set(completedActions);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedActions(newCompleted);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Add toast notification
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Recommendations
        </Button>
      </div>

      {/* Title Card */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(recommendation.status)}
                  <CardTitle className="text-2xl">
                    {recommendation.title}
                  </CardTitle>
                </div>
                <p className="text-muted-foreground">
                  {recommendation.description}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge
                  variant={recommendation.priority === 'critical' ? 'destructive' : 'outline'}
                  className="justify-center"
                >
                  {recommendation.priority.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="justify-center">
                  {getTypeLabel(recommendation.type)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={recommendation.confidenceScore * 100} className="h-2 flex-1" />
                  <span className="text-sm font-medium">
                    {Math.round(recommendation.confidenceScore * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Impact</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={recommendation.impactScore * 100} className="h-2 flex-1" />
                  <span className="text-sm font-medium">
                    {Math.round(recommendation.impactScore * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Difficulty</p>
                <p className="text-sm font-medium mt-1 capitalize">
                  {recommendation.implementationDifficulty}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm font-medium mt-1">
                  {formatDate(recommendation.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="actions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="methodology">Methodology</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Suggested Actions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Follow these steps to address this recommendation
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendation.suggestedActions.map((action, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    completedActions.has(index) ? 'bg-green-50 border-green-200' : ''
                  }`}
                >
                  <Checkbox
                    checked={completedActions.has(index)}
                    onCheckedChange={() => handleActionToggle(index)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm ${
                      completedActions.has(index) ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {action}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(action)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Progress: {completedActions.size} of {recommendation.suggestedActions.length} completed
                </p>
                <div className="flex gap-2">
                  {recommendation.status !== 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange(recommendation.id, 'completed')}
                      disabled={completedActions.size < recommendation.suggestedActions.length}
                    >
                      Mark as Completed
                    </Button>
                  )}
                  {recommendation.status === 'new' && (
                    <Button
                      size="sm"
                      onClick={() => onStatusChange(recommendation.id, 'in_progress')}
                    >
                      Start Working
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          {recommendation.evidence.map((evidence, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{evidence.source}</CardTitle>
                  <Badge variant="outline">
                    {evidence.type.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Data Points</p>
                  <div className="space-y-2">
                    {evidence.dataPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <BarChart3 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{point.metric}</p>
                          <p className="text-sm text-muted-foreground">{point.context}</p>
                          <p className="text-sm font-mono mt-1">
                            Value: {typeof point.value === 'number' 
                              ? point.value.toFixed(3) 
                              : point.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {evidence.supportingQuotes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Supporting Quotes</p>
                    <div className="space-y-2">
                      {evidence.supportingQuotes.map((quote, idx) => (
                        <blockquote key={idx} className="border-l-4 border-primary pl-4 italic text-sm">
                          "{quote}"
                        </blockquote>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Statistical Significance
                  </p>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={evidence.statisticalSignificance * 100} 
                      className="h-2 w-24" 
                    />
                    <span className="text-sm font-medium">
                      {Math.round(evidence.statisticalSignificance * 100)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="methodology" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analysis Methodology</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {recommendation.methodology}
              </p>
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Key Metrics Used</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from(new Set(
                    recommendation.evidence.flatMap(e => 
                      e.dataPoints.map(dp => dp.metric)
                    )
                  )).map(metric => (
                    <div key={metric} className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-primary rounded-full" />
                      <span className="text-sm">{metric.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Implementation Notes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Add notes about your implementation progress
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add your notes here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[200px]"
              />
              <div className="flex justify-end">
                <Button size="sm">
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant={recommendation.status === 'new' ? 'default' : 'outline'}
              onClick={() => onStatusChange(
                recommendation.id,
                recommendation.status === 'new' ? 'in_progress' : 'new'
              )}
            >
              {recommendation.status === 'new' ? 'Start Work' : 'Reset Status'}
            </Button>
            {recommendation.status === 'in_progress' && (
              <Button
                variant="outline"
                onClick={() => onStatusChange(recommendation.id, 'completed')}
              >
                Mark Complete
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={() => onStatusChange(recommendation.id, 'dismissed')}
          >
            Dismiss Recommendation
          </Button>
        </div>
      </Card>
    </div>
  );
}