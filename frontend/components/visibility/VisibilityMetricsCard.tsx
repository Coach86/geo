"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CompetitorData {
  name: string;
  averageScore: number;
  variation: number;
}

interface VisibilityMetricsCardProps {
  brandName: string;
  averageScore: number;
  scoreVariation: number;
  competitors: CompetitorData[];
  selectedCompetitors?: string[];
  onCompetitorToggle?: (name: string, selected: boolean) => void;
  onEntityHover?: (entity: string | null) => void;
  hoveredEntity?: string | null;
}

export function VisibilityMetricsCard({
  brandName,
  averageScore,
  scoreVariation,
  competitors,
  selectedCompetitors,
  onCompetitorToggle,
  onEntityHover,
  hoveredEntity,
}: VisibilityMetricsCardProps) {
  const getVariationIcon = (variation: number) => {
    if (variation > 0) return <TrendingUp className="h-4 w-4" />;
    if (variation < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getVariationColor = (variation: number) => {
    if (variation > 0) return "text-green-600";
    if (variation < 0) return "text-red-600";
    return "text-gray-600";
  };

  const formatVariation = (variation: number) => {
    if (variation === 0) return "No change";
    return `${variation > 0 ? "+" : ""}${variation}%`;
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary-600" />
          Brand Visibility Overview
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Average mention rates across selected date range and models</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] flex flex-col">
        <div className="flex-1 flex flex-col justify-between">
          {/* Brand Score - Primary/Reference */}
          <div 
            className={`pb-4 border-b border-gray-200 cursor-pointer transition-all duration-200 ${
              hoveredEntity === 'Brand' ? 'opacity-100' : 'opacity-90 hover:opacity-100'
            }`}
            onMouseEnter={() => onEntityHover?.('Brand')}
            onMouseLeave={() => onEntityHover?.(null)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className={`text-2xl font-bold text-gray-900 transition-transform duration-200 ${
                  hoveredEntity === 'Brand' ? 'transform scale-105' : ''
                }`}>{brandName}</h3>
                <p className="text-sm text-gray-600 mt-1">Your brand</p>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold text-secondary-600 transition-transform duration-200 ${
                  hoveredEntity === 'Brand' ? 'transform scale-105' : ''
                }`}>
                  {averageScore}%
                </div>
                <div className={`flex items-center gap-1 mt-2 ${getVariationColor(scoreVariation)}`}>
                  {getVariationIcon(scoreVariation)}
                  <span className="text-sm font-medium">
                    {formatVariation(scoreVariation)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Competitors - Same simple text design but with more spacing */}
          <div className="flex-1 space-y-4 overflow-y-auto">
            {competitors.map(competitor => {
              const isAhead = competitor.averageScore > averageScore;

              return (
                <div 
                  key={competitor.name} 
                  className={`flex items-start justify-between py-2 px-2 -mx-2 rounded cursor-pointer transition-all duration-200 ${
                    hoveredEntity === competitor.name 
                      ? 'bg-gray-50 shadow-sm' 
                      : 'hover:bg-gray-50'
                  }`}
                  onMouseEnter={() => onEntityHover?.(competitor.name)}
                  onMouseLeave={() => onEntityHover?.(null)}
                >
                  <div>
                    <h4 className="text-base font-medium text-gray-700">
                      {competitor.name}
                    </h4>
                    {isAhead && (
                      <p className="text-xs text-orange-600 mt-1">Leading</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-semibold ${
                      isAhead ? "text-primary-600" : "text-gray-600"
                    }`}>
                      {competitor.averageScore}%
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${getVariationColor(competitor.variation)}`}>
                      {getVariationIcon(competitor.variation)}
                      <span className="text-sm">
                        {formatVariation(competitor.variation)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {competitors.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-500 italic">
                  No competitor data available
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}