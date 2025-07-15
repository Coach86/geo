"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Search, FileText, Link2, ChevronRight, ChevronDown, Filter } from "lucide-react";
import { ModelDisplay } from "@/components/shared/ModelDisplay";
import { useFavicons, extractDomain } from "@/hooks/use-favicon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/persistent-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VisibilityCitation } from "./VisibilityCitationsTable";

interface SourcesFlowGraphProps {
  citations: VisibilityCitation[] | undefined;
  loading?: boolean;
  brandName: string;
}

interface FlowData {
  models: Map<string, {
    prompts: Map<number, {
      promptText: string;
      keywords: string[];
      brandMentioned: boolean;
      domains: Map<string, {
        urls: string[];
        brandMentioned: boolean;
      }>;
    }>;
  }>;
}

// Custom hook to detect if element is scrollable
function useScrollIndicator(ref: React.RefObject<HTMLDivElement | null>, dependencies: any[] = []) {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (ref.current) {
        const { scrollHeight, clientHeight, scrollTop } = ref.current;
        const hasMoreContent = scrollHeight > clientHeight && 
                              (scrollTop + clientHeight) < scrollHeight - 5;
        setShowIndicator(hasMoreContent);
      }
    };

    const element = ref.current;
    if (element) {
      // Check immediately
      setTimeout(checkScroll, 0);
      
      element.addEventListener('scroll', checkScroll);
      // Also check on resize
      window.addEventListener('resize', checkScroll);
      
      return () => {
        element.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [ref, ...dependencies]);

  return showIndicator;
}

export function SourcesFlowGraph({ citations, loading, brandName }: SourcesFlowGraphProps) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);
  const [brandFilter, setBrandFilter] = useState<'all' | 'mentioned' | 'not-mentioned'>('all');
  
  // Refs for scrollable containers
  const promptsRef = useRef<HTMLDivElement>(null);
  const domainsRef = useRef<HTMLDivElement>(null);
  
  // Scroll indicators
  const showPromptsIndicator = useScrollIndicator(promptsRef, [selectedModel, brandFilter]);
  const showDomainsIndicator = useScrollIndicator(domainsRef, [selectedPrompt]);

  // Process citations into hierarchical flow data
  const flowData = useMemo<FlowData>(() => {
    const data: FlowData = { models: new Map() };
    
    if (!citations) return data;

    citations.forEach(citation => {
      // Get or create model entry
      if (!data.models.has(citation.model)) {
        data.models.set(citation.model, { prompts: new Map() });
      }
      const modelData = data.models.get(citation.model)!;

      // Get or create prompt entry
      if (!modelData.prompts.has(citation.promptIndex)) {
        modelData.prompts.set(citation.promptIndex, {
          promptText: citation.promptText || '',
          keywords: [], // We'll extract keywords from prompt text
          brandMentioned: false,
          domains: new Map()
        });
      }
      const promptData = modelData.prompts.get(citation.promptIndex)!;

      // Use actual search queries from the API if available
      if (citation.searchQueries && citation.searchQueries.length > 0 && promptData.keywords.length === 0) {
        promptData.keywords = [...new Set(citation.searchQueries)];
      }

      // Add domain and URL
      if (!promptData.domains.has(citation.website)) {
        promptData.domains.set(citation.website, {
          urls: [],
          brandMentioned: false
        });
      }
      const domainData = promptData.domains.get(citation.website)!;
      
      if (!domainData.urls.includes(citation.link)) {
        domainData.urls.push(citation.link);
      }
      
      // Update brand mention status (use OR logic)
      if (citation.brandMentioned) {
        domainData.brandMentioned = true;
        promptData.brandMentioned = true;
      }
    });

    return data;
  }, [citations]);

  // Get unique domains for favicon fetching
  const uniqueDomains = useMemo(() => {
    const domains = new Set<string>();
    flowData.models.forEach(modelData => {
      modelData.prompts.forEach(promptData => {
        promptData.domains.forEach((_, domain) => {
          domains.add(domain);
        });
      });
    });
    return Array.from(domains);
  }, [flowData]);

  const { favicons } = useFavicons(uniqueDomains);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Sources Flow Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!citations || citations.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Sources Flow Analysis
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Visualize how models discover information about {brandName}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 italic text-center py-8">
            No citations found for the selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Search className="h-5 w-5 text-blue-600" />
          Sources Flow Analysis
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Interactive flow showing how models discover information about {brandName}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[1100px] flex gap-6 p-4">
            {/* Models Column */}
            <div className="flex-shrink-0 w-48">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Badge variant="secondary" className="h-5">1</Badge>
                Models
              </h3>
              <div className="space-y-2">
                {Array.from(flowData.models.entries()).map(([model, modelData]) => (
                  <button
                    key={model}
                    onClick={() => {
                      setSelectedModel(model);
                      setSelectedPrompt(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedModel === model
                        ? 'bg-blue-50 border-blue-300 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <ModelDisplay model={model} size="sm" />
                    <p className="text-xs text-gray-500 mt-1">
                      {modelData.prompts.size} prompts
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Arrow */}
            {selectedModel && (
              <div className="flex items-center">
                <ChevronRight className="h-6 w-6 text-gray-400" />
              </div>
            )}

            {/* Prompts Column */}
            {selectedModel && (
              <div className="flex-shrink-0 w-64 relative">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Badge variant="secondary" className="h-5">2</Badge>
                    Prompts
                  </h3>
                  <Select value={brandFilter} onValueChange={(value: any) => setBrandFilter(value)}>
                    <SelectTrigger className={`w-auto h-7 text-xs border-0 p-1 gap-1 hover:bg-gray-100 rounded ${
                      brandFilter !== 'all' ? 'bg-blue-50 text-blue-600' : ''
                    }`}>
                      <Filter className="h-3 w-3" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">All prompts</SelectItem>
                      <SelectItem value="mentioned">{brandName} mentioned</SelectItem>
                      <SelectItem value="not-mentioned">{brandName} not mentioned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div ref={promptsRef} className="space-y-2 max-h-96 overflow-y-auto">
                  {(() => {
                    const filteredPrompts = Array.from(flowData.models.get(selectedModel)!.prompts.entries())
                      .filter(([_, promptData]) => {
                        if (brandFilter === 'all') return true;
                        if (brandFilter === 'mentioned') return promptData.brandMentioned;
                        if (brandFilter === 'not-mentioned') return !promptData.brandMentioned;
                        return true;
                      });
                    
                    if (filteredPrompts.length === 0) {
                      return (
                        <div className="p-4 text-center">
                          <p className="text-sm text-gray-500">No prompts to display</p>
                          <p className="text-xs text-gray-400 mt-1">Try changing the filter above</p>
                        </div>
                      );
                    }
                    
                    return filteredPrompts.map(([promptIndex, promptData]) => (
                    <button
                      key={promptIndex}
                      onClick={() => {
                        setSelectedPrompt(promptIndex);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedPrompt === promptIndex
                          ? 'bg-blue-50 border-blue-300 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">Prompt #{promptIndex + 1}</p>
                            {promptData.brandMentioned && (
                              <Badge variant="success" className="text-xs">
                                {brandName} mentioned
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {promptData.promptText || 'No prompt text available'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {promptData.domains.size} domains
                          </p>
                        </div>
                      </div>
                    </button>
                  ));
                  })()}
                </div>
                {showPromptsIndicator && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none flex items-end justify-center pb-1">
                    <ChevronDown className="h-4 w-4 text-gray-400 animate-bounce" />
                  </div>
                )}
              </div>
            )}

            {/* Arrow */}
            {selectedPrompt !== null && (
              <div className="flex items-center">
                <ChevronRight className="h-6 w-6 text-gray-400" />
              </div>
            )}

            {/* Keywords Column */}
            {selectedPrompt !== null && (
              <div className="flex-shrink-0 w-48">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Badge variant="secondary" className="h-5">3</Badge>
                  Search Keywords
                </h3>
                <div className="space-y-2">
                  {flowData.models.get(selectedModel!)!.prompts.get(selectedPrompt)!.keywords.length > 0 ? (
                    flowData.models.get(selectedModel!)!.prompts.get(selectedPrompt)!.keywords.map((keyword, idx) => (
                      <div
                        key={idx}
                        className="w-full text-left p-3 rounded-lg border bg-white border-gray-200"
                      >
                        <div className="flex items-start gap-2">
                          <Search className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs break-words">{keyword}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="w-full text-left p-3 rounded-lg border bg-gray-100 border-gray-200">
                      <div className="flex items-center gap-2">
                        <Search className="h-3 w-3 text-gray-400" />
                        <p className="text-xs text-gray-500 italic">Unknown keywords</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Arrow */}
            {selectedPrompt !== null && (
              <div className="flex items-center">
                <ChevronRight className="h-6 w-6 text-gray-400" />
              </div>
            )}

            {/* Domains Column */}
            {selectedPrompt !== null && (
              <div className="flex-shrink-0 w-96 relative">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Badge variant="secondary" className="h-5">4</Badge>
                  Domains & URLs
                </h3>
                <div ref={domainsRef} className="space-y-2 max-h-96 overflow-y-auto">
                  {Array.from(flowData.models.get(selectedModel!)!.prompts.get(selectedPrompt)!.domains.entries()).map(([domain, domainData]) => (
                    <div
                      key={domain}
                      className="p-3 rounded-lg border bg-white border-gray-200 min-w-0"
                    >
                      <div className="flex items-start gap-2">
                        {favicons[domain] ? (
                          <img
                            src={favicons[domain]}
                            alt={`${domain} favicon`}
                            className="w-4 h-4 rounded-sm mt-0.5"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Globe className="w-4 h-4 text-gray-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{domain}</p>
                          <div className="mt-1 space-y-1">
                            {domainData.urls.slice(0, 2).map((url, idx) => (
                              <TooltipProvider key={idx}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline block"
                                    >
                                      <div className="flex items-center gap-1">
                                        <Link2 className="h-3 w-3 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <div className="truncate">
                                            {url}
                                          </div>
                                        </div>
                                      </div>
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-xl">
                                    <p className="text-xs break-all">{url}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                            {domainData.urls.length > 2 && (
                              <p className="text-xs text-gray-500">
                                +{domainData.urls.length - 2} more URLs
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {showDomainsIndicator && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none flex items-end justify-center pb-1">
                    <ChevronDown className="h-4 w-4 text-gray-400 animate-bounce" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}