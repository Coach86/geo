'use client';

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle2,
  AlertCircle,
  Info,
  TrendingUp,
  Bot,
  Lightbulb,
  Search,
  Zap,
  Target,
  Copy,
} from 'lucide-react';
import { EvidenceItemRenderer, type EvidenceItem } from './evidence/EvidenceItemRenderer';
import { EVIDENCE_TYPE_CONFIG } from './evidence/evidenceConfig';
import { ScoreBadge } from './evidence/ScoreBadge';
import { CodeBlock } from './evidence/CodeBlock';
import { RuleIcon } from './RuleIcon';
import { DIMENSION_COLORS } from '@/lib/constants/colors';

interface AIUsage {
  modelName: string;
  prompt: string;
  response: string;
}

interface RuleResult {
  ruleId: string;
  ruleName: string;
  category: 'technical' | 'content' | 'authority' | 'quality';
  description?: string;
  score: number;
  maxScore: number;
  weight: number;
  contribution: number;
  passed: boolean;
  evidence: EvidenceItem[];
  recommendations?: string[];
  issues?: Array<{
    dimension: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
    affectedElements?: string[];
  }>;
  details?: Record<string, any>;
  aiUsage?: AIUsage;
}

interface RuleDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rule: RuleResult | null;
  pageUrl?: string;
}


const SEVERITY_ICONS = {
  critical: AlertCircle,
  high: AlertCircle,
  medium: Info,
  low: Info,
};

const SEVERITY_COLORS = {
  critical: 'text-red-600 dark:text-red-500',
  high: 'text-orange-600 dark:text-orange-500',
  medium: 'text-yellow-600 dark:text-yellow-500',
  low: 'text-blue-600 dark:text-blue-500',
};

// AI-based rules that use LLM for analysis
const AI_BASED_RULES = [
  'case-studies',
  'citing-sources',
  'comparison-content',
  'definitional-content',
  'in-depth-guides'
];

// This function is now replaced by the RuleIcon component

// Evidence styling removed - using simple gray boxes as requested

// Component for rendering evidence without the icon (used in cards that already have the icon)
function EvidenceItemRendererNoIcon({ item }: { item: EvidenceItem }) {
  const { type, content } = item;

  // Special case for headings
  if (type === 'heading') {
    return (
      <div className="mt-4 mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {content}
        </h4>
      </div>
    );
  }

  // Special case for base score
  if (type === 'base') {
    return (
      <div className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-lg transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Base Score
            </h4>
          </div>
          <div className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded text-xs font-semibold text-blue-700 dark:text-blue-300">
            {item.score}
          </div>
        </div>
      </div>
    );
  }

  // Special case for score calculations
  if (type === 'score') {
    const finalScoreMatch = content.match(/=\s*(\d+)\/(\d+)$/);
    let finalScore = 0;
    let maxScore = 100;
    let percentage = 0;
    
    if (finalScoreMatch) {
      finalScore = parseInt(finalScoreMatch[1]);
      maxScore = parseInt(finalScoreMatch[2]);
      percentage = (finalScore / maxScore) * 100;
    }
    
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Score Calculation
          </h5>
          <div className="font-mono text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    );
  }

  // Handle regular evidence types (success, error, warning, info) without icon
  const config = EVIDENCE_TYPE_CONFIG[type as keyof typeof EVIDENCE_TYPE_CONFIG] || EVIDENCE_TYPE_CONFIG.info;

  return (
    <div className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-lg transition-colors">
      <div className="flex-1 min-w-0">
        {/* Topic and Score row */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1">
            {item.topic && (
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                {item.topic}
              </h4>
            )}
          </div>
          {item.score !== undefined && <ScoreBadge score={item.score} maxScore={item.maxScore} />}
        </div>
        
        {/* Content */}
        <p className={`${config.textColor} text-sm leading-relaxed break-words`}>
          {content}
        </p>
        
        {/* Target - inline with better styling */}
        {item.target && (
          <div className="flex items-start gap-2 mt-2">
            <Target className="h-3 w-3 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-gray-600 dark:text-gray-400 italic">
              {item.target}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function RuleDetailsDrawer({ isOpen, onClose, rule, pageUrl }: RuleDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState('summary');
  
  if (!rule) return null;

  // Separate score items from other evidence, but include base items with other evidence
  const scoreItems = rule.evidence.filter(item => item.type === 'score');
  const baseItems = rule.evidence.filter(item => item.type === 'base');
  const regularEvidence = rule.evidence.filter(item => item.type !== 'score' && item.type !== 'base');
  
  // Combine base items first, then regular evidence
  const otherEvidence = [...baseItems, ...regularEvidence];

  const hasIssues = rule.issues && rule.issues.length > 0;
  const percentage = (rule.score / rule.maxScore) * 100;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${DIMENSION_COLORS[rule.category]}20` }}
              >
                <RuleIcon 
                  ruleId={rule.ruleId}
                  category={rule.category}
                  showBackground={false}
                  size="md"
                />
              </div>
              <div>
                <SheetTitle className="text-lg">{rule.ruleName}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant="outline"
                    style={{
                      borderColor: DIMENSION_COLORS[rule.category],
                      color: DIMENSION_COLORS[rule.category]
                    }}
                  >
                    {rule.category}
                  </Badge>
                  {rule.passed ? (
                    <Badge variant="outline" style={{ borderColor: '#10b981', color: '#10b981' }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Pass
                    </Badge>
                  ) : (
                    <Badge variant="outline" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Fail
                    </Badge>
                  )}
                  {(rule.aiUsage || AI_BASED_RULES.includes(rule.ruleId)) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}>
                            <Bot className="h-3 w-3 mr-1" />
                            AI Analyzed
                          </Badge>
                        </TooltipTrigger>
                        {rule.aiUsage && (
                          <TooltipContent side="bottom" align="end" className="max-w-lg p-3">
                            <div className="space-y-3">
                              <div>
                                <p className="font-semibold text-xs mb-1">Model:</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{rule.aiUsage.modelName}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-xs mb-1">Prompt:</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                  {rule.aiUsage.prompt.length > 500 
                                    ? rule.aiUsage.prompt.substring(0, 500) + '...' 
                                    : rule.aiUsage.prompt}
                                </p>
                              </div>
                              <div>
                                <p className="font-semibold text-xs mb-1">Response:</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                  {rule.aiUsage.response.length > 500 
                                    ? rule.aiUsage.response.substring(0, 500) + '...' 
                                    : rule.aiUsage.response}
                                </p>
                              </div>
                            </div>
                          </TooltipContent>
                        )}
                        {!rule.aiUsage && (
                          <TooltipContent>
                            <p className="text-xs">This rule uses AI for analysis</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </div>
          </div>
          {pageUrl && (
            <div className="text-sm text-muted-foreground truncate">
              {pageUrl}
            </div>
          )}
          {rule.description && (
            <SheetDescription className="text-sm">
              {rule.description}
            </SheetDescription>
          )}
          <SheetDescription className="text-left">
            <span className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{rule.score}</span>
                <span className="text-muted-foreground text-xs">/ {rule.maxScore}</span>
              </span>
              <span className="flex-1 bg-gray-200 rounded-full h-2 relative max-w-32">
                <span 
                  className="h-2 rounded-full transition-all block"
                  style={{ 
                    backgroundColor: rule.passed ? '#10b981' : '#ef4444',
                    width: `${Math.max(0, Math.min(100, percentage))}%` 
                  }}
                />
              </span>
              <span className="text-xs text-muted-foreground">
                Weight: {rule.weight.toFixed(1)}
              </span>
            </span>
          </SheetDescription>
        </SheetHeader>
        
        {/* Tabs Content Area */}
        <div className="flex-1 overflow-hidden mt-2 pb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="recommendations" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Issues & Recommendations ({(rule.issues?.length || 0) + (rule.recommendations?.length || 0)})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="flex-1 overflow-y-auto mt-8">
              <div className="space-y-4">
            {/* Evidence Section */}
            {otherEvidence.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  Evidence ({otherEvidence.length})
                  {/* Debug: Show total maxScore in dev mode */}
                  {process.env.NODE_ENV === 'development' && (() => {
                    // Include base scores in the calculation
                    const totalMaxScore = otherEvidence.reduce((sum, item) => {
                      if (item.type === 'base') {
                        // For base scores, add the base score value itself
                        return sum + (item.score || 0);
                      }
                      return sum + (item.maxScore || 0);
                    }, 0);
                    const hasMaxScores = otherEvidence.some(item => item.maxScore !== undefined || item.type === 'base');
                    
                    if (!hasMaxScores) return null;
                    
                    const isNot100 = totalMaxScore !== 100;
                    return (
                      <span className={`ml-2 text-xs ${isNot100 ? 'font-bold text-red-600 dark:text-red-400' : 'font-normal text-orange-600 dark:text-orange-400'}`}>
                        [DEBUG: maxScore total = {totalMaxScore}]
                      </span>
                    );
                  })()}
                </h5>
                <div className="space-y-3">
                  {otherEvidence.map((item, idx) => {
                    const evidenceConfig = EVIDENCE_TYPE_CONFIG[item.type as keyof typeof EVIDENCE_TYPE_CONFIG] || EVIDENCE_TYPE_CONFIG.info;
                    const EvidenceIcon = evidenceConfig.icon;
                    const evidenceColor = evidenceConfig.iconColor.includes('green') ? '#10b981' :
                                        evidenceConfig.iconColor.includes('red') ? '#ef4444' :
                                        evidenceConfig.iconColor.includes('amber') ? '#f59e0b' :
                                        '#6b7280';
                    
                    return (
                      <Card key={idx}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <div 
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: `${evidenceColor}20` }}
                            >
                              <EvidenceIcon 
                                className="h-4 w-4"
                                style={{ color: evidenceColor }}
                              />
                            </div>
                            <div className="flex-1">
                              <EvidenceItemRendererNoIcon item={item} />
                            </div>
                          </div>
                        </CardContent>
                        {/* Code block outside CardContent for full width */}
                        {item.code && (
                          <div className="border-t border-gray-100 dark:border-gray-800">
                            <div className="relative group">
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                  onClick={() => navigator.clipboard.writeText(item.code)}
                                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                  title="Copy to clipboard"
                                >
                                  <Copy className="h-3 w-3 text-gray-500" />
                                </button>
                              </div>
                              <pre className="bg-gray-50 dark:bg-gray-900 border-0 rounded-none p-3 overflow-x-auto m-0 relative">
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="text-6xl font-mono text-gray-300/20 dark:text-gray-600/20">
                                    &lt;&gt;
                                  </span>
                                </div>
                                <code className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre relative z-10">
                                  {item.code}
                                </code>
                              </pre>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
              </div>
            </TabsContent>
            
            <TabsContent value="recommendations" className="flex-1 overflow-y-auto mt-8">
              <div className="space-y-6">
                {/* Issues Section */}
                {hasIssues && (
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                      Issues Found ({rule.issues!.length})
                    </h5>
                    <div className="space-y-2">
                      {rule.issues!.map((issue, idx) => {
                        const Icon = SEVERITY_ICONS[issue.severity];
                        
                        return (
                          <div 
                            key={idx} 
                            className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 py-2"
                          >
                            <div className="flex items-start gap-3">
                              <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${SEVERITY_COLORS[issue.severity]}`} />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-4">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {issue.description}
                                  </p>
                                  <span className={`text-xs font-medium ${SEVERITY_COLORS[issue.severity]}`}>
                                    {issue.severity}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {issue.recommendation}
                                </p>
                                {issue.affectedElements && issue.affectedElements.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {issue.affectedElements.map((elem, i) => (
                                      <code 
                                        key={i}
                                        className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded"
                                      >
                                        {elem}
                                      </code>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recommendations Section */}
                {rule.recommendations && rule.recommendations.length > 0 ? (
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                      Recommendations ({rule.recommendations.length})
                    </h5>
                    <div className="space-y-3">
                      {rule.recommendations.map((recommendation, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                        >
                          <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              {recommendation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  !hasIssues && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Lightbulb className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No issues or recommendations for this rule.
                      </p>
                    </div>
                  )
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Fixed Score Computation at Bottom */}
        {scoreItems.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 bg-background">
            {scoreItems.map((item, idx) => (
              <EvidenceItemRenderer key={idx} item={item} />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}