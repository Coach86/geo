'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { SvgLoader } from '@/components/ui/svg-loader';
import { BrowserFrame } from './BrowserFrame';
import { ContentViewer } from './ContentViewer';
import { DiffContentViewer } from './DiffContentViewer';
import { ImprovementHeader } from './ImprovementHeader';
import { ImprovementProgress } from './ImprovementProgress';
import { RulesList, Rule } from './RulesList';
import { RulesProcessingSignet } from './RulesProcessingSignet';
import { AnimatedDiffViewer, ContentVersion } from './AnimatedDiffViewer';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useRuleBasedImprovement } from '@/hooks/useRuleBasedImprovement';
import { useAuth } from '@/providers/auth-provider';
import { useNavigation } from '@/providers/navigation-provider';
import { apiFetch } from '@/lib/api/utils';

interface PageImprovementViewProps {
  jobId: string;
}


export function PageImprovementView({ jobId }: PageImprovementViewProps) {
  const router = useRouter();
  const { token } = useAuth();
  const { selectedProject } = useNavigation();
  const [selectedIteration, setSelectedIteration] = useState<number>(0);
  const [originalHtml, setOriginalHtml] = useState<string>('');
  const [htmlLoading, setHtmlLoading] = useState(false);

  // Handle rule-based improvement with real-time updates
  const { 
    job, 
    loading, 
    error, 
    rules, 
    currentProcessingIndex, 
    totalRules, 
    overallProgress, 
    contentVersions, 
    currentVersionIndex 
  } = useRuleBasedImprovement(jobId);


  // Fetch the original HTML content
  useEffect(() => {
    if (job && selectedProject && !originalHtml) {
      setHtmlLoading(true);
      apiFetch('/page-magic/extract-content', {
        method: 'POST',
        body: JSON.stringify({ 
          url: job.pageUrl,
          projectId: selectedProject.id 
        }),
        token: token || undefined,
      })
      .then(result => {
        if (result.data?.html) {
          setOriginalHtml(result.data.html);
        }
      })
      .catch(err => {
        console.error('Error fetching HTML:', err);
      })
      .finally(() => {
        setHtmlLoading(false);
      });
    }
  }, [job, selectedProject, token, originalHtml]);

  // Calculate selected iteration based on improvements length
  const actualSelectedIteration = useMemo(() => {
    if (!job || job.improvements.length === 0) return 0;
    // If selected iteration is out of bounds, use the last one
    if (selectedIteration >= job.improvements.length) {
      return job.improvements.length - 1;
    }
    return selectedIteration;
  }, [job, selectedIteration]);

  if (loading && !job) {
    return (
      <div className="p-6">
        <Card className="p-12">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading improvement details...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/page-magic')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Page Magic
        </Button>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6 space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/page-magic')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Page Magic
        </Button>
        
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            Improvement job not found
          </div>
        </Card>
      </div>
    );
  }

  const currentImprovement = job.improvements[actualSelectedIteration];
  

  return (
    <>
      {/* Rules Processing Signet - positioned at top right of window */}
      <RulesProcessingSignet
        rules={rules}
        currentProcessingIndex={currentProcessingIndex}
        totalRules={totalRules}
        overallProgress={overallProgress}
      />
      
      <div className="p-6 space-y-6 relative">
        {/* Header */}
        <ImprovementHeader pageUrl={job.pageUrl} status={job.status} />

      {/* Status and Error Display */}
      {job.status === 'failed' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">Improvement failed</div>
            {job.errors.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {job.errors.map((err, idx) => (
                  <li key={idx} className="text-sm">{err}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm">An unknown error occurred during processing.</p>
            )}
          </AlertDescription>
        </Alert>
      )}
      

      {/* Content Evolution Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* Original Content */}
        <div className="h-full">
          <BrowserFrame
            url={job.pageUrl}
            title="Original Content"
            className="h-full"
          >
            <ContentViewer
              html={originalHtml}
              loading={htmlLoading}
              title={contentVersions[0]?.title || job.originalTitle}
              metaDescription={contentVersions[0]?.metaDescription}
              metas={contentVersions[0]?.metas}
            />
          </BrowserFrame>
        </div>

        {/* Animated Content Evolution */}
        <div className="h-full">
          <AnimatedDiffViewer
            url={job.pageUrl}
            versions={contentVersions}
            currentVersionIndex={currentVersionIndex}
            isProcessing={currentProcessingIndex >= 0}
            onVersionChange={(index) => {
              // Allow manual version navigation when not processing
              if (currentProcessingIndex < 0) {
                // setCurrentVersionIndex(index);
              }
            }}
          />
        </div>
      </div>

        {/* Improvement Details - Removed as requested */}
      </div>
    </>
  );
}