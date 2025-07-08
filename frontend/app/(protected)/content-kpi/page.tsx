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
  const [crawlProgress, setCrawlProgress] = useState<{ crawledPages: number; totalPages: number; currentUrl?: string; status?: string } | null>(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [showCrawlDialog, setShowCrawlDialog] = useState(false);

  // Check if we should show crawling state from query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('crawling') === 'true') {
        setIsCrawling(true);
        setCrawlProgress({ crawledPages: 0, totalPages: 100, currentUrl: 'Starting...', status: 'started' });
        
        // Remove the query parameter from URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete('crawling');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  // Stable callback for crawler events
  const handleCrawlerEvent = useCallback((event: any) => {
    // Handle content scores deletion event
    if (event.eventType === 'content.scores.deleted') {
      toast({
        title: "Preparing analysis",
        description: `Clearing ${event.deletedCount || 'existing'} previous content scores...`,
      });
      // Reload the page with crawling parameter to show loader
      setTimeout(() => {
        // Get current URL parts
        const currentUrl = window.location.href;
        const hashIndex = currentUrl.indexOf('#');
        const hash = hashIndex !== -1 ? currentUrl.substring(hashIndex) : '';
        const baseUrl = hashIndex !== -1 ? currentUrl.substring(0, hashIndex) : currentUrl;
        
        // Add or update the crawling parameter
        const separator = baseUrl.includes('?') ? '&' : '?';
        const newUrl = `${baseUrl}${separator}crawling=true${hash}`;
        
        window.location.href = newUrl;
      }, 500);
      return;
    }
    
    // Update progress based on WebSocket events - prioritize WebSocket over polling
    if (event.eventType === 'crawler.started') {
      setIsCrawling(true);
      setCrawlProgress({
        crawledPages: event.crawledPages || 0,
        totalPages: event.totalPages || 100,
        currentUrl: event.currentUrl,
        status: event.status,
      });
    } else if (event.eventType === 'crawler.progress' || event.eventType === 'crawler.page_crawled') {
      // Only update if we have valid progress data
      if (event.crawledPages !== undefined && event.totalPages !== undefined) {
        setIsCrawling(true);
        const urlToUse = event.currentUrl || (event as any).url; // Try both fields
        setCrawlProgress({
          crawledPages: event.crawledPages,
          totalPages: event.totalPages,
          currentUrl: urlToUse,
          status: event.status,
        });
      }
    } else if (event.eventType === 'crawler.completed') {
      setIsCrawling(false);
      setCrawlProgress(null);
      // Add a small delay before refetching to ensure backend has finished processing
      setTimeout(() => {
        refetch(); // Refresh the data
      }, 1000);
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
  }, [refetch]);

  // Listen to crawler events
  const { crawlerStatus, isActive: isCrawlerActive } = useCrawlerEvents({
    projectId: selectedProjectId || '',
    token: token || undefined,
    onCrawlerEvent: handleCrawlerEvent,
  });

  // Check initial crawl status on mount
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const status = await getCrawlStatus();
        if (status.isActive) {
          setIsCrawling(true);
          setCrawlProgress(prev => ({
            crawledPages: status.crawledPages || 0,
            totalPages: status.totalPages || 100,
            currentUrl: prev?.currentUrl, // Preserve URL from WebSocket, API doesn't provide it
          }));
        }
      } catch (error) {
        // Ignore errors on initial check - likely means no crawl is active
        console.debug('No active crawl found on initial check');
      } finally {
        setInitialCheckDone(true);
      }
    };

    if (!initialCheckDone) {
      checkInitialStatus();
    }
  }, [getCrawlStatus]); // Remove initialCheckDone from dependencies to prevent re-runs

  // Check crawl status periodically when crawling, but only as fallback when WebSocket is not connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Only use polling as fallback when WebSocket is not providing updates
    if (isCrawling && !isCrawlerActive) {
      interval = setInterval(async () => {
        try {
          const status = await getCrawlStatus();
          
          // Only update if we get valid data and haven't received WebSocket updates recently
          if (status.isActive) {
            setCrawlProgress(prev => ({
              crawledPages: status.crawledPages || 0,
              totalPages: status.totalPages || 100,
              currentUrl: prev?.currentUrl, // Preserve URL from WebSocket, API doesn't provide it
            }));
          } else {
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
          // If polling fails, assume crawl is complete
          setIsCrawling(false);
          setCrawlProgress(null);
        }
      }, 3000); // Reduced frequency to 3 seconds since it's just a fallback
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCrawling, isCrawlerActive, getCrawlStatus, refetch]);

  const handleStartCrawl = async (settings: { maxPages: number; userAgent?: string; includePatterns?: string[]; excludePatterns?: string[]; mode?: 'auto' | 'manual'; manualUrls?: string[] }) => {
    try {
      console.log('[PageIntelligencePage] Starting crawl with settings:', settings);
      setIsCrawling(true);
      setCrawlProgress({ crawledPages: 0, totalPages: settings.maxPages, currentUrl: 'Starting...' });
      setShowCrawlDialog(false);
      
      const result = await triggerCrawl(settings);
      console.log('[PageIntelligencePage] Crawl triggered successfully:', result);
      
      toast({
        title: "Crawl started",
        description: `Website analysis has begun for up to ${settings.maxPages} pages. This may take a few minutes.`,
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