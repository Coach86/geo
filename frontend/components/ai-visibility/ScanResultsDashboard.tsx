import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { 
  Brain,
  Search,
  Database,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  Info,
  HelpCircle
} from "lucide-react";

interface QueryPerformance {
  query: string;
  queryType: string;
  bm25Mrr: number;
  vectorMrr: number;
  hybridMrr: number;
  overlapCount: number;
  bm25TopUrl?: string;
  vectorTopUrl?: string;
  hybridTopUrl?: string;
}

// Helper functions for chart data generation
function generateMRRDistribution(queryResults: QueryPerformance[]) {
  const ranges = [
    { range: "0.0", min: 0, max: 0 },
    { range: "0.1-0.2", min: 0.1, max: 0.2 },
    { range: "0.3-0.4", min: 0.3, max: 0.4 },
    { range: "0.5-0.6", min: 0.5, max: 0.6 },
    { range: "0.7-0.8", min: 0.7, max: 0.8 },
    { range: "0.9-1.0", min: 0.9, max: 1.0 }
  ];

  return ranges.map(({ range, min, max }) => {
    const bm25Count = queryResults.filter(q => {
      if (min === 0 && max === 0) return q.bm25Mrr === 0;
      return q.bm25Mrr > min && q.bm25Mrr <= max;
    }).length;

    const vectorCount = queryResults.filter(q => {
      if (min === 0 && max === 0) return q.vectorMrr === 0;
      return q.vectorMrr > min && q.vectorMrr <= max;
    }).length;

    return {
      range,
      bm25Count,
      vectorCount
    };
  });
}

function generateOverlapDistribution(queryResults: QueryPerformance[]) {
  const ranges = [
    { range: "0%", min: 0, max: 0 },
    { range: "1-20%", min: 1, max: 20 },
    { range: "21-40%", min: 21, max: 40 },
    { range: "41-60%", min: 41, max: 60 },
    { range: "61-80%", min: 61, max: 80 },
    { range: "81-100%", min: 81, max: 100 }
  ];

  return ranges.map(({ range, min, max }) => {
    const count = queryResults.filter(q => {
      if (min === 0 && max === 0) return q.overlapCount === 0;
      return q.overlapCount >= min && q.overlapCount <= max;
    }).length;

    return {
      range,
      count
    };
  });
}

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
    queryResults?: any[]; // Raw query results from backend
    methodology?: {
      mrrExplanation: string;
      coverageExplanation: string;
      scoreThresholds: {
        bm25: number;
        vector: number;
      };
    };
  };
  onGenerateActionPlan?: (scanId: string) => void;
}

export default function ScanResultsDashboard({ scanResults, onGenerateActionPlan }: ScanResultsDashboardProps) {
  const { coverageMetrics, visibilityPatterns, overallStats, queryResults: rawQueryResults, methodology } = scanResults;
  const [sortField, setSortField] = useState<keyof QueryPerformance>("query");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [activeTab, setActiveTab] = useState("overview");
  const [showMethodology, setShowMethodology] = useState(false);

  // Transform raw query results to the format expected by the component
  const queryResults: QueryPerformance[] = rawQueryResults?.map(result => ({
    query: result.query,
    queryType: result.intent,
    bm25Mrr: result.mrr.bm25,
    vectorMrr: result.mrr.vector,
    hybridMrr: result.mrr.hybrid || 0,
    overlapCount: Math.round(result.overlap * 100),
    bm25TopUrl: result.bm25Results.documents[0]?.url,
    vectorTopUrl: result.vectorResults.documents[0]?.url,
    hybridTopUrl: result.hybridResults?.documents[0]?.url,
  })) || [];

  const handleSort = (field: keyof QueryPerformance) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedQueryResults = queryResults ? [...queryResults].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  }) : [];

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
      case 'perfect_mrr':
        return {
          label: 'Perfect Rankings',
          icon: CheckCircle,
          color: 'text-purple-600',
          description: 'Your content appears as the #1 result'
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
      {/* Methodology Explanation */}
      {methodology && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span>How We Calculate Your AI Visibility (Simple Explanation)</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMethodology(!showMethodology)}
                className="h-auto p-1"
              >
                {showMethodology ? "Hide" : "Show"} Details
              </Button>
            </CardTitle>
          </CardHeader>
          {showMethodology && (
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-1 flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  Coverage Scores: "How Often We Find Your Content"
                </h4>
                <p className="text-muted-foreground">
                  We test 50 different questions related to your business. Coverage shows what percentage of those questions 
                  return relevant results from your website. Higher coverage = AI assistants are more likely to find your content.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1 flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  MRR Scores: "How High You Rank"
                </h4>
                <p className="text-muted-foreground">
                  MRR measures how early your content appears in search results. A score of 1.0 means you're #1, 
                  0.5 means you're #2, 0.33 means you're #3, etc. We use stricter quality thresholds to ensure only truly relevant results count.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">What We Consider "Good Enough"</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-white rounded p-2">
                    <p className="font-medium">Keyword Search</p>
                    <p className="text-muted-foreground">Content must score {methodology.scoreThresholds.bm25}+ to count as relevant</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="font-medium">Meaning Search</p>
                    <p className="text-muted-foreground">Content must score {methodology.scoreThresholds.vector}+ to count as relevant</p>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Quick Actions */}
      {onGenerateActionPlan && scanResults.scanId && (
        <div className="flex justify-end">
          <Button 
            onClick={() => onGenerateActionPlan(scanResults.scanId)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Generate Action Plan
          </Button>
        </div>
      )}

      {/* Coverage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="h-4 w-4" />
              BM25 Coverage
              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" title="Percentage of queries with relevant keyword-based results" />
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
                Out of 50 test questions, how many found your content using exact word matches
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Vector Coverage
              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" title="Percentage of queries with relevant semantic results" />
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
                Out of 50 test questions, how many found your content based on meaning and context
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Hybrid Coverage
              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" title="Percentage of queries with relevant results in either search method" />
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
                Out of 50 test questions, how many found your content using either method
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

      {/* Query Performance Comparison Table */}
      {queryResults && queryResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Query Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Query Results</TabsTrigger>
                <TabsTrigger value="queries">Query Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Performance Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Avg BM25 MRR</p>
                        <p className="text-2xl font-bold">
                          {overallStats?.averageMrrBm25?.toFixed(3) || '0.000'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Avg Vector MRR</p>
                        <p className="text-2xl font-bold">
                          {overallStats?.averageMrrVector?.toFixed(3) || '0.000'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Avg Overlap</p>
                        <p className="text-2xl font-bold">
                          {formatPercentage(overallStats?.averageOverlap || 0)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Score Distribution Charts */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Score Distribution Analysis</h4>
                  <p className="text-xs text-muted-foreground">
                    These charts show how consistently AI assistants rank your content. 
                    More bars on the right (higher scores) means better AI visibility.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* MRR Score Distribution */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">MRR Score Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={generateMRRDistribution(queryResults)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="bm25Count" fill="#8884d8" name="BM25" />
                            <Bar dataKey="vectorCount" fill="#82ca9d" name="Vector" />
                          </BarChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-muted-foreground mt-2">
                          Shows how often you rank #1, #2, #3, etc. in search results. More activity on the right = better rankings.
                        </p>
                      </CardContent>
                    </Card>

                    {/* Overlap Score Distribution */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Result Overlap Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={generateOverlapDistribution(queryResults)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#ffc658" name="Queries" />
                          </BarChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-muted-foreground mt-2">
                          Shows agreement between search methods. High overlap = both methods find the same content (good!).
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Query Type Distribution */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Types of Questions We Tested</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    We test three types of questions people might ask AI assistants about your industry:
                  </p>
                  <div className="bg-gray-50 p-3 rounded text-xs mb-3 space-y-1">
                    <div><span className="font-medium">Informational:</span> "How does X work?" or "What is Y?"</div>
                    <div><span className="font-medium">Navigational:</span> "Company name" or specific brand searches</div>
                    <div><span className="font-medium">Transactional:</span> "Buy X" or "Best Y for Z"</div>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(
                      queryResults.reduce((acc, query) => {
                        acc[query.queryType] = (acc[query.queryType] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{type}</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(count / queryResults.length) * 100} 
                            className="w-32 h-2"
                          />
                          <Badge variant="outline" className="min-w-[50px]">
                            {count}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("query")}
                            className="h-auto p-0 font-semibold"
                          >
                            Query
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("queryType")}
                            className="h-auto p-0 font-semibold"
                          >
                            Type
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("bm25Mrr")}
                            className="h-auto p-0 font-semibold"
                          >
                            BM25 MRR
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("vectorMrr")}
                            className="h-auto p-0 font-semibold"
                          >
                            Vector MRR
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("hybridMrr")}
                            className="h-auto p-0 font-semibold"
                          >
                            Hybrid MRR
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("overlapCount")}
                            className="h-auto p-0 font-semibold"
                          >
                            Overlap
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedQueryResults.slice(0, 20).map((query, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {query.query}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {query.queryType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {query.bm25Mrr > 0 ? (
                                <>
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span>{query.bm25Mrr.toFixed(3)}</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-muted-foreground">0.000</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {query.vectorMrr > 0 ? (
                                <>
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span>{query.vectorMrr.toFixed(3)}</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-muted-foreground">0.000</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {query.hybridMrr > 0 ? (
                                <>
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span>{query.hybridMrr.toFixed(3)}</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-muted-foreground">0.000</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={query.overlapCount > 5 ? "default" : query.overlapCount > 0 ? "secondary" : "destructive"}
                            >
                              {query.overlapCount}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {queryResults.length > 20 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Showing top 20 of {queryResults.length} queries
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="queries" className="mt-4">
                <QueryDetailsList queryResults={rawQueryResults || []} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// New component for detailed query analysis
function QueryDetailsList({ queryResults }: { queryResults: any[] }) {
  const [selectedQuery, setSelectedQuery] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const filteredQueries = queryResults.filter(query => 
    query.query.toLowerCase().includes(searchFilter.toLowerCase()) ||
    query.intent.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Explanation */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">Individual Query Results</h3>
              <p className="text-amber-800 text-sm leading-relaxed mb-3">
                Here you can see exactly what happened when we searched for specific questions. 
                Click "Details" on any query to see the actual content AI assistants found from your website.
              </p>
              <div className="space-y-1 text-xs">
                <div><span className="font-medium text-amber-900">Overlap %:</span> How much both search methods agree on results</div>
                <div><span className="font-medium text-amber-900">MRR Score:</span> How high your content ranked (1.0 = #1, 0.5 = #2, etc.)</div>
                <div><span className="font-medium text-amber-900">Results Count:</span> Total number of relevant results found</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Search Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search queries..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <Badge variant="outline">
          {filteredQueries.length} queries
        </Badge>
      </div>

      {/* Query List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredQueries.map((query, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              {/* Query Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium text-sm">"{query.query}"</h4>
                  <Badge variant="outline" className="capitalize text-xs">
                    {query.intent}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={query.overlap > 0.5 ? "default" : query.overlap > 0.2 ? "secondary" : "destructive"}>
                    {Math.round(query.overlap * 100)}% overlap
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedQuery(selectedQuery?.query === query.query ? null : query)}
                  >
                    {selectedQuery?.query === query.query ? "Hide" : "Details"}
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">BM25 MRR:</span>
                  <span className={query.mrr.bm25 > 0 ? "text-green-600 font-medium" : "text-red-500"}>
                    {query.mrr.bm25.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vector MRR:</span>
                  <span className={query.mrr.vector > 0 ? "text-green-600 font-medium" : "text-red-500"}>
                    {query.mrr.vector.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Results:</span>
                  <span>
                    {query.bm25Results.documents.length + query.vectorResults.documents.length} total
                  </span>
                </div>
              </div>

              {/* Detailed Results */}
              {selectedQuery?.query === query.query && (
                <div className="border-t pt-3 space-y-4">
                  {/* BM25 Results */}
                  <div>
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      BM25 Results ({query.bm25Results.documents.length})
                    </h5>
                    {query.bm25Results.documents.length > 0 ? (
                      <div className="space-y-2">
                        {query.bm25Results.documents.slice(0, 5).map((doc: any, docIndex: number) => (
                          <div key={docIndex} className="bg-muted/50 p-3 rounded text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">#{docIndex + 1}</span>
                              <Badge variant="outline">Score: {doc.score.toFixed(3)}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{doc.url}</p>
                            <p className="text-xs">{doc.snippet}</p>
                          </div>
                        ))}
                        {query.bm25Results.documents.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center">
                            ...and {query.bm25Results.documents.length - 5} more results
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No relevant results found</p>
                    )}
                  </div>

                  {/* Vector Results */}
                  <div>
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Vector Results ({query.vectorResults.documents.length})
                    </h5>
                    {query.vectorResults.documents.length > 0 ? (
                      <div className="space-y-2">
                        {query.vectorResults.documents.slice(0, 5).map((doc: any, docIndex: number) => (
                          <div key={docIndex} className="bg-muted/50 p-3 rounded text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">#{docIndex + 1}</span>
                              <Badge variant="outline">Score: {doc.score.toFixed(3)}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{doc.url}</p>
                            <p className="text-xs">{doc.snippet}</p>
                          </div>
                        ))}
                        {query.vectorResults.documents.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center">
                            ...and {query.vectorResults.documents.length - 5} more results
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No relevant results found</p>
                    )}
                  </div>

                  {/* Overlap Analysis for this query */}
                  {query.overlap > 0 && (
                    <div>
                      <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Shared Results
                      </h5>
                      <div className="bg-green-50 border border-green-200 p-3 rounded text-sm">
                        <p className="text-green-800">
                          {Math.round(query.overlap * 100)}% of results appear in both search methods, 
                          indicating good content coverage for this query.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredQueries.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No queries match your search filter.
        </div>
      )}
    </div>
  );
}