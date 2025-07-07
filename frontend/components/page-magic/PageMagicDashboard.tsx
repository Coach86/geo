'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Sparkles, ExternalLink, Search, SortAsc, SortDesc } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigation } from '@/providers/navigation-provider';
import { useAuth } from '@/providers/auth-provider';
import { apiFetch } from '@/lib/api/utils';

interface PageWithScore {
  _id: string;
  url: string;
  title?: string;
  globalScore: number;
  scores: {
    technical: number;
    structure: number;
    authority: number;
    quality: number;
  };
  issues: Array<{
    dimension: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }>;
  crawledAt: Date;
  pageCategory?: string;
  skipped?: boolean;
  skipReason?: string;
}

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
};

const SCORE_COLORS = {
  excellent: 'bg-green-100 text-green-800 border-green-200',
  good: 'bg-blue-100 text-blue-800 border-blue-200',
  average: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  poor: 'bg-red-100 text-red-800 border-red-200',
};

function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLORS.excellent;
  if (score >= 60) return SCORE_COLORS.good;
  if (score >= 40) return SCORE_COLORS.average;
  return SCORE_COLORS.poor;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Average';
  return 'Poor';
}

export function PageMagicDashboard() {
  const router = useRouter();
  const { selectedProject } = useNavigation();
  const { token } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'url' | 'date'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // asc = worst first for Page Magic

  useEffect(() => {
    if (selectedProject?.id) {
      fetchPages();
    }
  }, [selectedProject?.id, sortBy, sortOrder]);

  const fetchPages = async () => {
    if (!selectedProject?.id) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        projectId: selectedProject.id,
        sortBy,
        order: sortOrder,
        limit: '50',
      });

      const result = await apiFetch(`/page-magic/pages?${params}`, {
        token: token || undefined,
      });

      console.log('Pages data:', result.data);
      setPages(result.data || []);
    } catch (err) {
      console.error('Error fetching pages:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePageClick = (page: PageWithScore) => {
    // Navigate to the page detail view with the content score ID
    router.push(`/page-magic/page/${page._id}`);
  };

  const filteredPages = pages.filter(page => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      page.url.toLowerCase().includes(searchLower) ||
      page.title?.toLowerCase().includes(searchLower)
    );
  });

  if (!selectedProject) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Please select a project to view Page Magic
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            Page Magic
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered content improvement for your worst-performing pages
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2 items-center">
              <Select value={sortBy} onValueChange={(value: 'score' | 'url' | 'date') => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Score</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Pages List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pages ({filteredPages.length})</span>
            {sortBy === 'score' && sortOrder === 'asc' && (
              <Badge variant="outline" className="text-xs">
                Worst scores first
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? 'No pages match your search' : 'No pages found for this project'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPages.map((page) => (
                <div
                  key={page.url}
                  className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handlePageClick(page)}
                >
                  {/* Score */}
                  <div className="flex flex-col items-center space-y-1">
                    <Badge className={getScoreColor(page.globalScore)}>
                      {page.globalScore}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getScoreLabel(page.globalScore)}
                    </span>
                  </div>

                  {/* Page Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm hover:underline flex items-center gap-1 truncate"
                      >
                        {page.title || new URL(page.url).pathname}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>
                    
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {page.url}
                    </div>

                    {/* Issues */}
                    {page.issues.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {Object.entries(
                          page.issues.reduce((acc, issue) => {
                            acc[issue.severity] = (acc[issue.severity] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([severity, count]) => (
                          <Badge
                            key={severity}
                            variant="outline"
                            className={`text-xs h-5 ${SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS]}`}
                          >
                            {count} {severity}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dimension Scores */}
                  <div className="hidden sm:flex flex-col space-y-1 text-xs">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="font-medium">Tech</div>
                        <div>{page.scores.technical}</div>
                      </div>
                      <div>
                        <div className="font-medium">Struct</div>
                        <div>{page.scores.structure}</div>
                      </div>
                      <div>
                        <div className="font-medium">Auth</div>
                        <div>{page.scores.authority}</div>
                      </div>
                      <div>
                        <div className="font-medium">Qual</div>
                        <div>{page.scores.quality}</div>
                      </div>
                    </div>
                  </div>

                  {/* View Icon */}
                  <div className="text-muted-foreground">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}