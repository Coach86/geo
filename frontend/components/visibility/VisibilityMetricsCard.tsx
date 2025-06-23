"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Combine brand and competitors for the bar chart section
  const allEntities = [
    { name: brandName, averageScore, variation: scoreVariation, isBrand: true },
    ...competitors.map(c => ({ ...c, isBrand: false }))
  ];

  // Sort by score descending
  const sortedEntities = [...allEntities].sort((a, b) => b.averageScore - a.averageScore);

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
        <div className="flex-1 flex flex-col">
          {/* Brand Score - Primary/Reference */}
          <div 
            className="pb-4 border-b border-gray-200 cursor-pointer transition-all duration-200"
            onMouseEnter={() => onEntityHover?.('Brand')}
            onMouseLeave={() => onEntityHover?.(null)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {brandName}
                </h3>
                <p className="text-sm text-gray-600 mt-1">Your brand</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-secondary-600">
                  {averageScore}%
                </div>
                {!isAllTime && (
                  <div className={`flex items-center gap-1 mt-2 ${getVariationColor(scoreVariation)}`}>
                    {getVariationIcon(scoreVariation)}
                    <span className="font-medium text-sm">
                      {formatVariation(scoreVariation)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Competitors Bar Charts */}
          <div className="flex-1 overflow-y-auto mt-4 space-y-2">
            {sortedEntities.map((entity) => {
              const isHovered = hoveredEntity === (entity.isBrand ? 'Brand' : entity.name);
              const isLeading = entity === sortedEntities[0];
              
              return (
                <div 
                  key={entity.name}
                  className="cursor-pointer"
                  onMouseEnter={() => onEntityHover?.(entity.isBrand ? 'Brand' : entity.name)}
                  onMouseLeave={() => onEntityHover?.(null)}
                >
                  <div className="flex items-center gap-3">
                    {/* Bar chart */}
                    <div className="flex-1">
                      <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
                        {/* Filled bar */}
                        <div 
                          className={`absolute left-0 top-0 h-full transition-all duration-300 ${
                            entity.isBrand 
                              ? 'bg-blue-500' 
                              : isLeading && !entity.isBrand
                                ? 'bg-orange-500' 
                                : 'bg-gray-400'
                          } ${isHovered ? 'opacity-100' : 'opacity-90'}`}
                          style={{ width: `${Math.min(entity.averageScore, 100)}%` }}
                        />
                        
                        {/* Name and percentage inside bar */}
                        <div className="absolute inset-0 flex items-center justify-between px-2">
                          <span className={`font-medium text-xs ${
                            entity.averageScore > 50 ? 'text-white' : 'text-gray-700'
                          }`}>
                            {entity.name}
                            {entity.isBrand && <span className="text-xs ml-1">(You)</span>}
                          </span>
                          <span className={`font-semibold text-xs ${
                            entity.averageScore > 80 ? 'text-white' : 'text-gray-700'
                          }`}>
                            {entity.averageScore}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Variation outside */}
                    {!isAllTime && (
                      <div className={`flex items-center gap-1 min-w-[55px] justify-end ${getVariationColor(entity.variation)}`}>
                        {getVariationIcon(entity.variation)}
                        <span className="text-xs font-medium">
                          {entity.variation === 0 ? "0%" : `${entity.variation > 0 ? "+" : ""}${entity.variation}%`}
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