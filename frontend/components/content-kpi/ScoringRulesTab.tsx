'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Sparkles,
  AlertCircle,
  CheckCircle,
  Code,
  Globe,
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
  structure: 'bg-accent/10 text-accent',
  authority: 'bg-blue-100 text-blue-800',
  quality: 'bg-orange-100 text-orange-800',
};

const DIMENSION_ICONS: Record<string, React.ElementType> = {
  technical: Code,
  structure: Database,
  authority: CheckCircle,
  quality: AlertCircle,
};

const getDimensionDisplayName = (dimension: string): string => {
  const names: Record<string, string> = {
    technical: 'Technical',
    structure: 'Structure',
    authority: 'Authority',
    quality: 'Quality',
  };
  return names[dimension] || dimension;
};

export function ScoringRulesTab({ projectId }: ScoringRulesTabProps) {
  const [loading, setLoading] = useState(true);
  const [rulesData, setRulesData] = useState<RulesData | null>(null);
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
  const { token } = useAuth();

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openTooltipId) {
        setOpenTooltipId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openTooltipId]);

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
        setRulesData(response as RulesData);
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

  const getApplicabilityBadge = (rule: Rule) => {
    if (rule.executionScope === 'domain') {
      return <Badge variant="secondary" className="text-xs">Domain</Badge>;
    }
    
    if (rule.applicability.scope === 'all') {
      return <Badge variant="secondary" className="text-xs">All Pages</Badge>;
    } else if (rule.applicability.scope === 'category') {
      const categories = rule.applicability.categories || [];
      const categoriesText = categories.length > 0 
        ? categories.join(', ')
        : 'No categories specified';
      
      const isOpen = openTooltipId === rule.id;
      
      return (
        <Tooltip open={isOpen} onOpenChange={(open) => setOpenTooltipId(open ? rule.id : null)}>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className="text-xs cursor-help"
              onClick={(e) => {
                e.stopPropagation();
                setOpenTooltipId(isOpen ? null : rule.id);
              }}
            >
              {categories.length} Categories
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="font-medium text-xs mb-1">Applied to categories:</p>
              <p className="text-xs">{categoriesText}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    } else {
      return (
        <Badge variant="outline" className="text-xs">
          Specific
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

  // Separate rules by execution scope
  const pageRules = rulesData.rules.filter(rule => rule.executionScope === 'page');
  const domainRules = rulesData.rules.filter(rule => rule.executionScope === 'domain');
  
  // Group by dimension
  const pageRulesByDimension = pageRules.reduce((acc, rule) => {
    if (!acc[rule.dimension]) {
      acc[rule.dimension] = [];
    }
    acc[rule.dimension].push(rule);
    return acc;
  }, {} as Record<string, Rule[]>);

  const domainRulesByDimension = domainRules.reduce((acc, rule) => {
    if (!acc[rule.dimension]) {
      acc[rule.dimension] = [];
    }
    acc[rule.dimension].push(rule);
    return acc;
  }, {} as Record<string, Rule[]>);

  // Sort rules by priority
  Object.keys(pageRulesByDimension).forEach(dimension => {
    pageRulesByDimension[dimension].sort((a, b) => b.priority - a.priority);
  });
  Object.keys(domainRulesByDimension).forEach(dimension => {
    domainRulesByDimension[dimension].sort((a, b) => b.priority - a.priority);
  });

  const renderRulesSection = (
    title: string,
    icon: React.ElementType,
    rules: Rule[],
    rulesByDimension: Record<string, Rule[]>
  ) => {
    const Icon = icon;
    
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle>{title}</CardTitle>
            <Badge variant="outline">{rules.length} rules</Badge>
          </div>
          <CardDescription>
            {title === 'Page-Level Rules' 
              ? 'Rules evaluated for each individual page during content analysis'
              : 'Rules evaluated once per domain to assess overall website authority and technical setup'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rulesData.dimensions.map(dimension => {
            const dimensionRules = rulesByDimension[dimension] || [];
            if (dimensionRules.length === 0) return null;
            
            const DimensionIcon = DIMENSION_ICONS[dimension] || Database;
            const llmRulesCount = dimensionRules.filter(rule => rule.usesLLM).length;
            
            return (
              <div key={`${title}-${dimension}`} className="border-b last:border-b-0">
                {/* Dimension Header */}
                <div className="px-6 py-3 bg-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <DimensionIcon className="h-4 w-4" />
                    <h3 className="font-semibold">{getDimensionDisplayName(dimension)}</h3>
                    <Badge className={`${DIMENSION_COLORS[dimension]} text-xs`}>
                      {dimensionRules.length} rules
                    </Badge>
                    {llmRulesCount > 0 && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Sparkles className="h-3 w-3" />
                        {llmRulesCount} AI
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Compact Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px] py-2">Rule Name</TableHead>
                      <TableHead className="w-[40%] py-2">Description</TableHead>
                      <TableHead className="w-[60px] text-center py-2">Weight</TableHead>
                      <TableHead className="w-[100px] text-center py-2">Scope</TableHead>
                      <TableHead className="w-[80px] text-center py-2">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dimensionRules.map(rule => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium py-2 text-sm">{rule.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2">
                          {rule.description}
                          {rule.usesLLM && rule.llmPurpose && (
                            <div className="text-xs text-primary mt-1">
                              AI: {rule.llmPurpose}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-2 text-sm">
                          {(rule.weight * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-center py-2">
                          {getApplicabilityBadge(rule)}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          {rule.usesLLM ? (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Sparkles className="h-3 w-3" />
                              AI
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Code className="h-3 w-3" />
                              Code
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Page-Level Rules */}
        {renderRulesSection('Page-Level Rules', Globe, pageRules, pageRulesByDimension)}
        
        {/* Domain-Level Rules */}
        {renderRulesSection('Domain-Level Rules', Database, domainRules, domainRulesByDimension)}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Understanding the Scoring System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium text-sm mb-1">How Scores Are Calculated</h4>
              <p className="text-xs text-muted-foreground">
                Each page is evaluated against all applicable rules. Rules have weights that determine 
                their contribution to the dimension score. The final page score is the weighted average 
                of all four dimension scores.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-1">AI-Powered Rules</h4>
              <p className="text-xs text-muted-foreground">
                Some rules use AI to perform advanced analysis that would be difficult with code-based rules alone. 
                These rules provide deeper insights into content quality, brand alignment, and off-site signals.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-1">Rule Applicability</h4>
              <p className="text-xs text-muted-foreground">
                Rules can apply to all pages, specific page categories (like blog posts or product pages), 
                or specific domains. This ensures relevant evaluation based on page type.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}