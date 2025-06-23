"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

interface SentimentMetricsCardProps {
  averageScore: number;
  scoreVariation: number | null;
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  distributionVariations?: {
    positive: number | null;
    neutral: number | null;
    negative: number | null;
  };
  onMetricHover?: (metric: string | null) => void;
  hoveredMetric?: string | null;
  isAllTime?: boolean;
}

export function SentimentMetricsCard({
  averageScore,
  scoreVariation,
  distribution,
  distributionVariations,
  onMetricHover,
  hoveredMetric,
  isAllTime = false,
}: SentimentMetricsCardProps) {
  const getVariationIcon = (variation: number | null | undefined) => {
    if (variation === null || variation === undefined || variation === 0) {
      return <Minus className="h-3 w-3 text-gray-500" />;
    }
    return variation > 0 ? (
      <TrendingUp className="h-3 w-3 text-accent-600" />
    ) : (
      <TrendingDown className="h-3 w-3 text-destructive-600" />
    );
  };

  const getVariationColor = (variation: number | null | undefined) => {
    if (variation === null || variation === undefined || variation === 0) return "text-gray-500";
    return variation > 0 ? "text-accent-600" : "text-destructive-600";
  };
  
  const formatVariation = (variation: number | null | undefined) => {
    if (variation === null || variation === undefined) return "";
    return `${variation > 0 ? "+" : ""}${variation}%`;
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          Sentiment Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col">
        <div className="flex-1 flex flex-col justify-center space-y-6">
          {/* Average Score Section */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-6">
              <div 
                className={`cursor-pointer transition-all duration-200 ${
                  hoveredMetric === 'score' ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                }`}
                onMouseEnter={() => onMetricHover?.('score')}
                onMouseLeave={() => onMetricHover?.(null)}
              >
                <div className="flex items-baseline gap-3">
                  <div className={`text-4xl font-bold text-secondary-600 transition-transform duration-200 ${
                    hoveredMetric === 'score' ? 'transform scale-105' : ''
                  }`}>
                    {averageScore}%
                  </div>
                  {!isAllTime && scoreVariation !== null && (
                    <div className={`flex items-center gap-1 text-sm ${getVariationColor(scoreVariation)}`}>
                      {getVariationIcon(scoreVariation)}
                      <span className="font-medium">
                        {Math.abs(scoreVariation)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Distribution on the right */}
              <div className="border-l border-gray-200 pl-6">
                <div className="space-y-3">
                  {/* Positive */}
                  <div 
                    className={`flex items-center justify-between px-2 py-1 -mx-2 rounded cursor-pointer transition-all duration-200 ${
                      hoveredMetric === 'positive' ? 'bg-accent-50 shadow-sm' : 'hover:bg-gray-50'
                    }`}
                    onMouseEnter={() => onMetricHover?.('positive')}
                    onMouseLeave={() => onMetricHover?.(null)}
                  >
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-gray-500 w-16">Positive</p>
                      <div className="text-xl font-semibold text-accent-600">
                        {distribution.positive}%
                      </div>
                    </div>
                    {!isAllTime && distributionVariations?.positive !== null && distributionVariations?.positive !== undefined && (
                      <div className={`flex items-center gap-0.5 text-xs ${getVariationColor(distributionVariations.positive)}`}>
                        {getVariationIcon(distributionVariations.positive)}
                        <span>{formatVariation(distributionVariations.positive)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Neutral */}
                  <div 
                    className={`flex items-center justify-between px-2 py-1 -mx-2 rounded cursor-pointer transition-all duration-200 ${
                      hoveredMetric === 'neutral' ? 'bg-primary-50 shadow-sm' : 'hover:bg-gray-50'
                    }`}
                    onMouseEnter={() => onMetricHover?.('neutral')}
                    onMouseLeave={() => onMetricHover?.(null)}
                  >
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-gray-500 w-16">Neutral</p>
                      <div className="text-xl font-semibold text-primary-600">
                        {distribution.neutral}%
                      </div>
                    </div>
                    {!isAllTime && distributionVariations?.neutral !== null && distributionVariations?.neutral !== undefined && (
                      <div className={`flex items-center gap-0.5 text-xs ${getVariationColor(distributionVariations.neutral)}`}>
                        {getVariationIcon(distributionVariations.neutral)}
                        <span>{formatVariation(distributionVariations.neutral)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Negative */}
                  <div 
                    className={`flex items-center justify-between px-2 py-1 -mx-2 rounded cursor-pointer transition-all duration-200 ${
                      hoveredMetric === 'negative' ? 'bg-destructive-50 shadow-sm' : 'hover:bg-gray-50'
                    }`}
                    onMouseEnter={() => onMetricHover?.('negative')}
                    onMouseLeave={() => onMetricHover?.(null)}
                  >
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-gray-500 w-16">Negative</p>
                      <div className="text-xl font-semibold text-destructive-600">
                        {distribution.negative}%
                      </div>
                    </div>
                    {!isAllTime && distributionVariations?.negative !== null && distributionVariations?.negative !== undefined && (
                      <div className={`flex items-center gap-0.5 text-xs ${getVariationColor(distributionVariations.negative)}`}>
                        {getVariationIcon(distributionVariations.negative)}
                        <span>{formatVariation(distributionVariations.negative)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}