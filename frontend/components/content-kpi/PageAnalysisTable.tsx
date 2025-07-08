'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { FilterBar } from './FilterBar';
import { PageDetailsSection } from './PageDetailsSection';
import { DIMENSION_COLORS, getDimensionColor } from '@/lib/constants/colors';

interface PageIssue {
  id?: string;
  dimension: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation?: string;
  affectedElements?: string[];
  ruleId?: string;
  ruleName?: string;
}

interface EvidenceItem {
  type: 'info' | 'success' | 'warning' | 'error' | 'score' | 'heading';
  content: string;
  target?: string;
  code?: string;
  score?: number;
  maxScore?: number;
  metadata?: Record<string, any>;
}

interface PageAnalysis {
  url: string;
  title?: string;
  globalScore: number;
  scores?: {
    technical: number;
    structure: number;
    authority: number;
    quality: number;
  };
  ruleResults?: Array<{
    ruleId: string;
    ruleName: string;
    category: 'technical' | 'structure' | 'authority' | 'quality';
    score: number;
    maxScore: number;
    weight: number;
    contribution: number;
    passed: boolean;
    evidence: EvidenceItem[];
    issues?: Array<{
      dimension: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
      affectedElements?: string[];
    }>;
    details?: Record<string, any>;
  }>;
  details?: any;
  calculationDetails?: any;
  issues: PageIssue[];
  crawledAt: Date;
  pageCategory?: string;
  analysisLevel?: string;
  categoryConfidence?: number;
  skipped?: boolean;
  skipReason?: string;
}

interface PageAnalysisTableProps {
  pages: PageAnalysis[];
  projectId: string;
  isDomainAnalysis?: boolean;
  onIssueClick?: (issue: any) => void;
}

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

const formatPageCategory = (category?: string): string => {
  if (!category) return 'Unknown';
  
  // Map to shorter names - handle both enum values and display names
  const shortNames: Record<string, string> = {
    // Enum values (from backend)
    'homepage': 'Home',
    'product_category_page': 'Category',
    'product_detail_page': 'Product',
    'services_features_page': 'Services',
    'pricing_page': 'Pricing',
    'comparison_page': 'Compare',
    'blog_post_article': 'Blog/Article',
    'blog_category_tag_page': 'Blog Cat',
    'pillar_page_topic_hub': 'Pillar',
    'product_roundup_review_article': 'Review',
    'how_to_guide_tutorial': 'How-to',
    'case_study_success_story': 'Case Study',
    'what_is_x_definitional_page': 'Guide',
    'in_depth_guide_white_paper': 'Guide',
    'faq_glossary_pages': 'FAQ',
    'public_forum_ugc_pages': 'Forum',
    'corporate_contact_pages': 'Corporate',
    'private_user_account_pages': 'Account',
    'search_results_error_pages': 'Search/Error',
    'legal_pages': 'Legal',
    
    // Display names (from backend getCategoryDisplayName)
    'Homepage': 'Home',
    'Product Category (PLP)': 'Category',
    'Product Detail (PDP)': 'Product',
    'Services/Features': 'Services',
    'Pricing Page': 'Pricing',
    'Comparison Page': 'Compare',
    'Blog Post/Article': 'Blog/Article',
    'Blog Post Article': 'Blog/Article',
    'Blog Category/Tag Page': 'Blog Cat',
    'Pillar Page/Topic Hub': 'Pillar',
    'Product Roundup/Review Article': 'Review',
    'Product Roundup Review Article': 'Review',
    'How-To Guide/Tutorial': 'How-to',
    'Case Study/Success Story': 'Case Study',
    'What is X/Definitional Page': 'Guide',
    'What Is X Definitional Page': 'Guide',
    'In-Depth Guide/White Paper': 'Guide',
    'FAQ & Glossary Pages': 'FAQ',
    'Public Forum & UGC Pages': 'Forum',
    'Corporate & Contact Pages': 'Corporate',
    'Private User Account Pages': 'Account',
    'Search Results & Error Pages': 'Search/Error',
    'Legal Pages': 'Legal',
    
    'unknown': 'Unknown',
    'Unknown': 'Unknown'
  };
  
  return shortNames[category] || shortNames[category.toLowerCase()] || category;
};

// Get color for a category with explicit mapping for common categories
const getCategoryColor = (category: string): { bg: string; text: string; border: string } => {
  // Explicit mapping for better color distribution - avoiding colors used elsewhere in UI
  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    // Sky blue - Home/Main pages
    'Home': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    
    // Violet/Purple - Blog content (avoiding green which is used for "Clean")
    'Blog/Article': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    'Blog Cat': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    
    // Pink/Rose - Product pages
    'Product': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    'Category': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    'Review': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
    
    // Orange - How-to/Tutorial
    'How-to': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    'Guide': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    
    // Indigo - Business pages
    'Services': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    'Pricing': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'Case Study': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    
    // Teal - Info pages
    'FAQ': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    'Pillar': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    
    // Slate - Corporate
    'Corporate': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
    'Compare': { bg: 'bg-zinc-50', text: 'text-zinc-700', border: 'border-zinc-200' },
    
    // Gray/Stone - Other/System pages
    'Forum': { bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200' },
    'Account': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    'Legal': { bg: 'bg-neutral-50', text: 'text-neutral-700', border: 'border-neutral-200' },
    'Search/Error': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    'Unknown': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  };
  
  // Return specific color if mapped, otherwise use a default
  return categoryColors[category] || { 
    bg: 'bg-gray-50', 
    text: 'text-gray-700', 
    border: 'border-gray-200' 
  };
};

export function PageAnalysisTable({ pages, projectId, isDomainAnalysis = false, onIssueClick }: PageAnalysisTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDimension, setFilterDimension] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterScore, setFilterScore] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (pageUrl: string) => {
    if (isDomainAnalysis) return; // No accordion for domain analysis
    
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(pageUrl)) {
      newExpanded.delete(pageUrl);
    } else {
      newExpanded.add(pageUrl);
    }
    setExpandedRows(newExpanded);
  };

  // Filter pages based on search and filters
  const filteredPages = pages.filter(page => {
    // Search filter
    if (searchTerm && !page.url.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !page.title?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Score filter
    if (filterScore !== 'all') {
      if (filterScore === 'high' && page.globalScore < 80) return false;
      if (filterScore === 'medium' && (page.globalScore < 60 || page.globalScore >= 80)) return false;
      if (filterScore === 'low' && page.globalScore >= 60) return false;
    }

    // Dimension filter
    if (filterDimension !== 'all') {
      const hasIssueInDimension = page.issues.some(issue => 
        issue.dimension.toLowerCase() === filterDimension
      );
      if (!hasIssueInDimension) return false;
    }

    // Severity filter
    if (filterSeverity !== 'all') {
      const hasIssueWithSeverity = page.issues.some(issue => 
        issue.severity === filterSeverity
      );
      if (!hasIssueWithSeverity) return false;
    }

    // Category filter
    if (filterCategory !== 'all') {
      if (!page.pageCategory || page.pageCategory !== filterCategory) {
        return false;
      }
    }

    return true;
  });

  return (
    <Card>
      {!isDomainAnalysis && (
        <CardHeader>
          <FilterBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterScore={filterScore}
            setFilterScore={setFilterScore}
            filterDimension={filterDimension}
            setFilterDimension={setFilterDimension}
            filterSeverity={filterSeverity}
            setFilterSeverity={setFilterSeverity}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
          />
        </CardHeader>
      )}

      <CardContent className={isDomainAnalysis ? "pt-6" : ""}>
        {!isDomainAnalysis && (
          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredPages.length} of {pages.length} pages
          </div>
        )}

        <div className="overflow-x-auto">
          <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px] sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></TableHead>
              <TableHead className="min-w-[200px] max-w-[400px] sticky left-[30px] bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{isDomainAnalysis ? 'Domain' : 'Page URL'}</TableHead>
              {!isDomainAnalysis && <TableHead className="text-center w-[100px]">Category</TableHead>}
              <TableHead className="text-center w-[60px]">Score</TableHead>
              <TableHead className="text-center w-[80px]">Issues</TableHead>
              <TableHead className="text-center w-[60px] text-xs">Tech</TableHead>
              <TableHead className="text-center w-[60px] text-xs">Structure</TableHead>
              <TableHead className="text-center w-[60px] text-xs">Auth</TableHead>
              <TableHead className="text-center w-[60px] text-xs">Quality</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPages.map((page) => {
              const isExpanded = isDomainAnalysis || expandedRows.has(page.url);
              
              return (
                <React.Fragment key={page.url}>
                  <TableRow 
                    className={!isDomainAnalysis ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => !isDomainAnalysis && toggleRowExpansion(page.url)}
                  >
                    <TableCell className="sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      {!isDomainAnalysis && (
                        <button
                          className="p-1 hover:bg-muted rounded-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpansion(page.url);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[200px] max-w-[400px] sticky left-[30px] bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="space-y-0.5 min-w-0 max-w-full">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium hover:underline flex items-center gap-1 min-w-0 group"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="truncate block">
                                  {isDomainAnalysis ? page.url : (() => {
                                    try {
                                      const urlObj = new URL(page.url);
                                      return urlObj.pathname + urlObj.search + urlObj.hash;
                                    } catch {
                                      return page.url;
                                    }
                                  })()}
                                </span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs break-all">{page.url}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {!isDomainAnalysis && page.title && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-xs text-muted-foreground truncate cursor-default">
                                  {page.title}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{page.title}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {!isDomainAnalysis && !page.title && (
                          <div className="text-xs text-muted-foreground truncate">
                            Untitled Page
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {!isDomainAnalysis && (
                      <TableCell className="text-center">
                        {(() => {
                          const categoryName = formatPageCategory(page.pageCategory);
                          const colorScheme = getCategoryColor(categoryName);
                          return (
                            <Badge 
                              title={`Analysis: ${page.analysisLevel || 'full'} (${Math.round((page.categoryConfidence || 0) * 100)}% confidence)`}
                              className={`text-xs px-2 py-0 border ${colorScheme.bg} ${colorScheme.text} ${colorScheme.border}`}
                            >
                              {categoryName}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      {page.skipped ? (
                        <Badge 
                          className="text-xs px-2 py-0 border bg-gray-50 text-gray-700 border-gray-200"
                          title={page.skipReason}
                        >
                          Skipped
                        </Badge>
                      ) : (
                        <Badge 
                          variant={page.globalScore >= 80 ? "success" : page.globalScore >= 60 ? "warning" : "destructive"}
                          className="text-xs px-2 py-0"
                        >
                          {page.globalScore}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {page.skipped ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : page.issues.length > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          {Object.entries(
                            page.issues.reduce((acc, issue) => {
                              acc[issue.severity] = (acc[issue.severity] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([severity, count]) => (
                            <Badge
                              key={severity}
                              className={`text-xs px-1.5 py-0 h-5 border ${SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS].bg} ${SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS].text} ${SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS].border}`}
                            >
                              {count}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="success" className="text-xs px-2 py-0">Clean</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center px-2">
                      {page.skipped || !page.scores ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (() => {
                        // Check if any technical rules were applied
                        const hasAppliedRules = page.ruleResults?.some(result => 
                          result.category === 'technical'
                        );
                        
                        if (!hasAppliedRules) {
                          return <span className="text-xs text-muted-foreground">N/A</span>;
                        }
                        
                        return (
                          <div 
                            className="text-xs font-bold"
                            style={{ color: DIMENSION_COLORS.technical }}
                          >
                            {page.scores.technical}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center px-2">
                      {page.skipped || !page.scores ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (() => {
                        // Check if any structure rules were applied
                        const hasAppliedRules = page.ruleResults?.some(result => 
                          result.category === 'structure'
                        );
                        
                        if (!hasAppliedRules) {
                          return <span className="text-xs text-muted-foreground">N/A</span>;
                        }
                        
                        return (
                          <div 
                            className="text-xs font-bold"
                            style={{ color: DIMENSION_COLORS.structure }}
                          >
                            {page.scores.structure}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center px-2">
                      {page.skipped || !page.scores ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (() => {
                        // Check if any authority rules were applied
                        const hasAppliedRules = page.ruleResults?.some(result => 
                          result.category === 'authority'
                        );
                        
                        if (!hasAppliedRules) {
                          return <span className="text-xs text-muted-foreground">N/A</span>;
                        }
                        
                        return (
                          <div 
                            className="text-xs font-bold"
                            style={{ color: DIMENSION_COLORS.authority }}
                          >
                            {page.scores.authority}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center px-2">
                      {page.skipped || !page.scores ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (() => {
                        // Check if any quality rules were applied
                        const hasAppliedRules = page.ruleResults?.some(result => 
                          result.category === 'quality'
                        );
                        
                        if (!hasAppliedRules) {
                          return <span className="text-xs text-muted-foreground">N/A</span>;
                        }
                        
                        return (
                          <div 
                            className="text-xs font-bold"
                            style={{ color: DIMENSION_COLORS.quality }}
                          >
                            {page.scores.quality}
                          </div>
                        );
                      })()}
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={isDomainAnalysis ? 9 : 10} className="bg-gray-50">
                        <PageDetailsSection 
                          page={page} 
                          projectId={projectId} 
                          onIssueClick={onIssueClick} 
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
        </div>

        {filteredPages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No pages match your filter criteria
          </div>
        )}
      </CardContent>
    </Card>
  );
}