import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Brain,
  Search,
  Database,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from "lucide-react";

interface ScanResultsDashboardProps {
  scanResults: {
    coverageMetrics?: {
      bm25Coverage: number;
      vectorCoverage: number;
      hybridCoverage: number;
      queriesWithNoResults: string[];
    };
    visibilityPatterns?: Array<{
      type: string;
      percentage: number;
      affectedQueries: string[];
    }>;
    overallStats?: {
      averageOverlap: number;
      averageMrrBm25: number;
      averageMrrVector: number;
      totalQueries: number;
      successfulQueries: number;
    };
  };
}

export default function ScanResultsDashboard({ scanResults }: ScanResultsDashboardProps) {
  const { coverageMetrics, visibilityPatterns, overallStats } = scanResults;

  const getPatternInfo = (type: string) => {
    switch (type) {
      case 'high_bm25_low_vector':
        return {
          label: 'High Keyword, Low Semantic',
          icon: Search,
          color: 'text-yellow-600',
          description: 'Good keyword matches but lacks semantic context'
        };
      case 'high_vector_low_bm25':
        return {
          label: 'High Semantic, Low Keyword',
          icon: Brain,
          color: 'text-blue-600',
          description: 'Rich context but missing exact keywords'
        };
      case 'both_low':
        return {
          label: 'Low Visibility',
          icon: AlertTriangle,
          color: 'text-red-600',
          description: 'Content gaps for these queries'
        };
      case 'both_high':
        return {
          label: 'High Visibility',
          icon: TrendingUp,
          color: 'text-green-600',
          description: 'Excellent coverage for these queries'
        };
      default:
        return {
          label: type,
          icon: Database,
          color: 'text-gray-600',
          description: ''
        };
    }
  };

  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <div className="space-y-6">
      {/* Coverage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="h-4 w-4" />
              BM25 Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatPercentage(coverageMetrics?.bm25Coverage || 0)}
              </div>
              <Progress 
                value={(coverageMetrics?.bm25Coverage || 0) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Keyword-based search coverage
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Vector Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatPercentage(coverageMetrics?.vectorCoverage || 0)}
              </div>
              <Progress 
                value={(coverageMetrics?.vectorCoverage || 0) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Semantic search coverage
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Hybrid Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatPercentage(coverageMetrics?.hybridCoverage || 0)}
              </div>
              <Progress 
                value={(coverageMetrics?.hybridCoverage || 0) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Combined search coverage
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visibility Patterns */}
      {visibilityPatterns && visibilityPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Visibility Patterns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibilityPatterns.map((pattern, index) => {
              const info = getPatternInfo(pattern.type);
              const Icon = info.icon;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${info.color}`} />
                      <span className="font-medium">{info.label}</span>
                    </div>
                    <Badge variant="outline">
                      {formatPercentage(pattern.percentage)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {info.description}
                  </p>
                  <Progress 
                    value={pattern.percentage * 100} 
                    className="h-2"
                  />
                  {pattern.affectedQueries.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Example queries: {pattern.affectedQueries.slice(0, 3).join(', ')}
                      {pattern.affectedQueries.length > 3 && ` +${pattern.affectedQueries.length - 3} more`}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Overall Statistics */}
      {overallStats && (
        <Card>
          <CardHeader>
            <CardTitle>Search Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Queries</p>
                <p className="text-2xl font-bold">{overallStats.totalQueries}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold">{overallStats.successfulQueries}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Overlap</p>
                <p className="text-2xl font-bold">
                  {formatPercentage(overallStats.averageOverlap)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {formatPercentage(overallStats.successfulQueries / overallStats.totalQueries)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results Warning */}
      {coverageMetrics?.queriesWithNoResults && coverageMetrics.queriesWithNoResults.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Queries with No Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              These queries returned no results in either search method:
            </p>
            <div className="space-y-1">
              {coverageMetrics.queriesWithNoResults.slice(0, 10).map((query, index) => (
                <div key={index} className="text-sm bg-red-50 px-3 py-1 rounded">
                  "{query}"
                </div>
              ))}
              {coverageMetrics.queriesWithNoResults.length > 10 && (
                <p className="text-sm text-muted-foreground italic">
                  ...and {coverageMetrics.queriesWithNoResults.length - 10} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}