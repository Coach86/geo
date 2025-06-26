"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Building2, BarChart3 } from "lucide-react";

interface DomainSourceChartProps {
  domainSourceAnalysis?: {
    brandDomainPercentage: number;
    otherSourcesPercentage: number;
    brandDomainCount: number;
    otherSourcesCount: number;
    competitorBreakdown?: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
    unknownSourcesCount?: number;
    unknownSourcesPercentage?: number;
  };
  loading?: boolean;
  brandName: string;
}

export function DomainSourceChart({ 
  domainSourceAnalysis, 
  loading,
  brandName 
}: DomainSourceChartProps) {
  if (loading) {
    return (
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!domainSourceAnalysis) {
    return (
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Sources Attribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <p className="text-sm text-gray-500 italic">
              No source data available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { 
    brandDomainPercentage, 
    otherSourcesPercentage, 
    brandDomainCount, 
    otherSourcesCount,
    competitorBreakdown = [],
    unknownSourcesCount = 0,
    unknownSourcesPercentage = 0
  } = domainSourceAnalysis;

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-600" />
          Sources Attribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Percentage Bar */}
        <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
          {/* Brand domain bar */}
          <div 
            className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${brandDomainPercentage}%` }}
          />
          
          {/* Competitor bars */}
          {competitorBreakdown.map((competitor, index) => {
            const previousWidth = brandDomainPercentage + 
              competitorBreakdown.slice(0, index).reduce((sum, c) => sum + c.percentage, 0);
            const colors = ['bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
            return (
              <div
                key={competitor.name}
                className={`absolute top-0 h-full ${colors[index % colors.length]} transition-all duration-500`}
                style={{ 
                  left: `${previousWidth}%`,
                  width: `${competitor.percentage}%` 
                }}
              />
            );
          })}
          
          <div className="absolute inset-0 flex items-center justify-between px-4 text-sm font-medium">
            <span className="text-white drop-shadow-sm">
              {brandDomainPercentage > 10 ? `${brandDomainPercentage}%` : ''}
            </span>
            <span className="text-gray-700">
              {otherSourcesPercentage > 10 ? `${otherSourcesPercentage}%` : ''}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <span className="text-gray-700">{brandName} Domain</span>
            </div>
            <span className="font-medium text-gray-900">
              {brandDomainCount} {brandDomainCount === 1 ? 'citation' : 'citations'} ({brandDomainPercentage}%)
            </span>
          </div>
          
          {/* Competitor entries */}
          {competitorBreakdown.map((competitor, index) => {
            const colors = ['text-purple-500', 'text-green-500', 'text-orange-500', 'text-pink-500', 'text-indigo-500'];
            return (
              <div key={competitor.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className={`h-4 w-4 ${colors[index % colors.length]}`} />
                  <span className="text-gray-700">{competitor.name}</span>
                </div>
                <span className="font-medium text-gray-900">
                  {competitor.count} {competitor.count === 1 ? 'citation' : 'citations'} ({competitor.percentage}%)
                </span>
              </div>
            );
          })}
          
          {/* Unknown Sources */}
          {unknownSourcesCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">Other Sources</span>
              </div>
              <span className="font-medium text-gray-900">
                {unknownSourcesCount} {unknownSourcesCount === 1 ? 'citation' : 'citations'} ({unknownSourcesPercentage}%)
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}