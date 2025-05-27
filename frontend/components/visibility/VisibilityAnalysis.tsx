"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ModelIcon } from "@/components/ui/model-icon";
import { Eye } from "lucide-react";

interface ModeMetric {
  model: string;
  mentionRate: number;
}

interface ArenaData {
  name: string;
  modelsMentionsRate?: {
    model: string;
    mentionsRate: number;
  }[];
}

interface VisibilityAnalysisProps {
  mentionRate: number;
  modeMetrics: ModeMetric[];
  arenaData: ArenaData[];
  brandName: string;
}

export function VisibilityAnalysis({ 
  mentionRate, 
  modeMetrics, 
  arenaData, 
  brandName 
}: VisibilityAnalysisProps) {
  // Get model badge color
  const getModelColor = (model: string) => {
    const colors: Record<string, string> = {
      "ChatGPT": "bg-accent-100 text-accent-800 border-accent-200",
      "OpenAI": "bg-accent-100 text-accent-800 border-accent-200",
      "Claude 3": "bg-secondary-100 text-secondary-800 border-secondary-200",
      "Claude": "bg-secondary-100 text-secondary-800 border-secondary-200",
      "Anthropic": "bg-secondary-100 text-secondary-800 border-secondary-200",
      "Gemini 1.5 Pro": "bg-primary-100 text-primary-800 border-primary-200",
      "Gemini": "bg-primary-100 text-primary-800 border-primary-200",
      "Google": "bg-primary-100 text-primary-800 border-primary-200",
      "Perplexity": "bg-dark-100 text-dark-800 border-dark-200",
      "Llama": "bg-secondary-200 text-secondary-700 border-secondary-300",
    };
    return colors[model] || "bg-dark-50 text-dark-700 border-dark-100";
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-dark-700 flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary-600" />
          Brand Visibility Analysis
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Overall and per-model mention rates with competitor comparison
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Mention Rate */}
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Mention Rate</span>
              <span className="text-2xl font-bold text-secondary-600">
                {mentionRate || 0}%
              </span>
            </div>
            <Progress
              value={mentionRate || 0}
              className="h-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Mentioned in {mentionRate || 0}% of relevant conversations across all models
            </p>
          </div>

          {/* By Model Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Breakdown by Model</h4>
            <div className="space-y-3">
              {(() => {
                // Get unique models from arena data
                const modelsToShow = arenaData.length > 0 && arenaData[0]?.modelsMentionsRate
                  ? arenaData[0].modelsMentionsRate.map((m: any) => m.model)
                  : modeMetrics?.map((m: any) => m.model) || [];
                
                return modelsToShow.map((model: string, index: number) => {
                  // Get brand rate from modeMetrics
                  let brandRate = 0;
                  
                  if (modeMetrics) {
                    const exactMatch = modeMetrics.find((m: any) => m.model === model);
                    if (exactMatch) {
                      brandRate = exactMatch.mentionRate;
                    } else {
                      // Model mappings
                      const modelMappings: Record<string, string[]> = {
                        'ChatGPT': ['GPT-4', 'GPT-3.5', 'OpenAI'],
                        'Claude': ['Claude 3', 'Claude 2', 'Anthropic'],
                        'Gemini': ['Gemini 1.5 Pro', 'Google'],
                        'Perplexity': ['Perplexity'],
                        'Llama': ['Llama', 'Meta']
                      };
                      
                      for (const [key, values] of Object.entries(modelMappings)) {
                        if (values.includes(model) || model.includes(key)) {
                          const mappedMetric = modeMetrics.find((m: any) => 
                            m.model === key || values.some(v => m.model.includes(v))
                          );
                          if (mappedMetric) {
                            brandRate = mappedMetric.mentionRate;
                            break;
                          }
                        }
                      }
                    }
                  }
                  
                  // Get competitors' rates for this model
                  const allCompetitorRates = arenaData
                    .filter((comp: any) => comp.name.toLowerCase() !== brandName.toLowerCase())
                    .map((comp: any) => ({
                      name: comp.name,
                      rate: comp.modelsMentionsRate?.find((m: any) => m.model === model)?.mentionsRate || 0
                    }))
                    .sort((a, b) => b.rate - a.rate);

                return (
                  <div
                    key={model}
                    className="p-3 rounded-lg bg-gray-50 space-y-2"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`${getModelColor(model)} font-medium flex items-center gap-1`}
                      >
                        <ModelIcon model={model} size="xs" />
                        {model}
                      </Badge>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={brandRate}
                          className="w-20 h-2"
                        />
                        <span className="text-sm font-semibold text-secondary-600">
                          {brandRate}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Competitor comparison */}
                    {allCompetitorRates.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 font-medium">Competitors:</div>
                        <div className="flex gap-1.5 flex-wrap">
                          {allCompetitorRates.map((comp, idx: number) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={`text-xs ${idx === 0 ? 'border-accent-200 bg-accent-50' : ''}`}
                            >
                              {comp.name}: {comp.rate}%
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}