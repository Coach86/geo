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
  isAllTime?: boolean;
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
  isAllTime = false,
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
            className={`${
              competitors.length >= 5 ? 'pb-3' : 'pb-4'
            } border-b border-gray-200 cursor-pointer transition-all duration-200 ${
              hoveredEntity === 'Brand' ? 'opacity-100' : 'opacity-90 hover:opacity-100'
            }`}
            onMouseEnter={() => onEntityHover?.('Brand')}
            onMouseLeave={() => onEntityHover?.(null)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className={`${
                  competitors.length >= 5 ? 'text-xl' : 'text-2xl'
                } font-bold text-gray-900 transition-transform duration-200 ${
                  hoveredEntity === 'Brand' ? 'transform scale-105' : ''
                }`}>{brandName}</h3>
                <p className={`text-gray-600 ${
                  competitors.length >= 5 ? 'text-xs mt-0.5' : 'text-sm mt-1'
                }`}>Your brand</p>
              </div>
              <div className="text-right">
                <div className={`${
                  competitors.length >= 5 ? 'text-3xl' : 'text-4xl'
                } font-bold text-secondary-600 transition-transform duration-200 ${
                  hoveredEntity === 'Brand' ? 'transform scale-105' : ''
                }`}>
                  {averageScore}%
                </div>
                {!isAllTime && (
                  <div className={`flex items-center gap-1 ${
                    competitors.length >= 5 ? 'mt-1' : 'mt-2'
                  } ${getVariationColor(scoreVariation)}`}>
                    {getVariationIcon(scoreVariation)}
                    <span className={`font-medium ${
                      scoreVariation === 0 ? 'text-xs' : 
                      competitors.length >= 5 ? 'text-xs' : 'text-sm'
                    }`}>
                      {formatVariation(scoreVariation)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Competitors - Same simple text design but with more spacing */}
          <div className={`flex-1 overflow-y-auto ${
            competitors.length >= 5 ? 'space-y-0.5 mt-2' : competitors.length > 3 ? 'space-y-1 mt-3' : 'space-y-2 mt-3'
          }`}>
            {competitors.map(competitor => {
              const isAhead = competitor.averageScore > averageScore;

              return (
                <div 
                  key={competitor.name} 
                  className={`flex items-start justify-between ${
                    competitors.length >= 5 ? 'py-0' : competitors.length > 3 ? 'py-0.5' : 'py-1'
                  } px-2 -mx-2 rounded cursor-pointer transition-all duration-200 ${
                    hoveredEntity === competitor.name 
                      ? 'bg-gray-50 shadow-sm' 
                      : 'hover:bg-gray-50'
                  }`}
                  onMouseEnter={() => onEntityHover?.(competitor.name)}
                  onMouseLeave={() => onEntityHover?.(null)}
                >
                  <div>
                    <h4 className={`font-medium text-gray-700 ${
                      competitors.length >= 5 ? 'text-sm' : competitors.length > 3 ? 'text-sm' : 'text-base'
                    }`}>
                      {competitor.name}
                    </h4>
                    {isAhead && (
                      <p className={`text-orange-600 ${
                        competitors.length >= 5 ? 'text-xs mt-0' : competitors.length > 3 ? 'text-xs mt-0.5' : 'text-xs mt-1'
                      }`}>Leading</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      isAhead ? "text-primary-600" : "text-gray-600"
                    } ${
                      competitors.length >= 5 ? 'text-base' : competitors.length > 3 ? 'text-lg' : 'text-xl'
                    }`}>
                      {competitor.averageScore}%
                    </div>
                    {!isAllTime && (
                      <div className={`flex items-center gap-1 ${
                        competitors.length >= 5 ? 'mt-0' : competitors.length > 3 ? 'mt-0.5' : 'mt-1'
                      } ${getVariationColor(competitor.variation)}`}>
                        {getVariationIcon(competitor.variation)}
                        <span className={
                          competitor.variation === 0 ? 'text-xs' : 
                          competitors.length >= 5 ? 'text-xs' : 
                          competitors.length > 3 ? 'text-xs' : 'text-sm'
                        }>
                          {formatVariation(competitor.variation)}
                        </span>
                      </div>
                    )}
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