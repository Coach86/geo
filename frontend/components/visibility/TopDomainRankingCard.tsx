"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Download } from "lucide-react";
import { useMemo } from "react";
import { useFavicons } from "@/hooks/use-favicon";
import { Button } from "@/components/ui/button";
import { exportToCSV, formatDomainDataForCSV } from "@/utils/csv-export";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TopDomainRankingCardProps {
  domains: Array<{
    domain: string;
    count: number;
    percentage?: number;
  }>;
  loading?: boolean;
}

export function TopDomainRankingCard({ domains, loading }: TopDomainRankingCardProps) {
  // Always show 10 entries
  const { displayDomains, total, domainNames } = useMemo(() => {
    // Take first 10 domains, or pad with empty entries if less than 10
    const domainsList = domains || [];
    const displayItems = domainsList.slice(0, 10);
    
    // Pad with empty entries if less than 10
    while (displayItems.length < 10) {
      displayItems.push({ domain: '-', count: 0, percentage: 0 });
    }
    
    const totalCount = domainsList.reduce((sum, item) => sum + item.count, 0) || 0;
    const domainNames = displayItems.map(item => (item.domain === '-' || item.domain === 'Others') ? null : item.domain);
    
    return { displayDomains: displayItems, total: totalCount, domainNames };
  }, [domains]);

  // Fetch favicons for all domains
  const { favicons } = useFavicons(domainNames);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent-600" />
            Top Domains Consulted
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>% of total sources owned consulted by models to formulate Visibility answers (grouped at domain level)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleExportCSV = () => {
    // Filter out empty entries and "Others" before exporting
    const validDomains = domains.filter(d => d.domain !== '-' && d.domain !== 'Others' && d.count > 0);
    const csvData = formatDomainDataForCSV(validDomains);
    exportToCSV(csvData, `top-domains-${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent-600" />
            Top Domains Consulted
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>% of total sources owned consulted by models to formulate Visibility answers (grouped at domain level)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleExportCSV}
            title="Export to CSV"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayDomains && displayDomains.length > 0 ? (
            <>
              {displayDomains.map((item, index) => {
                const percentage = item.percentage ?? (total > 0 && item.count > 0 ? Math.round((item.count / total) * 100) : 0);
                // Single color with degradation from dark to light
                const opacity = 100 - (index * 8); // Decreases from 100 to 20

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-600 w-6">
                        #{index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {item.domain !== '-' && item.domain !== 'Others' && favicons[item.domain] && (
                              <img 
                                src={favicons[item.domain]} 
                                alt={`${item.domain} favicon`}
                                className="w-4 h-4 flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {item.domain}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-gray-700 ml-2">
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                            style={{ 
                              width: `${percentage}%`,
                              opacity: opacity / 100
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No domains found
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}