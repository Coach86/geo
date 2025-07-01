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
  details?: any;
  calculationDetails?: any;
  issues: PageIssue[];
  strengths: string[];
  crawledAt: Date;
  pageCategory?: string;
  analysisLevel?: string;
  categoryConfidence?: number;
}

interface PageAnalysisTableProps {
  pages: PageAnalysis[];
  projectId: string;
}

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const formatPageCategory = (category?: string): string => {
  if (!category) return 'Unknown';
  
  // Convert snake_case to Title Case
  return category
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

export function PageAnalysisTable({ pages, projectId }: PageAnalysisTableProps) {
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
        <CardTitle>Page-by-Page Analysis</CardTitle>
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

      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">
          Showing {filteredPages.length} of {pages.length} pages
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]"></TableHead>
              <TableHead>Page URL</TableHead>
              <TableHead className="text-center">Category</TableHead>
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
                        variant={getCategoryBadgeVariant(page.analysisLevel)}
                        title={`Analysis: ${page.analysisLevel || 'full'} (${Math.round((page.categoryConfidence || 0) * 100)}% confidence)`}
                      >
                        {formatPageCategory(page.pageCategory)}
                      </Badge>
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
                      <TableCell colSpan={10} className="bg-muted/50">
                        <PageDetailsSection page={page} projectId={projectId} />
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