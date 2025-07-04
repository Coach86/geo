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
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { FilterBar } from './FilterBar';
import { PageDetailsSection } from './PageDetailsSection';

interface PageIssue {
  dimension: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation?: string;
}

interface EvidenceItem {
  type: 'info' | 'success' | 'warning' | 'error' | 'score' | 'heading';
  content: string;
  target?: string;
  code?: string;
  metadata?: Record<string, any>;
}

interface PageAnalysis {
  url: string;
  title?: string;
  globalScore: number;
  scores?: {
    technical: number;
    content: number;
    authority: number;
    monitoringKpi: number;
  };
  ruleResults?: Array<{
    ruleId: string;
    ruleName: string;
    category: 'technical' | 'content' | 'authority' | 'monitoringKpi';
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
  strengths: string[];
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
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const formatPageCategory = (category?: string): string => {
  if (!category) return 'Unknown';
  
  // Map to shorter names
  const shortNames: Record<string, string> = {
    // Tier 1: Core Business & High-Impact Pages
    'homepage': 'Home',
    'product_category_page': 'Category',
    'product_detail_page': 'Product',
    'services_features_page': 'Services',
    'pricing': 'Pricing',
    'comparison_page': 'Compare',
    'blog_article': 'Blog',
    'blog_category_tag_page': 'Blog Cat',
    
    // Tier 2: Strategic Content & Resources
    'pillar_page_topic_hub': 'Pillar',
    'product_roundup_review': 'Product',
    'how_to_guide_tutorial': 'How-to',
    'case_study': 'Case Study',
    'what_is_x_definitional': 'Guide',
    'in_depth_guide_white_paper': 'Guide',
    'faq': 'FAQ',
    'glossary_page': 'Glossary',
    'public_forum_ugc': 'Forum',
    
    // Tier 3: Supporting Page Groups
    'about_company': 'About',
    'team_page': 'Team',
    'contact': 'Contact',
    'careers_page': 'Careers',
    'press_media_room': 'Press',
    'store_locator': 'Store',
    'login_account': 'Login',
    'user_profile_dashboard': 'Profile',
    'order_history': 'Orders',
    'wishlist': 'Wishlist',
    'search_results': 'Search',
    'error_404': '404',
    'privacy_policy': 'Privacy',
    'terms_of_service': 'Terms',
    'cookie_policy': 'Cookies',
    'accessibility_statement': 'Access',
    
    'unknown': 'Unknown'
  };
  
  return shortNames[category] || category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getCategoryBadgeVariant = (analysisLevel?: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (analysisLevel) {
    case 'full':
      return 'default';
    case 'partial':
      return 'secondary';
    case 'limited':
      return 'outline';
    case 'excluded':
      return 'destructive';
    default:
      return 'default';
  }
};

export function PageAnalysisTable({ pages, projectId, isDomainAnalysis = false, onIssueClick }: PageAnalysisTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDimension, setFilterDimension] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterScore, setFilterScore] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Toggle row expansion
  const toggleRow = (url: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(url)) {
      newExpanded.delete(url);
    } else {
      newExpanded.add(url);
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
      <CardHeader>
        <CardTitle>{isDomainAnalysis ? 'Domain Analysis' : 'Page-by-Page Analysis'}</CardTitle>
        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterScore={filterScore}
          setFilterScore={setFilterScore}
          filterDimension={filterDimension}
          setFilterDimension={setFilterDimension}
          filterSeverity={filterSeverity}
          setFilterSeverity={setFilterSeverity}
          filterCategory={isDomainAnalysis ? undefined : filterCategory}
          setFilterCategory={isDomainAnalysis ? undefined : setFilterCategory}
        />
      </CardHeader>

      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">
          Showing {filteredPages.length} of {pages.length} {isDomainAnalysis ? 'domains' : 'pages'}
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px] sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></TableHead>
              <TableHead className="min-w-[200px] sticky left-[30px] bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{isDomainAnalysis ? 'Domain' : 'Page URL'}</TableHead>
              {!isDomainAnalysis && <TableHead className="text-center w-[80px]">Category</TableHead>}
              <TableHead className="text-center w-[60px]">Score</TableHead>
              <TableHead className="text-center w-[80px]">Issues</TableHead>
              <TableHead className="text-center w-[60px] text-xs">Tech</TableHead>
              <TableHead className="text-center w-[60px] text-xs">Content</TableHead>
              <TableHead className="text-center w-[60px] text-xs">Auth</TableHead>
              <TableHead className="text-center w-[60px] text-xs">KPIs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPages.map((page) => {
              const isExpanded = expandedRows.has(page.url);
              
              return (
                <React.Fragment key={page.url}>
                  <TableRow className="cursor-pointer" onClick={() => toggleRow(page.url)}>
                    <TableCell className="sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="sticky left-[30px] bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="space-y-0.5">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline flex items-center gap-1 line-clamp-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isDomainAnalysis ? page.url : (page.title || page.url)}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                        {!isDomainAnalysis && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {page.url}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {!isDomainAnalysis && (
                      <TableCell className="text-center">
                        <Badge 
                          variant={getCategoryBadgeVariant(page.analysisLevel)}
                          title={`Analysis: ${page.analysisLevel || 'full'} (${Math.round((page.categoryConfidence || 0) * 100)}% confidence)`}
                          className="text-xs px-2 py-0"
                        >
                          {formatPageCategory(page.pageCategory)}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      {page.skipped ? (
                        <Badge 
                          variant="outline"
                          className="text-xs px-2 py-0"
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
                              variant="outline"
                              className="text-xs px-1.5 py-0 h-5"
                              style={{
                                borderColor: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS],
                                color: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS],
                              }}
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
                      ) : (
                        <div className={`text-xs font-medium ${page.scores.technical >= 80 ? 'text-green-600' : page.scores.technical >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {page.scores.technical}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center px-2">
                      {page.skipped || !page.scores ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <div className={`text-xs font-medium ${page.scores.content >= 80 ? 'text-green-600' : page.scores.content >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {page.scores.content}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center px-2">
                      {page.skipped || !page.scores ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <div className={`text-xs font-medium ${page.scores.authority >= 80 ? 'text-green-600' : page.scores.authority >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {page.scores.authority}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center px-2">
                      {page.skipped || !page.scores ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <div className={`text-xs font-medium ${page.scores.monitoringKpi >= 80 ? 'text-green-600' : page.scores.monitoringKpi >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {page.scores.monitoringKpi}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={isDomainAnalysis ? 9 : 10} className="bg-muted/50">
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