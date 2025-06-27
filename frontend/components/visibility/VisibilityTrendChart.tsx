"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface VisibilityTrendChartProps {
  data: Array<{
    date: string;
    [key: string]: string | number;
  }>;
  brandName: string;
  selectedCompetitors: string[];
  hoveredEntity?: string | null;
  onEntityHover?: (entity: string | null) => void;
}

const CHART_COLORS = [
  "#8B5CF6", // Brand color (vibrant purple)
  "#3B82F6", // Vibrant Blue
  "#10B981", // Vibrant Emerald
  "#F59E0B", // Vibrant Amber
  "#EF4444", // Vibrant Red
  "#06B6D4", // Vibrant Cyan
  "#EC4899", // Vibrant Pink
];

export function VisibilityTrendChart({
  data,
  brandName,
  selectedCompetitors,
  hoveredEntity,
  onEntityHover,
}: VisibilityTrendChartProps) {
  // Get unique keys from data (excluding 'date')
  const allKeys = data.length > 0
    ? Object.keys(data[0]).filter(key => key !== 'date')
    : [];

  // Filter to show only brand and selected competitors
  // The brand data is stored with key "Brand" in the chart data
  const keysToShow = ['Brand', ...selectedCompetitors].filter(key =>
    allKeys.includes(key)
  );

  const getColor = (index: number) => CHART_COLORS[index % CHART_COLORS.length];

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Visibility Score Evolution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#666' }}
                  tickLine={{ stroke: '#e0e0e0' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#666' }}
                  tickLine={{ stroke: '#e0e0e0' }}
                  width={30}
                  tickMargin={5}
                  tickFormatter={(value) => Math.round(value).toString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#333', fontWeight: 'bold' }}
                  formatter={(value: number, name: string) => [
                    Math.round(value),
                    name === 'Brand' ? brandName : name
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="line"
                  formatter={(value: string) => {
                    // Replace "Brand" with the actual brand name
                    return value === 'Brand' ? brandName : value;
                  }}
                  onMouseEnter={(e) => {
                    if (e && e.dataKey) {
                      onEntityHover?.(e.dataKey as string);
                    }
                  }}
                  onMouseLeave={() => onEntityHover?.(null)}
                />
                {keysToShow.map((key, index) => {
                  const isHovered = hoveredEntity === key;
                  const isOtherHovered = hoveredEntity && hoveredEntity !== key;

                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={getColor(index)}
                      strokeWidth={
                        isHovered ? 4 :
                        isOtherHovered ? 1 :
                        (index === 0 ? 3 : 2)
                      }
                      strokeOpacity={isOtherHovered ? 0.3 : 1}
                      dot={{
                        fill: getColor(index),
                        r: isHovered ? 6 : 4,
                        strokeWidth: isHovered ? 2 : 0,
                        stroke: '#fff'
                      }}
                      activeDot={{ r: 8 }}
                      connectNulls={true}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      isAnimationActive={false}
                      onMouseEnter={() => onEntityHover?.(key)}
                      onMouseLeave={() => onEntityHover?.(null)}
                      style={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out'
                      }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-gray-500 italic">
              No data available for the selected period
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
