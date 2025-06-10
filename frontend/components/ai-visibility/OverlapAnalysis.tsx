import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { 
  Layers,
  Target,
  GitBranch
} from "lucide-react";

interface OverlapAnalysisProps {
  overlapData?: {
    distribution: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    byQueryType: Array<{
      type: string;
      avgOverlap: number;
      bm25Only: number;
      vectorOnly: number;
      both: number;
    }>;
    topOverlappingQueries: Array<{
      query: string;
      overlapScore: number;
      sharedResults: number;
    }>;
  };
}

const COLORS = {
  primary: "#8884d8",
  secondary: "#82ca9d",
  tertiary: "#ffc658",
  quaternary: "#ff8042",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444"
};

export default function OverlapAnalysis({ overlapData }: OverlapAnalysisProps) {
  if (!overlapData) {
    return null;
  }

  const { distribution, byQueryType, topOverlappingQueries } = overlapData;

  // Prepare data for pie chart
  const pieData = distribution?.map(item => ({
    name: item.range,
    value: item.count,
    percentage: item.percentage
  })) || [];

  // Prepare data for radar chart
  const radarData = byQueryType?.map(item => ({
    queryType: item.type,
    overlap: item.avgOverlap * 100,
    bm25Only: item.bm25Only,
    vectorOnly: item.vectorOnly,
    both: item.both
  })) || [];

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="text-sm font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            Count: {payload[0].value}
          </p>
          <p className="text-sm text-muted-foreground">
            {payload[0].payload.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Overall Explanation */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 text-slate-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Understanding Search Method Overlap</h3>
              <p className="text-slate-800 text-sm leading-relaxed mb-3">
                AI assistants use two different ways to find content: looking for exact keyword matches and understanding meaning/context. 
                This analysis shows how often both methods find the same content from your website.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                  <div>
                    <span className="font-medium text-slate-900">High Overlap (80-100%):</span>
                    <span className="text-slate-800"> Excellent! Both methods consistently find your content</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1.5"></div>
                  <div>
                    <span className="font-medium text-slate-900">Medium Overlap (40-80%):</span>
                    <span className="text-slate-800"> Good coverage, some optimization opportunities</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5"></div>
                  <div>
                    <span className="font-medium text-slate-900">Low Overlap (0-40%):</span>
                    <span className="text-slate-800"> Content gaps - AI assistants struggle to find consistent results</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overlap Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Overlap Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentage }) => `${percentage.toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name.includes("0-20%") ? COLORS.danger :
                        entry.name.includes("20-40%") ? COLORS.warning :
                        entry.name.includes("40-60%") ? COLORS.secondary :
                        entry.name.includes("60-80%") ? COLORS.tertiary :
                        COLORS.success
                      }
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Shows what percentage of your test questions fall into each overlap category. 
                More green/yellow slices = better AI visibility.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Overlap by Query Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Overlap by Query Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="queryType" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Avg Overlap %"
                  dataKey="overlap"
                  stroke={COLORS.primary}
                  fill={COLORS.primary}
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {radarData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="capitalize text-muted-foreground">{item.queryType}:</span>
                  <Badge variant="outline">{item.overlap.toFixed(1)}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Breakdown by Query Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Coverage Breakdown by Query Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byQueryType} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="bm25Only" stackId="a" fill={COLORS.primary} name="BM25 Only" />
              <Bar dataKey="vectorOnly" stackId="a" fill={COLORS.secondary} name="Vector Only" />
              <Bar dataKey="both" stackId="a" fill={COLORS.success} name="Both" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Breaks down performance by question type. "Both" means AI assistants found your content using both methods - that's ideal!
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded"></div>
                <span>Keyword Only</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded"></div>
                <span>Meaning Only</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded"></div>
                <span>Both (Best!)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Overlapping Queries */}
      {topOverlappingQueries && topOverlappingQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Questions Where You Perform Best</CardTitle>
            <p className="text-sm text-muted-foreground">
              These are the questions where both search methods consistently find your content. 
              Study these to understand what makes your content highly discoverable by AI assistants.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topOverlappingQueries.slice(0, 10).map((query, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{query.query}</p>
                    <p className="text-xs text-muted-foreground">
                      {query.sharedResults} shared results
                    </p>
                  </div>
                  <Badge 
                    variant={
                      query.overlapScore > 0.8 ? "default" :
                      query.overlapScore > 0.5 ? "secondary" :
                      "outline"
                    }
                  >
                    {(query.overlapScore * 100).toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}