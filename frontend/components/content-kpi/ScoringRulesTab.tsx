'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Code,
  Globe,
  Tags,
  Database,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';
import { apiFetch } from '@/lib/api';

interface Rule {
  id: string;
  name: string;
  dimension: string;
  description: string;
  priority: number;
  weight: number;
  applicability: {
    scope: 'all' | 'category' | 'domain';
    categories?: string[];
    domains?: string[];
  };
  executionScope: 'page' | 'domain';
  usesLLM: boolean;
  llmPurpose?: string;
}

interface RulesData {
  rules: Rule[];
  dimensions: string[];
}

interface ScoringRulesTabProps {
  projectId: string;
}

const DIMENSION_COLORS: Record<string, string> = {
  technical: 'bg-purple-100 text-purple-800',
  content: 'bg-green-100 text-green-800',
  authority: 'bg-blue-100 text-blue-800',
  monitoringKpi: 'bg-orange-100 text-orange-800',
};

const DIMENSION_ICONS: Record<string, React.ElementType> = {
  technical: Code,
  content: Database,
  authority: CheckCircle,
  monitoringKpi: AlertCircle,
};

const getDimensionDisplayName = (dimension: string): string => {
  const names: Record<string, string> = {
    technical: 'Technical',
    content: 'Content',
    authority: 'Authority',
    monitoringKpi: 'Monitoring KPIs',
  };
  return names[dimension] || dimension;
};

export function ScoringRulesTab({ projectId }: ScoringRulesTabProps) {
  const [loading, setLoading] = useState(true);
  const [rulesData, setRulesData] = useState<RulesData | null>(null);
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(new Set(['page-technical']));
  const { token } = useAuth();

  useEffect(() => {
    const fetchRules = async () => {
      if (!token) return;
      
      setLoading(true);
      try {
        const response = await apiFetch(
          `/user/projects/${projectId}/crawler/rules`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setRulesData(response);
      } catch (error) {
        console.error('Error fetching rules:', error);
        toast({
          title: 'Error',
          description: 'Failed to load scoring rules',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [projectId, token]);

  const toggleDimension = (dimension: string) => {
    setExpandedDimensions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dimension)) {
        newSet.delete(dimension);
      } else {
        newSet.add(dimension);
      }
      return newSet;
    });
  };

  const getApplicabilityBadge = (rule: Rule) => {
    // For domain-scoped rules, show "Domain" regardless of applicability scope
    if (rule.executionScope === 'domain') {
      return <Badge variant="secondary">Domain</Badge>;
    }
    
    // For page-scoped rules, show based on applicability scope
    if (rule.applicability.scope === 'all') {
      return <Badge variant="secondary">All Pages</Badge>;
    } else if (rule.applicability.scope === 'category') {
      return (
        <Badge variant="outline">
          {rule.applicability.categories?.join(', ') || 'Specific Categories'}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          {rule.applicability.domains?.join(', ') || 'Specific Domains'}
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!rulesData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No rules data available</p>
        </CardContent>
      </Card>
    );
  }

  // Separate rules by execution scope first
  const pageRules = rulesData.rules.filter(rule => rule.executionScope === 'page');
  const domainRules = rulesData.rules.filter(rule => rule.executionScope === 'domain');
  
  // Group page rules by dimension
  const pageRulesByDimension = pageRules.reduce((acc, rule) => {
    if (!acc[rule.dimension]) {
      acc[rule.dimension] = [];
    }
    acc[rule.dimension].push(rule);
    return acc;
  }, {} as Record<string, Rule[]>);

  // Group domain rules by dimension
  const domainRulesByDimension = domainRules.reduce((acc, rule) => {
    if (!acc[rule.dimension]) {
      acc[rule.dimension] = [];
    }
    acc[rule.dimension].push(rule);
    return acc;
  }, {} as Record<string, Rule[]>);

  // Sort rules within each dimension by priority
  Object.keys(pageRulesByDimension).forEach(dimension => {
    pageRulesByDimension[dimension].sort((a, b) => b.priority - a.priority);
  });
  Object.keys(domainRulesByDimension).forEach(dimension => {
    domainRulesByDimension[dimension].sort((a, b) => b.priority - a.priority);
  });

  return (
    <div className="space-y-6">
      {/* Page-Level Rules Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Page-Level Rules</h2>
          <Badge variant="outline">{pageRules.length} rules</Badge>
        </div>
        <Card>
          <CardHeader>
            <CardDescription>
              Rules evaluated for each individual page during content analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rulesData.dimensions.map(dimension => {
                const rules = pageRulesByDimension[dimension] || [];
                if (rules.length === 0) return null;
                
                const Icon = DIMENSION_ICONS[dimension] || Database;
                const isExpanded = expandedDimensions.has(`page-${dimension}`);
                const totalWeight = rules.reduce((sum, rule) => sum + rule.weight, 0);
                const llmRulesCount = rules.filter(rule => rule.usesLLM).length;
              
                return (
                  <Collapsible
                    key={`page-${dimension}`}
                    open={isExpanded}
                    onOpenChange={() => toggleDimension(`page-${dimension}`)}
                  >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <Icon className="h-5 w-5" />
                            <h3 className="text-lg font-semibold">{getDimensionDisplayName(dimension)}</h3>
                            <Badge className={DIMENSION_COLORS[dimension]}>
                              {rules.length} rules
                            </Badge>
                            {llmRulesCount > 0 && (
                              <Badge variant="secondary" className="gap-1">
                                <Sparkles className="h-3 w-3" />
                                {llmRulesCount} AI-powered
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[200px]">Rule Name</TableHead>
                              <TableHead className="w-[350px]">Description</TableHead>
                              <TableHead className="w-[100px]">Weight</TableHead>
                              <TableHead className="w-[150px]">Applies To</TableHead>
                              <TableHead className="w-[250px]">AI Usage</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rules.map(rule => (
                              <TableRow key={rule.id}>
                                <TableCell className="font-medium w-[200px]">{rule.name}</TableCell>
                                <TableCell className="text-sm w-[350px]">{rule.description}</TableCell>
                                <TableCell className="w-[100px]">{(rule.weight * 100).toFixed(0)}%</TableCell>
                                <TableCell className="w-[150px]">{getApplicabilityBadge(rule)}</TableCell>
                                <TableCell className="w-[250px]">
                                  {rule.usesLLM ? (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="gap-1">
                                        <Sparkles className="h-3 w-3" />
                                        AI
                                      </Badge>
                                      {rule.llmPurpose && (
                                        <span className="text-xs text-muted-foreground">
                                          {rule.llmPurpose}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <Badge variant="outline" className="gap-1">
                                      <Code className="h-3 w-3" />
                                      Code-based
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Domain-Level Rules Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Domain-Level Rules</h2>
          <Badge variant="outline">{domainRules.length} rules</Badge>
        </div>
        <Card>
          <CardHeader>
            <CardDescription>
              Rules evaluated once per domain to assess overall website authority and technical setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rulesData.dimensions.map(dimension => {
                const rules = domainRulesByDimension[dimension] || [];
                if (rules.length === 0) return null;
                
                const Icon = DIMENSION_ICONS[dimension] || Database;
                const isExpanded = expandedDimensions.has(`domain-${dimension}`);
                const totalWeight = rules.reduce((sum, rule) => sum + rule.weight, 0);
                const llmRulesCount = rules.filter(rule => rule.usesLLM).length;
              
                return (
                  <Collapsible
                    key={`domain-${dimension}`}
                    open={isExpanded}
                    onOpenChange={() => toggleDimension(`domain-${dimension}`)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <Icon className="h-5 w-5" />
                              <h3 className="text-lg font-semibold">{getDimensionDisplayName(dimension)}</h3>
                              <Badge className={DIMENSION_COLORS[dimension]}>
                                {rules.length} rules
                              </Badge>
                              {llmRulesCount > 0 && (
                                <Badge variant="secondary" className="gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  {llmRulesCount} AI-powered
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[200px]">Rule Name</TableHead>
                                <TableHead className="w-[350px]">Description</TableHead>
                                <TableHead className="w-[100px]">Weight</TableHead>
                                <TableHead className="w-[150px]">Applies To</TableHead>
                                <TableHead className="w-[250px]">AI Usage</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rules.map(rule => (
                                <TableRow key={rule.id}>
                                  <TableCell className="font-medium w-[200px]">{rule.name}</TableCell>
                                  <TableCell className="text-sm w-[350px]">{rule.description}</TableCell>
                                  <TableCell className="w-[100px]">{(rule.weight * 100).toFixed(0)}%</TableCell>
                                  <TableCell className="w-[150px]">{getApplicabilityBadge(rule)}</TableCell>
                                  <TableCell className="w-[250px]">
                                    {rule.usesLLM ? (
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="gap-1">
                                          <Sparkles className="h-3 w-3" />
                                          AI
                                        </Badge>
                                        {rule.llmPurpose && (
                                          <span className="text-xs text-muted-foreground">
                                            {rule.llmPurpose}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <Badge variant="outline" className="gap-1">
                                        <Code className="h-3 w-3" />
                                        Code-based
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Understanding the Scoring System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">How Scores Are Calculated</h4>
            <p className="text-sm text-muted-foreground">
              Each page is evaluated against all applicable rules. Rules have weights that determine 
              their contribution to the dimension score. The final page score is the weighted average 
              of all four dimension scores.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">AI-Powered Rules</h4>
            <p className="text-sm text-muted-foreground">
              Some rules use AI to perform advanced analysis that would be difficult with code-based rules alone. 
              These rules provide deeper insights into content quality, brand alignment, and off-site signals.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Rule Applicability</h4>
            <p className="text-sm text-muted-foreground">
              Rules can apply to all pages, specific page categories (like blog posts or product pages), 
              or specific domains. This ensures relevant evaluation based on page type.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}