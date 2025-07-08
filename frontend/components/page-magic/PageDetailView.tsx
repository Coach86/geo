'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Sparkles, 
  ExternalLink, 
  AlertCircle,
  FileText,
  Loader2
} from 'lucide-react';
import { BrowserFrame } from './BrowserFrame';
import { ContentViewer } from './ContentViewer';
import { ContentScoreAnalysis } from './ContentScoreAnalysis';
import { useAuth } from '@/providers/auth-provider';
import { useNavigation } from '@/providers/navigation-provider';
import { apiFetch } from '@/lib/api/utils';

interface PageDetailViewProps {
  pageId: string;
}

interface PageDetails {
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
  recommendations: Array<string | { content: string; ruleId: string; ruleCategory: string }>;
  analyzedAt: Date;
  iterations?: Array<{
    iteration: number;
    globalScore: number;
    scores: {
      technical: number;
      structure: number;
      authority: number;
      quality: number;
    };
  }>;
}


export function PageDetailView({ pageId }: PageDetailViewProps) {
  const router = useRouter();
  const { token } = useAuth();
  const { selectedProject } = useNavigation();
  const [pageDetails, setPageDetails] = useState<PageDetails | null>(null);
  const [content, setContent] = useState<string>('');
  const [contentHtml, setContentHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPageDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch page details by ID
      const result = await apiFetch(`/page-magic/page/${pageId}`, {
        token: token || undefined,
      });

      interface PageDetailsResponse {
        data?: PageDetails;
      }
      const typedResult = result as PageDetailsResponse;
      if (typedResult.data) {
        setPageDetails(typedResult.data);
      } else {
        setError('Page not found');
      }
    } catch (err) {
      console.error('Error fetching page details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load page details');
    } finally {
      setLoading(false);
    }
  }, [pageId, token]);

  useEffect(() => {
    if (pageId) {
      fetchPageDetails();
    }
  }, [pageId, fetchPageDetails]);

  const fetchContent = async () => {
    if (!selectedProject?.id || !pageDetails) return;
    
    try {
      setContentLoading(true);
      setError(null);

      const result = await apiFetch('/page-magic/extract-content', {
        method: 'POST',
        body: JSON.stringify({ 
          url: pageDetails.url,
          projectId: selectedProject.id 
        }),
        token: token || undefined,
      });

      interface ExtractContentResponse {
        data?: {
          structured?: {
            content?: string;
          };
          html?: string;
        };
      }
      const extractResult = result as ExtractContentResponse;
      if (extractResult.data) {
        console.log('Extract content response:', extractResult.data);
        console.log('Structured content:', extractResult.data.structured);
        console.log('Type of structured.content:', typeof extractResult.data.structured?.content);
        
        // Use structured HTML content from Mozilla Readability
        if (extractResult.data.structured?.content) {
          // Check if content is JSON string and parse it
          let content = extractResult.data.structured.content;
          if (typeof content === 'string' && content.trim().startsWith('{')) {
            console.warn('Structured content appears to be JSON, using raw HTML instead');
            content = extractResult.data.html || '';
          }
          setContentHtml(content);
        } else {
          // Fallback to raw HTML if structured content not available
          setContentHtml(extractResult.data.html || '');
        }
      }
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load page content');
    } finally {
      setContentLoading(false);
    }
  };

  const handleImprove = async () => {
    if (!selectedProject?.id || improving || !pageDetails) return;

    try {
      setImproving(true);
      setError(null);

      const result = await apiFetch('/page-magic/improve', {
        method: 'POST',
        body: JSON.stringify({
          projectId: selectedProject.id,
          pageUrl: pageDetails.url,
          contentScoreId: pageId,
        }),
        token: token || undefined,
      });

      interface ImproveResponse {
        data?: {
          jobId: string;
        };
      }
      const improveResult = result as ImproveResponse;
      console.log('Improvement started:', improveResult);
      console.log('Job ID:', improveResult.data?.jobId);
      console.log('Navigating to:', `/page-magic/${improveResult.data?.jobId}`);

      // Navigate to the improvement view
      if (improveResult.data?.jobId) {
        await router.push(`/page-magic/${improveResult.data.jobId}`);
      }
    } catch (err) {
      console.error('Error starting improvement:', err);
      setError(err instanceof Error ? err.message : 'Failed to start improvement');
      setImproving(false);
    }
  };

  useEffect(() => {
    if (pageDetails && !contentHtml) {
      fetchContent();
    }
  }, [pageDetails, contentHtml]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pageDetails) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Page Not Found</h3>
              <p className="text-muted-foreground mb-4">{error || 'Unable to load page details'}</p>
              <Button onClick={() => router.push('/page-magic')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Pages
              </Button>
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
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('/page-magic')}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {pageDetails.title || 'Page Analysis'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <a
                href={pageDetails.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:underline flex items-center gap-1"
              >
                {pageDetails.url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
        
        <Button
          onClick={handleImprove}
          disabled={improving}
          size="lg"
          className="flex items-center gap-2"
        >
          {improving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Improve with AI!
            </>
          )}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Score Overview */}
      <ContentScoreAnalysis 
        globalScore={pageDetails.globalScore}
        scores={pageDetails.scores}
        iterations={pageDetails.iterations}
        issues={pageDetails.issues}
      />


      {/* Content Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Page Content Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BrowserFrame url={pageDetails.url} title="Current Content" className="h-[500px]">
            <ContentViewer
              html={contentHtml}
              loading={contentLoading}
              error={contentLoading ? undefined : (!contentHtml ? 'Click above to load content' : undefined)}
            />
          </BrowserFrame>
        </CardContent>
      </Card>
    </div>
  );
}