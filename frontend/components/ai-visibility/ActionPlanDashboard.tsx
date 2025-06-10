import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Target, 
  TrendingUp,
  AlertCircle,
  FileText,
  Lightbulb,
  Zap
} from "lucide-react";

interface ActionItem {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  problem: string;
  solution: string;
  specificContent: string;
  targetPage: string;
  timeline: string;
  completed: boolean;
  estimatedImpact: 'high' | 'medium' | 'low';
  validation?: {
    tested: boolean;
    beforeScore: { bm25: number; vector: number; };
    afterScore: { bm25: number; vector: number; };
    improvement: number;
    affectedQueries: string[];
  };
}

interface ActionPlan {
  scanId: string;
  projectId: string;
  generatedAt: string;
  overallScore: {
    current: number;
    projected: number;
  };
  phases: Array<{
    name: string;
    duration: string;
    items: ActionItem[];
  }>;
  totalItems: number;
  estimatedTimeToComplete: string;
}

interface ActionPlanDashboardProps {
  actionPlan: ActionPlan;
  projectInfo: {
    brandName: string;
    industry: string;
    website: string;
  };
  onMarkComplete: (actionId: string) => void;
  onGenerateNewPlan?: () => void;
}

export default function ActionPlanDashboard({ 
  actionPlan, 
  projectInfo, 
  onMarkComplete,
  onGenerateNewPlan 
}: ActionPlanDashboardProps) {
  const [selectedPhase, setSelectedPhase] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'content-gaps': return <FileText className="h-4 w-4" />;
      case 'brand-visibility': return <Target className="h-4 w-4" />;
      case 'semantic-optimization': return <Lightbulb className="h-4 w-4" />;
      case 'competitor-analysis': return <TrendingUp className="h-4 w-4" />;
      case 'technical-seo': return <Zap className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const completedItems = actionPlan.phases.reduce((sum, phase) => 
    sum + phase.items.filter(item => item.completed).length, 0
  );
  const completionPercentage = (completedItems / actionPlan.totalItems) * 100;

  const projectedImprovement = actionPlan.overallScore.projected - actionPlan.overallScore.current;

  return (
    <div className="space-y-6">
      {/* Header Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              AI Visibility Action Plan - {projectInfo.brandName}
            </div>
            <Badge variant="outline">
              Generated {new Date(actionPlan.generatedAt).toLocaleDateString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{actionPlan.totalItems}</p>
              <p className="text-sm text-muted-foreground">Total Actions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{completedItems}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                +{(projectedImprovement * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-muted-foreground">Expected Improvement</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{actionPlan.estimatedTimeToComplete}</p>
              <p className="text-sm text-muted-foreground">Est. Timeline</p>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {completionPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Score Projection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Visibility Score Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Score</p>
              <p className="text-3xl font-bold text-gray-600">
                {(actionPlan.overallScore.current * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Projected Score</p>
              <p className="text-3xl font-bold text-green-600">
                {(actionPlan.overallScore.projected * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <TrendingUp className="h-4 w-4 inline mr-1" />
              Implementing this action plan could improve your AI visibility by {(projectedImprovement * 100).toFixed(0)} percentage points
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Plan Phases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Implementation Phases
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('completed')}
              >
                Completed
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedPhase.toString()} onValueChange={(value) => setSelectedPhase(parseInt(value))}>
            <TabsList className="grid w-full grid-cols-3">
              {actionPlan.phases.map((phase, index) => (
                <TabsTrigger key={index} value={index.toString()}>
                  {phase.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {actionPlan.phases.map((phase, phaseIndex) => (
              <TabsContent key={phaseIndex} value={phaseIndex.toString()}>
                <div className="space-y-4">
                  {/* Phase Overview */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h3 className="font-semibold">{phase.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Duration: {phase.duration} • {phase.items.length} actions
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{phase.duration}</span>
                    </div>
                  </div>

                  {/* Action Items */}
                  <div className="space-y-3">
                    {phase.items
                      .filter(item => {
                        if (filter === 'completed') return item.completed;
                        if (filter === 'pending') return !item.completed;
                        return true;
                      })
                      .map((item) => (
                        <Card key={item.id} className={`${item.completed ? 'bg-green-50 border-green-200' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={item.completed}
                                onCheckedChange={() => onMarkComplete(item.id)}
                                className="mt-1"
                              />
                              
                              <div className="flex-1 space-y-2">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    {getCategoryIcon(item.category)}
                                    <h4 className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                                      {item.title}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`} />
                                    <Badge variant="outline" className="text-xs">
                                      {item.priority}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {item.timeline}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Problem & Solution */}
                                <div className="text-sm text-muted-foreground">
                                  <p><strong>Problem:</strong> {item.problem}</p>
                                  <p><strong>Solution:</strong> {item.solution}</p>
                                </div>

                                {/* Target Page */}
                                <div className="flex items-center gap-2 text-sm">
                                  <Badge variant="outline" className="text-xs">
                                    {item.targetPage}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {item.estimatedImpact} impact
                                  </Badge>
                                </div>

                                {/* Expandable Content */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpanded(item.id)}
                                  className="h-auto p-1 text-blue-600"
                                >
                                  {expandedItems.has(item.id) ? 'Hide' : 'Show'} Implementation Details
                                </Button>

                                {expandedItems.has(item.id) && (
                                  <div className="mt-3 space-y-3">
                                    {/* Validation Scores */}
                                    {item.validation ? (
                                      <div className="p-3 bg-green-50 rounded-lg">
                                        <h5 className="font-medium text-sm mb-2 text-green-900">
                                          Projected Improvement Analysis
                                        </h5>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                          <div>
                                            <p className="text-muted-foreground mb-1">Current Performance</p>
                                            <div className="space-y-1">
                                              <div className="flex justify-between">
                                                <span>BM25:</span>
                                                <span className="font-mono">{(item.validation.beforeScore.bm25 * 100).toFixed(1)}%</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Vector:</span>
                                                <span className="font-mono">{(item.validation.beforeScore.vector * 100).toFixed(1)}%</span>
                                              </div>
                                            </div>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground mb-1">After Implementation</p>
                                            <div className="space-y-1">
                                              <div className="flex justify-between">
                                                <span>BM25:</span>
                                                <span className="font-mono text-green-600">
                                                  {(item.validation.afterScore.bm25 * 100).toFixed(1)}%
                                                  {item.validation.afterScore.bm25 > item.validation.beforeScore.bm25 && " ↑"}
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Vector:</span>
                                                <span className="font-mono text-green-600">
                                                  {(item.validation.afterScore.vector * 100).toFixed(1)}%
                                                  {item.validation.afterScore.vector > item.validation.beforeScore.vector && " ↑"}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-green-200">
                                          <div className="flex items-center justify-between">
                                            <span className="text-green-900 font-medium">Total Improvement:</span>
                                            <span className="text-green-600 font-bold">
                                              +{(item.validation.improvement * 100).toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>
                                        {item.validation.affectedQueries && item.validation.affectedQueries.length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-green-200">
                                            <p className="text-xs text-green-800 mb-1">Tested on queries:</p>
                                            <div className="flex flex-wrap gap-1">
                                              {item.validation.affectedQueries.slice(0, 3).map((query, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                  "{query}"
                                                </Badge>
                                              ))}
                                              {item.validation.affectedQueries.length > 3 && (
                                                <Badge variant="secondary" className="text-xs">
                                                  +{item.validation.affectedQueries.length - 3} more
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="p-3 bg-gray-50 rounded-lg">
                                        <h5 className="font-medium text-sm mb-2 text-gray-700">
                                          Projected Improvement Analysis
                                        </h5>
                                        <p className="text-sm text-gray-600">
                                          Validation pending. The system will analyze how this content would improve your search rankings.
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* Content to Add */}
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                      <h5 className="font-medium text-sm mb-2">Specific Content to Add:</h5>
                                      <div className="text-sm whitespace-pre-wrap bg-white p-3 rounded border">
                                        {item.specificContent}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={onGenerateNewPlan} variant="outline">
          Generate Updated Plan
        </Button>
        <Button>
          Export Action Plan
        </Button>
        <Button variant="secondary">
          Schedule Review
        </Button>
      </div>
    </div>
  );
}