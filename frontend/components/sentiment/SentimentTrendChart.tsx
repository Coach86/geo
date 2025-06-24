"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface SentimentTrendChartProps {
  data: Array<{
    date: string;
    score: number;
    positive: number;
    neutral: number;
    negative: number;
  }>;
  brandName: string;
  hoveredMetric?: string | null;
  onMetricHover?: (metric: string | null) => void;
}

export function SentimentTrendChart({
  data,
  brandName,
  hoveredMetric,
  onMetricHover
}: SentimentTrendChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <div className="space-y-1 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary-500" />
              <p className="text-sm text-gray-700">
                Overall: <span className="font-medium">{payload[0]?.value}%</span>
              </p>
            </div>
            {payload[1] && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-500" />
                <p className="text-sm text-gray-700">
                  Positive: <span className="font-medium">{payload[1]?.value}%</span>
                </p>
              </div>
            )}
            {payload[2] && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-500" />
                <p className="text-sm text-gray-700">
                  Neutral: <span className="font-medium">{payload[2]?.value}%</span>
                </p>
              </div>
            )}
            {payload[3] && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive-500" />
                <p className="text-sm text-gray-700">
                  Negative: <span className="font-medium">{payload[3]?.value}%</span>
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Sentiment Score Evolution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#666" }}
                tickLine={{ stroke: "#e0e0e0" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#666" }}
                tickLine={{ stroke: "#e0e0e0" }}
                width={30}
                tickMargin={5}
                tickFormatter={(value) => Math.round(value).toString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="line"
                formatter={(value) => {
                  const labels: { [key: string]: string } = {
                    score: "Overall Score",
                    positive: "Positive",
                    neutral: "Neutral",
                    negative: "Negative"
                  };
                  return labels[value] || value;
                }}
                onMouseEnter={(e) => {
                  if (e && e.dataKey) {
                    onMetricHover?.(e.dataKey as string);
                  }
                }}
                onMouseLeave={() => onMetricHover?.(null)}
              />

              {/* Main sentiment score line */}
              <Line
                type="monotone"
                dataKey="score"
                stroke="#7C3AED"
                strokeWidth={
                  hoveredMetric === 'score' ? 4 :
                  hoveredMetric && hoveredMetric !== 'score' ? 1 : 3
                }
                strokeOpacity={hoveredMetric && hoveredMetric !== 'score' ? 0.3 : 1}
                dot={{
                  fill: "#7C3AED",
                  r: hoveredMetric === 'score' ? 6 : 4,
                  strokeWidth: hoveredMetric === 'score' ? 2 : 0,
                  stroke: '#fff'
                }}
                activeDot={{ r: 8 }}
                connectNulls={true}
                strokeLinecap="round"
                strokeLinejoin="round"
                isAnimationActive={false}
                name="score"
                onMouseEnter={() => onMetricHover?.('score')}
                onMouseLeave={() => onMetricHover?.(null)}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
              />

              {/* Sentiment distribution lines */}
              <Line
                type="monotone"
                dataKey="positive"
                stroke="#10B981"
                strokeWidth={
                  hoveredMetric === 'positive' ? 4 :
                  hoveredMetric && hoveredMetric !== 'positive' ? 1 : 2
                }
                strokeOpacity={hoveredMetric && hoveredMetric !== 'positive' ? 0.3 : 1}
                dot={{
                  fill: "#10B981",
                  r: hoveredMetric === 'positive' ? 6 : 4,
                  strokeWidth: hoveredMetric === 'positive' ? 2 : 0,
                  stroke: '#fff'
                }}
                activeDot={{ r: 8 }}
                connectNulls={true}
                strokeLinecap="round"
                strokeLinejoin="round"
                isAnimationActive={false}
                name="positive"
                onMouseEnter={() => onMetricHover?.('positive')}
                onMouseLeave={() => onMetricHover?.(null)}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
              />
              <Line
                type="monotone"
                dataKey="neutral"
                stroke="#F59E0B"
                strokeWidth={
                  hoveredMetric === 'neutral' ? 4 :
                  hoveredMetric && hoveredMetric !== 'neutral' ? 1 : 2
                }
                strokeOpacity={hoveredMetric && hoveredMetric !== 'neutral' ? 0.3 : 1}
                dot={{
                  fill: "#F59E0B",
                  r: hoveredMetric === 'neutral' ? 6 : 4,
                  strokeWidth: hoveredMetric === 'neutral' ? 2 : 0,
                  stroke: '#fff'
                }}
                activeDot={{ r: 8 }}
                connectNulls={true}
                strokeLinecap="round"
                strokeLinejoin="round"
                isAnimationActive={false}
                name="neutral"
                onMouseEnter={() => onMetricHover?.('neutral')}
                onMouseLeave={() => onMetricHover?.(null)}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
              />
              <Line
                type="monotone"
                dataKey="negative"
                stroke="#EF4444"
                strokeWidth={
                  hoveredMetric === 'negative' ? 4 :
                  hoveredMetric && hoveredMetric !== 'negative' ? 1 : 2
                }
                strokeOpacity={hoveredMetric && hoveredMetric !== 'negative' ? 0.3 : 1}
                dot={{
                  fill: "#EF4444",
                  r: hoveredMetric === 'negative' ? 6 : 4,
                  strokeWidth: hoveredMetric === 'negative' ? 2 : 0,
                  stroke: '#fff'
                }}
                activeDot={{ r: 8 }}
                connectNulls={true}
                strokeLinecap="round"
                strokeLinejoin="round"
                isAnimationActive={false}
                name="negative"
                onMouseEnter={() => onMetricHover?.('negative')}
                onMouseLeave={() => onMetricHover?.(null)}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
