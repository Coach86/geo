'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getDimensionColor } from '@/lib/constants/colors';

interface DonutChartProps {
  score: number;
  maxScore?: number;
  color?: string;
  dimension?: string;
  title: string;
  size?: number;
  thickness?: number;
}

export function DonutChart({ 
  score, 
  maxScore = 100, 
  color,
  dimension,
  title,
  size = 80,
  thickness = 8
}: DonutChartProps) {
  const percentage = Math.round((score / maxScore) * 100);
  
  // Use dimension color if provided, otherwise use the passed color
  const chartColor = dimension ? getDimensionColor(dimension) : color;
  
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: maxScore - score }
  ];

  return (
    <div className="flex flex-col items-center">
      <h4 className="text-sm font-bold text-gray-700 mb-3">{title}</h4>
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size / 2 - thickness}
              outerRadius={size / 2}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={chartColor} />
              <Cell fill="#f3f4f6" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center leading-none">
            <div className="text-lg font-bold" style={{ color: chartColor }}>
              {percentage}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}