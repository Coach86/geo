"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Eye, Crown } from "lucide-react";
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
  // Vibrant colors for better visual appeal
  const CHART_COLORS = [
    "#8B5CF6", // Brand color (vibrant purple)
    "#3B82F6", // Vibrant Blue
    "#10B981", // Vibrant Emerald
    "#F59E0B", // Vibrant Amber
    "#EF4444", // Vibrant Red
    "#06B6D4", // Vibrant Cyan
    "#EC4899", // Vibrant Pink
  ];

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
          Your Visibility Score
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share of answers to visibility prompts with unique mention of your brand</p>
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {brandName}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold text-secondary-600">
                  {averageScore}%
                </div>
                {!isAllTime && scoreVariation !== 0 && (
                  <div className={`flex items-center gap-1 ${getVariationColor(scoreVariation)}`}>
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
            {sortedEntities.map((entity, index) => {
              const isHovered = hoveredEntity === (entity.isBrand ? 'Brand' : entity.name);
              const isLeading = entity === sortedEntities[0];

              // Assign colors based on index, brand always gets purple (index 0 in CHART_COLORS)
              const getEntityColor = () => {
                if (entity.isBrand) return CHART_COLORS[0]; // Purple for brand
                // Find the entity's position among non-brand entities for consistent coloring
                const nonBrandIndex = sortedEntities
                  .filter(e => !e.isBrand)
                  .findIndex(e => e.name === entity.name);
                return CHART_COLORS[(nonBrandIndex + 1) % CHART_COLORS.length];
              };

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
                          className={`absolute left-0 top-0 h-full transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-90'}`}
                          style={{
                            width: `${Math.min(entity.averageScore, 100)}%`,
                            backgroundColor: getEntityColor()
                          }}
                        />

                        {/* Name and percentage inside bar */}
                        <div className="absolute inset-0 flex items-center justify-between px-2">
                          <div className="flex items-center gap-1">
                            <span className={`font-medium text-xs ${
                              entity.averageScore > 50 ? 'text-white' : 'text-gray-700'
                            }`}>
                              {entity.name}
                              {entity.isBrand && <span className="text-xs ml-1">(You)</span>}
                            </span>
                            {isLeading && (
                              <Crown className={`h-4 w-4 ${
                                entity.averageScore > 50 ? 'text-yellow-400 drop-shadow-md' : 'text-yellow-500'
                              }`} />
                            )}
                          </div>
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
