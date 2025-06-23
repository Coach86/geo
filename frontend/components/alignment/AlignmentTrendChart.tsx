import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface AlignmentTrendChartProps {
  data: Array<{
    date: string;
    score: number;
    reportId: string;
  }>;
  brandName: string;
}

export function AlignmentTrendChart({ data, brandName }: AlignmentTrendChartProps) {
  // Format data for the chart
  const chartData = data.map(item => ({
    ...item,
    dateLabel: format(new Date(item.date), "MMM d"),
    fullDate: format(new Date(item.date), "MMM d, yyyy"),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{payload[0]?.payload?.fullDate}</p>
          <p className="text-sm text-primary-600 font-semibold mt-1">
            Score: {payload[0]?.value}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          Alignment Trend
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          {brandName} alignment scores over time
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12 }}
                stroke="#9CA3AF"
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 12 }}
                stroke="#9CA3AF"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#6B46C1"
                strokeWidth={2}
                dot={{ fill: "#6B46C1", r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={true}
                strokeLinecap="round"
                strokeLinejoin="round"
                isAnimationActive={false}
                name="Alignment Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}