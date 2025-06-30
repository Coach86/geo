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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react';
import { LLMAnalysisModal } from './LLMAnalysisModal';

interface PageIssue {
  dimension: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation?: string;
}

interface PageAnalysis {
  url: string;
  title?: string;
  globalScore: number;
  scores: {
    authority: number;
    freshness: number;
    structure: number;
    snippetExtractability: number;
    brandAlignment: number;
  };
  details?: {
    authority: {
      hasAuthor: boolean;
      authorName: string | null;
      citationCount: number;
      domainAuthority: string;
      authorCredentials: string[]; // Array of credential strings
    };
    freshness: {
      daysSinceUpdate: number | null;
      hasDateSignals: boolean;
      publishDate: string | null;
      modifiedDate: string | null;
    };
    structure: {
      h1Count: number;
      avgSentenceWords: number;
      hasSchema: boolean;
      headingHierarchyScore: number;
    };
    snippet: {
      extractableBlocks: number;
      listCount: number;
      qaBlockCount: number;
      avgSentenceLength: number;
    };
    brand: {
      brandMentions: number;
      alignmentIssues: string[];
      consistencyScore: number;
      missingKeywords: string[];
    };
  };
  issues: PageIssue[];
  strengths: string[];
  crawledAt: Date;
}

interface PageAnalysisTableProps {
  pages: PageAnalysis[];
  projectId: string;
}

const DIMENSION_COLORS = {
  authority: '#8b5cf6',
  freshness: '#3b82f6',
  structure: '#10b981',
  snippet: '#f59e0b',
  brand: '#ef4444',
};

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const SEVERITY_ICONS = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Info,
  low: CheckCircle,
};

export function PageAnalysisTable({ pages, projectId }: PageAnalysisTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDimension, setFilterDimension] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterScore, setFilterScore] = useState<string>('all');

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

    return true;
  });

  // Group issues by dimension for a page
  const groupIssuesByDimension = (issues: PageIssue[]) => {
    return issues.reduce((acc, issue) => {
      if (!acc[issue.dimension]) {
        acc[issue.dimension] = [];
      }
      acc[issue.dimension].push(issue);
      return acc;
    }, {} as Record<string, PageIssue[]>);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page-by-Page Analysis</CardTitle>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by URL or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <Select value={filterScore} onValueChange={setFilterScore}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Score Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="high">High (80+)</SelectItem>
              <SelectItem value="medium">Medium (60-79)</SelectItem>
              <SelectItem value="low">Low (&lt;60)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDimension} onValueChange={setFilterDimension}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Dimension" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dimensions</SelectItem>
              <SelectItem value="authority">Authority</SelectItem>
              <SelectItem value="freshness">Freshness</SelectItem>
              <SelectItem value="structure">Structure</SelectItem>
              <SelectItem value="snippet">Snippet</SelectItem>
              <SelectItem value="brand">Brand</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">
          Showing {filteredPages.length} of {pages.length} pages
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]"></TableHead>
              <TableHead>Page URL</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-center">Issues</TableHead>
              <TableHead className="text-center">Authority</TableHead>
              <TableHead className="text-center">Freshness</TableHead>
              <TableHead className="text-center">Structure</TableHead>
              <TableHead className="text-center">Snippet</TableHead>
              <TableHead className="text-center">Brand</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPages.map((page) => {
              const isExpanded = expandedRows.has(page.url);
              const issuesByDimension = groupIssuesByDimension(page.issues);
              
              return (
                <React.Fragment key={page.url}>
                  <TableRow className="cursor-pointer" onClick={() => toggleRow(page.url)}>
                    <TableCell>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {page.title || page.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <div className="text-xs text-muted-foreground">
                          {page.url}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={page.globalScore >= 80 ? "success" : page.globalScore >= 60 ? "warning" : "destructive"}
                      >
                        {page.globalScore}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {page.issues.length > 0 ? (
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
                        <Badge variant="success">Clean</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`text-sm ${page.scores.authority >= 80 ? 'text-green-600' : page.scores.authority >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {page.scores.authority}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`text-sm ${page.scores.freshness >= 80 ? 'text-green-600' : page.scores.freshness >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {page.scores.freshness}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`text-sm ${page.scores.structure >= 80 ? 'text-green-600' : page.scores.structure >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {page.scores.structure}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`text-sm ${page.scores.snippetExtractability >= 80 ? 'text-green-600' : page.scores.snippetExtractability >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {page.scores.snippetExtractability}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`text-sm ${page.scores.brandAlignment >= 80 ? 'text-green-600' : page.scores.brandAlignment >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {page.scores.brandAlignment}
                      </div>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/50">
                        <div className="p-4 space-y-4">
                          {/* AI Analysis Button */}
                          <div className="flex justify-end">
                            <LLMAnalysisModal 
                              projectId={projectId} 
                              pageUrl={page.url}
                              trigger={
                                <Button variant="outline" size="sm">
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  View AI Analysis Details
                                </Button>
                              }
                            />
                          </div>

                          {/* LLM Analysis Details */}
                          {page.details && (
                            <div>
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-600" />
                                Breakdown
                              </h4>
                              <div className="space-y-3 text-sm">
                                {/* Authority */}
                                <div>
                                  <h5 className="font-medium mb-1" style={{ color: DIMENSION_COLORS.authority }}>
                                    Authority
                                  </h5>
                                  <div className="space-y-1 ml-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Author:</span>
                                      {page.details.authority.hasAuthor ? (
                                        <span className="font-medium text-green-600">
                                          {page.details.authority.authorName || "Yes"}
                                        </span>
                                      ) : (
                                        <span className="text-red-600">No</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Citations:</span>
                                      <span>{page.details.authority.citationCount ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Domain Authority:</span>
                                      <Badge variant={
                                        page.details.authority.domainAuthority === 'high' ? 'success' :
                                        page.details.authority.domainAuthority === 'medium' ? 'warning' : 'destructive'
                                      } className="text-xs">
                                        {page.details.authority.domainAuthority ?? 'unknown'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Author Credentials:</span>
                                      <Badge variant={(page.details.authority.authorCredentials?.length ?? 0) > 0 ? "success" : "destructive"} className="text-xs">
                                        {(page.details.authority.authorCredentials?.length ?? 0) > 0 ? "Yes" : "No"}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {/* Freshness */}
                                <div>
                                  <h5 className="font-medium mb-1" style={{ color: DIMENSION_COLORS.freshness }}>
                                    Freshness
                                  </h5>
                                  <div className="space-y-1 ml-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Date Signals:</span>
                                      <Badge variant={page.details.freshness.hasDateSignals ? "success" : "destructive"} className="text-xs">
                                        {page.details.freshness.hasDateSignals ? "Yes" : "No"}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Days Since Update:</span>
                                      <span>{page.details.freshness.daysSinceUpdate ?? "Unknown"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Publish Date:</span>
                                      <span className="text-xs">{page.details.freshness.publishDate ?? "Not found"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Modified Date:</span>
                                      <span className="text-xs">{page.details.freshness.modifiedDate ?? "Not found"}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Structure */}
                                <div>
                                  <h5 className="font-medium mb-1" style={{ color: DIMENSION_COLORS.structure }}>
                                    Structure
                                  </h5>
                                  <div className="space-y-1 ml-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">H1 Count:</span>
                                      <Badge variant={page.details.structure.h1Count === 1 ? "success" : "warning"} className="text-xs">
                                        {page.details.structure.h1Count ?? 0}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Avg Sentence Words:</span>
                                      <span>{page.details.structure.avgSentenceWords?.toFixed(1) ?? "Unknown"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Schema Markup:</span>
                                      <Badge variant={page.details.structure.hasSchema ? "success" : "destructive"} className="text-xs">
                                        {page.details.structure.hasSchema ? "Yes" : "No"}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Hierarchy Score:</span>
                                      <Badge variant={
                                        (page.details.structure.headingHierarchyScore ?? 0) >= 80 ? 'success' :
                                        (page.details.structure.headingHierarchyScore ?? 0) >= 60 ? 'warning' : 'destructive'
                                      } className="text-xs">
                                        {page.details.structure.headingHierarchyScore ?? 0}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {/* Snippet */}
                                <div>
                                  <h5 className="font-medium mb-1" style={{ color: DIMENSION_COLORS.snippet }}>
                                    Snippet Extractability
                                  </h5>
                                  <div className="space-y-1 ml-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Extractable Blocks:</span>
                                      <span>{page.details.snippet.extractableBlocks ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Lists:</span>
                                      <span>{page.details.snippet.listCount ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Q&A Blocks:</span>
                                      <span>{page.details.snippet.qaBlockCount ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Avg Sentence Length:</span>
                                      <span>{page.details.snippet.avgSentenceLength?.toFixed(1) ?? "Unknown"}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Brand */}
                                <div>
                                  <h5 className="font-medium mb-1" style={{ color: DIMENSION_COLORS.brand }}>
                                    Brand Alignment
                                  </h5>
                                  <div className="space-y-1 ml-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Brand Mentions:</span>
                                      <span>{page.details.brand.brandMentions ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Consistency Score:</span>
                                      <Badge variant={
                                        (page.details.brand.consistencyScore ?? 0) >= 80 ? 'success' :
                                        (page.details.brand.consistencyScore ?? 0) >= 60 ? 'warning' : 'destructive'
                                      } className="text-xs">
                                        {page.details.brand.consistencyScore ?? 0}
                                      </Badge>
                                    </div>
                                    {(page.details.brand.alignmentIssues?.length ?? 0) > 0 && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-muted-foreground">Alignment Issues:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {page.details.brand.alignmentIssues?.map((issue, i) => (
                                            <Badge key={i} variant="destructive" className="text-xs">
                                              {issue}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {(page.details.brand.missingKeywords?.length ?? 0) > 0 && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-muted-foreground">Missing Keywords:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {page.details.brand.missingKeywords?.map((keyword, i) => (
                                            <Badge key={i} variant="warning" className="text-xs">
                                              {keyword}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Strengths */}
                          {page.strengths.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                Strengths
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {page.strengths.map((strength, i) => (
                                  <Badge key={i} variant="success">
                                    {strength}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Issues by Dimension */}
                          {Object.keys(issuesByDimension).length > 0 ? (
                            <div>
                              <h4 className="font-medium mb-3">Issues by Category</h4>
                              <div className="space-y-3">
                                {Object.entries(issuesByDimension).map(([dimension, issues]) => (
                                  <div key={dimension} className="border rounded-lg p-3">
                                    <h5 className="font-medium capitalize mb-2" style={{ color: DIMENSION_COLORS[dimension.toLowerCase() as keyof typeof DIMENSION_COLORS] }}>
                                      {dimension}
                                    </h5>
                                    <div className="space-y-2">
                                      {issues.map((issue, i) => {
                                        const Icon = SEVERITY_ICONS[issue.severity];
                                        return (
                                          <div key={i} className="flex items-start gap-2">
                                            <Icon 
                                              className="h-4 w-4 mt-0.5" 
                                              style={{ color: SEVERITY_COLORS[issue.severity] }}
                                            />
                                            <div className="flex-1">
                                              <p className="text-sm">{issue.description}</p>
                                              {issue.recommendation && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                  → {issue.recommendation}
                                                </p>
                                              )}
                                            </div>
                                            <Badge
                                              variant="outline"
                                              style={{
                                                borderColor: SEVERITY_COLORS[issue.severity],
                                                color: SEVERITY_COLORS[issue.severity],
                                              }}
                                            >
                                              {issue.severity}
                                            </Badge>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                              <p>No issues found - this page is well optimized!</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>

        {filteredPages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No pages match your filter criteria
          </div>
        )}
      </CardContent>
    </Card>
  );
}