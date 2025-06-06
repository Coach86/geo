import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  FileText,
  Download
} from "lucide-react";

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  type: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  affectedPages: string[];
}

interface AIOptimizationPanelProps {
  recommendations: Recommendation[];
}

export default function AIOptimizationPanel({ recommendations }: AIOptimizationPanelProps) {
  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          color: 'destructive',
          icon: AlertCircle,
          label: 'High Priority'
        };
      case 'medium':
        return {
          color: 'warning',
          icon: Clock,
          label: 'Medium Priority'
        };
      case 'low':
        return {
          color: 'secondary',
          icon: CheckCircle,
          label: 'Low Priority'
        };
      default:
        return {
          color: 'outline',
          icon: Lightbulb,
          label: priority
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'keyword_optimization':
        return '🔍';
      case 'semantic_optimization':
        return '🧠';
      case 'context_enrichment':
        return '📝';
      case 'content_gaps':
        return '🚫';
      case 'structured_data':
        return '📊';
      case 'content_structure':
        return '🏗️';
      default:
        return '💡';
    }
  };

  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    if (!acc[rec.priority]) {
      acc[rec.priority] = [];
    }
    acc[rec.priority].push(rec);
    return acc;
  }, {} as Record<string, Recommendation[]>);

  const exportRecommendations = () => {
    const content = recommendations.map(rec => 
      `${rec.title}\n` +
      `Priority: ${rec.priority}\n` +
      `Description: ${rec.description}\n` +
      `Impact: ${rec.impact}\n` +
      `Effort: ${rec.effort}\n` +
      `Affected Pages: ${rec.affectedPages.join(', ')}\n` +
      `---\n`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-visibility-recommendations.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Optimization Recommendations</h3>
          <p className="text-sm text-muted-foreground">
            Actionable insights to improve your AI visibility
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportRecommendations}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {['high', 'medium', 'low'].map(priority => {
        const recs = groupedRecommendations[priority];
        if (!recs || recs.length === 0) return null;

        const priorityInfo = getPriorityInfo(priority);
        const Icon = priorityInfo.icon;

        return (
          <div key={priority} className="space-y-4">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <h4 className="font-medium">{priorityInfo.label}</h4>
              <Badge variant={priorityInfo.color as any}>
                {recs.length} {recs.length === 1 ? 'item' : 'items'}
              </Badge>
            </div>

            <div className="space-y-3">
              {recs.map((rec, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="text-xl">{getTypeIcon(rec.type)}</span>
                      {rec.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{rec.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Impact:</span>
                        <p className="text-muted-foreground">{rec.impact}</p>
                      </div>
                      <div>
                        <span className="font-medium">Effort:</span>
                        <p className="text-muted-foreground">{rec.effort}</p>
                      </div>
                    </div>

                    {rec.affectedPages.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Affected Pages:</p>
                        <div className="space-y-1">
                          {rec.affectedPages.map((page, pageIndex) => (
                            <div key={pageIndex} className="text-xs text-muted-foreground flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span className="truncate">{page}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button size="sm" variant="outline" className="w-full">
                      View Implementation Guide
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {recommendations.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No recommendations available yet. Run a scan to get optimization insights.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}