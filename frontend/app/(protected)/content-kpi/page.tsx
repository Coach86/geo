"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText, Lock, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { usePostHogFlags } from "@/hooks/use-posthog-flags";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/providers/navigation-provider";
import { ContentKPIDashboard } from "@/components/content-kpi/ContentKPIDashboard";
import BreadcrumbNav from "@/components/layout/breadcrumb-nav";
import { PageTransition } from "@/components/shared/PageTransition";
import { useContentKPI } from "@/hooks/useContentKPI";
import { useCrawlerEvents } from "@/hooks/use-crawler-events";
import { CrawlSettingsDialog } from "@/components/content-kpi/CrawlSettingsDialog";

export default function PageIntelligencePage() {
  const { token } = useAuth();
  const { allProjects, selectedProject, setSelectedProject } = useNavigation();
  const { isFeatureEnabled, isLoading } = usePostHogFlags();
  const router = useRouter();

  // Get selected project from localStorage
  const selectedProjectId = typeof window !== 'undefined'
    ? localStorage.getItem('selectedProjectId')
    : null;

  const brandName = selectedProject?.brandName || 'Brand';
  
  // Get content KPI data including crawler functions
  const { report, data, loading: contentLoading, triggerCrawl, getCrawlStatus, refetch } = useContentKPI(selectedProjectId || '');
  
  // Crawler state
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<{ crawledPages: number; totalPages: number } | null>(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [showCrawlDialog, setShowCrawlDialog] = useState(false);

  // Listen to crawler events
  const { crawlerStatus, isActive: isCrawlerActive } = useCrawlerEvents({
    projectId: selectedProjectId || '',
    token: token || undefined,
    onCrawlerEvent: (event) => {
      console.log('[PageIntelligencePage] Crawler event received:', event);
      
      // Update progress based on WebSocket events
      if (event.eventType === 'crawler.started' || event.eventType === 'crawler.progress' || event.eventType === 'crawler.page_crawled') {
        setIsCrawling(true);
        setCrawlProgress({
          crawledPages: event.crawledPages || 0,
          totalPages: event.totalPages || 100,
        });
      } else if (event.eventType === 'crawler.completed') {
        setIsCrawling(false);
        setCrawlProgress(null);
        refetch(); // Refresh the data
        toast({
          title: "Crawl completed",
          description: `Successfully analyzed ${event.crawledPages || 0} pages`,
        });
      } else if (event.eventType === 'crawler.failed') {
        setIsCrawling(false);
        setCrawlProgress(null);
        toast({
          title: "Crawl failed",
          description: event.error || "An error occurred during crawling",
          variant: "destructive",
        });
      }
    },
  });

  // Check initial crawl status on mount
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const status = await getCrawlStatus();
        if (status.isActive) {
          setIsCrawling(true);
          setCrawlProgress({
            crawledPages: status.crawledPages || 0,
            totalPages: status.totalPages || 100,
          });
        }
      } catch (error) {
        // Ignore errors on initial check - likely means no crawl is active
        console.debug('No active crawl found on initial check');
      } finally {
        setInitialCheckDone(true);
      }
    };

    if (!initialCheckDone && getCrawlStatus) {
      checkInitialStatus();
    }
  }, [getCrawlStatus, initialCheckDone]);

  // Check crawl status periodically when crawling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCrawling) {
      interval = setInterval(async () => {
        try {
          const status = await getCrawlStatus();
          setCrawlProgress({
            crawledPages: status.crawledPages || 0,
            totalPages: status.totalPages || 100,
          });
          
          if (!status.isActive) {
            setIsCrawling(false);
            setCrawlProgress(null);
            refetch(); // Refresh the data
            toast({
              title: "Crawl completed",
              description: `Successfully analyzed ${status.crawledPages || 0} pages`,
            });
          }
        } catch (error) {
          console.error('Error checking crawl status:', error);
        }
      }, 2000); // Check every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCrawling, getCrawlStatus, refetch]);

  const handleStartCrawl = async (maxPages: number) => {
    try {
      console.log('[PageIntelligencePage] Starting crawl with maxPages:', maxPages);
      setIsCrawling(true);
      setCrawlProgress({ crawledPages: 0, totalPages: maxPages });
      setShowCrawlDialog(false);
      
      const result = await triggerCrawl({ maxPages });
      console.log('[PageIntelligencePage] Crawl triggered successfully:', result);
      
      toast({
        title: "Crawl started",
        description: `Website analysis has begun for up to ${maxPages} pages. This may take a few minutes.`,
      });
    } catch (error: any) {
      console.error('[PageIntelligencePage] Crawl failed:', error);
      setIsCrawling(false);
      setCrawlProgress(null);
      
      // Show more detailed error message
      const errorMessage = error?.message || error?.toString() || "Failed to start crawl. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Redirect if user doesn't have access to page-intelligence feature
    if (!isLoading && !isFeatureEnabled('page-intelligence')) {
      router.push('/home');
    }
  }, [isFeatureEnabled, isLoading, router]);

  // Show loading state
  if (isLoading || !initialCheckDone) {
    return (
      <PageTransition loading={true}>
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Show access denied if feature flag is disabled
  if (!isFeatureEnabled('page-intelligence')) {
    return (
      <PageTransition loading={false}>
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Access Denied</p>
              <p className="text-sm text-muted-foreground text-center">
                You don't have access to the Page Intelligence feature.
                <br />
                Please contact your administrator for access.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (!selectedProjectId) {
    return (
      <PageTransition loading={false}>
        <div className="space-y-6">
          <div className="flex items-center justify-center h-[50vh]">
            <Card className="max-w-md w-full">
              <CardContent className="pt-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please select a project from the sidebar to view page intelligence
                    metrics.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition loading={false}>
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          {token && allProjects.length > 0 && (
            <BreadcrumbNav
              projects={allProjects}
              selectedProject={selectedProject}
              onProjectSelect={setSelectedProject}
              currentPage="Page Intelligence"
              showReportSelector={false}
              token={token}
            />
          )}
          {/* Last Analyzed Date and Analyze Button */}
          <div className="flex items-center gap-4">
            {report && (
              <div className="text-sm text-muted-foreground">
                Last analyzed: {report.summary.lastAnalyzedAt 
                  ? new Date(report.summary.lastAnalyzedAt).toLocaleDateString() 
                  : 'Never'}
              </div>
            )}
            <Button
              onClick={() => setShowCrawlDialog(true)}
              disabled={isCrawling}
              size="default"
            >
              {isCrawling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing... {crawlProgress && `(${crawlProgress.crawledPages}/${crawlProgress.totalPages})`}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Analyze Website
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {selectedProject && (
          <div className="space-y-6 fade-in-section is-visible">
            <ContentKPIDashboard 
              projectId={selectedProject.id} 
              isCrawling={isCrawling}
              crawlProgress={crawlProgress}
              showCrawlDialog={showCrawlDialog}
              setShowCrawlDialog={setShowCrawlDialog}
              handleStartCrawl={handleStartCrawl}
            />
          </div>
        )}

        {/* Crawl Settings Dialog */}
        <CrawlSettingsDialog
          open={showCrawlDialog}
          onOpenChange={setShowCrawlDialog}
          onConfirm={handleStartCrawl}
          isLoading={isCrawling}
        />
      </div>
    </PageTransition>
  );
}