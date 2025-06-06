"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ModelIcon } from "@/components/ui/model-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  selectedCompetitors?: string[];
  onCompetitorToggle?: (competitorName: string, checked: boolean) => void;
}

export function VisibilityAnalysis({
  mentionRate,
  modeMetrics,
  arenaData = [],
  brandName,
  selectedCompetitors = [],
  onCompetitorToggle,
}: VisibilityAnalysisProps) {

  // Get model badge color
  const getModelColor = (model: string) => {
    const colors: Record<string, string> = {
      ChatGPT: "bg-accent-100 text-accent-800 border-accent-200",
      OpenAI: "bg-accent-100 text-accent-800 border-accent-200",
      "Claude 3": "bg-secondary-100 text-secondary-800 border-secondary-200",
      Claude: "bg-secondary-100 text-secondary-800 border-secondary-200",
      Anthropic: "bg-secondary-100 text-secondary-800 border-secondary-200",
      "Gemini 1.5 Pro": "bg-primary-100 text-primary-800 border-primary-200",
      Gemini: "bg-primary-100 text-primary-800 border-primary-200",
      Google: "bg-primary-100 text-primary-800 border-primary-200",
      Perplexity: "bg-dark-100 text-dark-800 border-dark-200",
      Llama: "bg-secondary-200 text-secondary-700 border-secondary-300",
      Mistral: "bg-orange-100 text-orange-800 border-orange-200",
      "Mistral Large": "bg-orange-100 text-orange-800 border-orange-200",
      Grok: "bg-purple-100 text-purple-800 border-purple-200",
    };
    return colors[model] || "bg-dark-50 text-dark-700 border-dark-100";
  };

  return (
    <div>
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-dark-700 flex items-center gap-2">
            <div>
              <Eye className="h-5 w-5 text-primary-600" />
            </div>
            Brand Visibility Analysis
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Overall and per-model mention rates with competitor comparison
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Competitor Selection */}
            {arenaData && arenaData.length > 0 && onCompetitorToggle && (
              <div className="pb-4 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Select Competitors to Compare
                </h4>
                <div className="flex flex-wrap gap-4">
                  {arenaData
                    .filter(
                      (comp) =>
                        comp.name.toLowerCase() !== brandName.toLowerCase()
                    )
                    .map((competitor) => (
                      <div
                        key={competitor.name}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={competitor.name}
                          checked={selectedCompetitors.includes(competitor.name)}
                          onCheckedChange={(checked) => {
                            onCompetitorToggle(competitor.name, checked as boolean);
                          }}
                        />
                        <Label
                          htmlFor={competitor.name}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {competitor.name}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Overall Mention Rate */}
            <div className="pb-4 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">
                Overall Mention Rate
              </h4>

              <div className="space-y-3">
                {/* Brand mention rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {brandName}
                    </span>
                    <span className="text-lg font-bold text-secondary-600">
                      {mentionRate || 0}%
                    </span>
                  </div>
                  <div>
                    <Progress value={mentionRate || 0} className="h-2" />
                  </div>
                </div>

                {/* Selected competitors mention rates */}
                {selectedCompetitors.map((competitorName, index) => {
                  const competitor = arenaData.find(
                    (comp) => comp.name === competitorName
                  );

                  // Calculate overall mention rate for competitor
                  let competitorMentionRate = 0;
                  if (competitor?.modelsMentionsRate) {
                    const totalRate = competitor.modelsMentionsRate.reduce(
                      (sum, model) => sum + (model.mentionsRate || 0),
                      0
                    );
                    competitorMentionRate = Math.round(
                      totalRate / competitor.modelsMentionsRate.length
                    );
                  }

                  return (
                    <div key={competitorName}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          {competitorName}
                        </span>
                        <span
                          className={`text-lg font-bold ${
                            competitorMentionRate > mentionRate
                              ? "text-primary-600"
                              : "text-gray-600"
                          }`}
                        >
                          {competitorMentionRate}%
                        </span>
                      </div>
                      <div>
                        <Progress
                          value={competitorMentionRate}
                          className={`h-2 ${
                            competitorMentionRate > mentionRate
                              ? "[&>div]:bg-primary-500"
                              : "[&>div]:bg-gray-400"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Percentage of relevant conversations mentioning each brand
                across all models
              </p>
            </div>

            {/* By Model Breakdown */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Breakdown by Model
              </h4>
              <div className="space-y-3">
                {(() => {
                  // Get unique models from arena data
                  const modelsToShow =
                    arenaData && arenaData.length > 0 && arenaData[0]?.modelsMentionsRate
                      ? arenaData[0].modelsMentionsRate.map((m: any) => m.model)
                      : modeMetrics?.map((m: any) => m.model) || [];

                  return modelsToShow.map((model: string, index: number) => {
                    // Get brand rate from modeMetrics
                    let brandRate = 0;

                    if (modeMetrics) {
                      const exactMatch = modeMetrics.find(
                        (m: any) => m.model === model
                      );
                      if (exactMatch) {
                        brandRate = exactMatch.mentionRate;
                      } else {
                        // Model mappings - handle variations in model names
                        const modelMappings: Record<string, string[]> = {
                          ChatGPT: ["GPT-4", "GPT-3.5", "OpenAI", "ChatGPT"],
                          Claude: ["Claude 3", "Claude 2", "Anthropic", "Claude"],
                          Gemini: ["Gemini 1.5 Pro", "Google", "Gemini"],
                          Perplexity: ["Perplexity"],
                          Llama: ["Llama", "Meta"],
                          Mistral: ["Mistral Large", "Mistral"],
                          Grok: ["Grok", "X AI"],
                        };

                        // Try to find the metric by checking if the current model matches any mapping
                        for (const [key, values] of Object.entries(modelMappings)) {
                          // Check if the current model name matches any of the mapped values
                          if (model === key || values.includes(model)) {
                            // Find the metric that matches this model group
                            const mappedMetric = modeMetrics.find((m: any) => {
                              return m.model === key || values.some(v => m.model === v || m.model.includes(v) || v.includes(m.model));
                            });
                            if (mappedMetric) {
                              brandRate = mappedMetric.mentionRate;
                              break;
                            }
                          }
                        }
                      }
                    }

                    // Get selected competitors' rates for this model
                    const selectedCompetitorRates = selectedCompetitors
                      .map((competitorName) => {
                        const competitor = arenaData && arenaData.find(
                          (comp) => comp.name === competitorName
                        );
                        const rate =
                          competitor?.modelsMentionsRate?.find(
                            (m: any) => m.model === model
                          )?.mentionsRate || 0;
                        return { name: competitorName, rate };
                      })
                      .filter((comp) => comp.rate > 0);

                    return (
                      <div
                        key={model}
                        className="p-4 rounded-lg bg-gray-50"
                      >
                        <div className="mb-3">
                          <Badge
                            variant="outline"
                            className={`${getModelColor(
                              model
                            )} font-medium flex items-center gap-1 w-fit`}
                          >
                            <ModelIcon model={model} size="xs" />
                            {model}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          {/* Brand mention rate */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {brandName}
                              </span>
                              <span className="text-sm font-semibold text-secondary-600">
                                {brandRate}%
                              </span>
                            </div>
                            <div>
                              <Progress value={brandRate} className="h-2" />
                            </div>
                          </div>

                          {/* Selected competitors mention rates */}
                          {selectedCompetitorRates.map((comp, compIndex) => (
                            <div key={comp.name}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-600">
                                  {comp.name}
                                </span>
                                <span
                                  className={`text-sm font-semibold ${
                                    comp.rate > brandRate
                                      ? "text-primary-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {comp.rate}%
                                </span>
                              </div>
                              <div>
                                <Progress
                                  value={comp.rate}
                                  className={`h-2 ${
                                    comp.rate > brandRate
                                      ? "[&>div]:bg-primary-500"
                                      : "[&>div]:bg-gray-400"
                                  }`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
