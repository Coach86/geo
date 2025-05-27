"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ModelIcon } from "@/components/ui/model-icon";
import { Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

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
}

export function VisibilityAnalysis({
  mentionRate,
  modeMetrics,
  arenaData,
  brandName,
  selectedCompetitors = [],
}: VisibilityAnalysisProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

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
    };
    return colors[model] || "bg-dark-50 text-dark-700 border-dark-100";
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-dark-700 flex items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={inView ? { scale: 1 } : { scale: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Eye className="h-5 w-5 text-primary-600" />
            </motion.div>
            Brand Visibility Analysis
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Overall and per-model mention rates with competitor comparison
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Overall Mention Rate */}
            <motion.div
              className="pb-4 border-b border-gray-200"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
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
                    <motion.span
                      className="text-lg font-bold text-secondary-600"
                      initial={{ scale: 0 }}
                      animate={inView ? { scale: 1 } : { scale: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      {mentionRate || 0}%
                    </motion.span>
                  </div>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    style={{ transformOrigin: "left" }}
                  >
                    <Progress value={mentionRate || 0} className="h-2" />
                  </motion.div>
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
                    <motion.div
                      key={competitorName}
                      initial={{ opacity: 0, y: 10 }}
                      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                      transition={{ duration: 0.2, delay: 0.05 + index * 0.05 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          {competitorName}
                        </span>
                        <motion.span
                          className={`text-lg font-bold ${competitorMentionRate > mentionRate ? 'text-primary-600' : 'text-gray-600'}`}
                          initial={{ scale: 0 }}
                          animate={inView ? { scale: 1 } : { scale: 0 }}
                          transition={{ duration: 0.2, delay: 0.1 + index * 0.05 }}
                        >
                          {competitorMentionRate}%
                        </motion.span>
                      </div>
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
                        style={{ transformOrigin: "left" }}
                      >
                        <Progress 
                          value={competitorMentionRate} 
                          className={`h-2 ${competitorMentionRate > mentionRate ? '[&>div]:bg-primary-500' : '[&>div]:bg-gray-400'}`} 
                        />
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
              
              <motion.p
                className="text-xs text-gray-500 mt-3"
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.4, delay: 1.0 }}
              >
                Percentage of relevant conversations mentioning each brand across all models
              </motion.p>
            </motion.div>

            {/* By Model Breakdown */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Breakdown by Model
              </h4>
              <div className="space-y-3">
                {(() => {
                  // Get unique models from arena data
                  const modelsToShow =
                    arenaData.length > 0 && arenaData[0]?.modelsMentionsRate
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
                        // Model mappings
                        const modelMappings: Record<string, string[]> = {
                          ChatGPT: ["GPT-4", "GPT-3.5", "OpenAI"],
                          Claude: ["Claude 3", "Claude 2", "Anthropic"],
                          Gemini: ["Gemini 1.5 Pro", "Google"],
                          Perplexity: ["Perplexity"],
                          Llama: ["Llama", "Meta"],
                        };

                        for (const [key, values] of Object.entries(
                          modelMappings
                        )) {
                          if (values.includes(model) || model.includes(key)) {
                            const mappedMetric = modeMetrics.find(
                              (m: any) =>
                                m.model === key ||
                                values.some((v) => m.model.includes(v))
                            );
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
                        const competitor = arenaData.find(
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
                      <motion.div
                        key={model}
                        className="p-4 rounded-lg bg-gray-50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={
                          inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }
                        }
                        transition={{
                          duration: 0.5,
                          delay: 1.1 + index * 0.1,
                          ease: "easeOut",
                        }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={inView ? { scale: 1 } : { scale: 0 }}
                          transition={{
                            duration: 0.4,
                            delay: 1.2 + index * 0.1,
                          }}
                          className="mb-3"
                        >
                          <Badge
                            variant="outline"
                            className={`${getModelColor(
                              model
                            )} font-medium flex items-center gap-1 w-fit`}
                          >
                            <ModelIcon model={model} size="xs" />
                            {model}
                          </Badge>
                        </motion.div>

                        <div className="space-y-3">
                          {/* Brand mention rate */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {brandName}
                              </span>
                              <motion.span
                                className="text-sm font-semibold text-secondary-600"
                                initial={{ opacity: 0 }}
                                animate={inView ? { opacity: 1 } : { opacity: 0 }}
                                transition={{
                                  duration: 0.4,
                                  delay: 1.4 + index * 0.1,
                                }}
                              >
                                {brandRate}%
                              </motion.span>
                            </div>
                            <motion.div
                              initial={{ scaleX: 0 }}
                              animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
                              transition={{
                                duration: 0.8,
                                delay: 1.5 + index * 0.1,
                                ease: "easeOut",
                              }}
                              style={{ transformOrigin: "left" }}
                            >
                              <Progress
                                value={brandRate}
                                className="h-2"
                              />
                            </motion.div>
                          </div>

                          {/* Selected competitors mention rates */}
                          {selectedCompetitorRates.map((comp, compIndex) => (
                            <motion.div
                              key={comp.name}
                              initial={{ opacity: 0, y: 5 }}
                              animate={
                                inView
                                  ? { opacity: 1, y: 0 }
                                  : { opacity: 0, y: 5 }
                              }
                              transition={{
                                duration: 0.2,
                                delay: 0.05 + compIndex * 0.02,
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-600">
                                  {comp.name}
                                </span>
                                <motion.span
                                  className={`text-sm font-semibold ${comp.rate > brandRate ? 'text-primary-600' : 'text-gray-600'}`}
                                  initial={{ opacity: 0 }}
                                  animate={
                                    inView ? { opacity: 1 } : { opacity: 0 }
                                  }
                                  transition={{
                                    duration: 0.2,
                                    delay: 0.1 + compIndex * 0.02,
                                  }}
                                >
                                  {comp.rate}%
                                </motion.span>
                              </div>
                              <motion.div
                                initial={{ scaleX: 0 }}
                                animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
                                transition={{
                                  duration: 0.3,
                                  delay: 0.15 + compIndex * 0.02,
                                  ease: "easeOut",
                                }}
                                style={{ transformOrigin: "left" }}
                              >
                                <Progress
                                  value={comp.rate}
                                  className={`h-2 ${comp.rate > brandRate ? '[&>div]:bg-primary-500' : '[&>div]:bg-gray-400'}`}
                                />
                              </motion.div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
