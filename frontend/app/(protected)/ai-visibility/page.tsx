"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  Search, 
  Globe, 
  BarChart, 
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useNavigation } from "@/providers/navigation-provider";
import CrawlManager from "@/components/ai-visibility/CrawlManager";
import IndexStatus from "@/components/ai-visibility/IndexStatus";
import ScanResultsDashboard from "@/components/ai-visibility/ScanResultsDashboard";
import AIOptimizationPanel from "@/components/ai-visibility/AIOptimizationPanel";
import { getAIVisibilityStatus, startCrawl, buildIndexes, executeScan } from "@/lib/api/ai-visibility";
import { toast } from "sonner";
import { useAIVisibilityEvents } from "@/hooks/useAIVisibilityEvents";

export default function AIVisibilityPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { selectedProject } = useNavigation();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [scanResults, setScanResults] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  // Use WebSocket events for real-time updates
  useAIVisibilityEvents(selectedProject?.id, () => {
    loadStatus();
  });

  useEffect(() => {
    if (!selectedProject || !token) {
      router.push("/");
      return;
    }
    loadStatus();
  }, [selectedProject, token]);
  
  // Remove polling since we're using WebSocket events now

  const loadStatus = async () => {
    if (!selectedProject || !token) return;
    
    console.log('Loading AI Visibility status:', {
      projectId: selectedProject.id,
      hasToken: !!token,
      tokenLength: token?.length
    });
    
    try {
      setIsLoading(true);
      const data = await getAIVisibilityStatus(selectedProject.id, token);
      setStatus(data);
      
      // Load latest scan results if available
      if (data.scans && data.scans.length > 0) {
        setScanResults(data.scans[0]);
      }
    } catch (error) {
      console.error("Failed to load AI visibility status:", error);
      toast.error("Failed to load AI visibility data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCrawl = async (config: any) => {
    if (!selectedProject || !token) return;
    
    try {
      const result = await startCrawl(selectedProject.id, config, token);
      toast.success("Crawl started successfully");
      // WebSocket will handle updates
    } catch (error) {
      console.error("Crawl failed:", error);
      toast.error("Failed to start crawl");
    }
  };

  const handleBuildIndexes = async () => {
    if (!selectedProject || !token) return;
    
    try {
      const result = await buildIndexes(selectedProject.id, token);
      toast.success("Indexes built successfully");
      await loadStatus();
    } catch (error) {
      console.error("Index build failed:", error);
      toast.error("Failed to build indexes");
    }
  };

  const handleExecuteScan = async (config: any) => {
    if (!selectedProject || !token) return;
    
    try {
      const result = await executeScan(selectedProject.id, config, token);
      toast.success("Scan started successfully");
      
      // Poll for results
      setTimeout(() => loadStatus(), 3000);
    } catch (error) {
      console.error("Scan failed:", error);
      toast.error("Failed to start scan");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderOverviewStats = () => {
    if (!status) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crawled Pages</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.crawl?.totalPages || 0}</div>
            <p className="text-xs text-muted-foreground">
              {status.crawl?.successfulPages || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Index Status</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status.indexes?.bm25?.status === 'ready' && status.indexes?.vector?.status === 'ready' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">Not Ready</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {status.indexes?.bm25?.chunkCount || 0} chunks indexed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Coverage</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scanResults ? `${Math.round((scanResults.coverageMetrics?.hybridCoverage || 0) * 100)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {scanResults ? 'Last scan' : 'No scans yet'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Visibility Scanner</h1>
          <p className="text-muted-foreground mt-1">
            Analyze how AI systems discover and retrieve your content
          </p>
        </div>
        <Button
          onClick={() => setActiveTab("scan")}
          disabled={!status?.indexes?.bm25?.status || !status?.indexes?.vector?.status}
        >
          <Brain className="mr-2 h-4 w-4" />
          Run New Scan
        </Button>
      </div>

      {renderOverviewStats()}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="crawl">Crawl</TabsTrigger>
          <TabsTrigger value="indexes">Indexes</TabsTrigger>
          <TabsTrigger value="scan">Scan</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {scanResults ? (
            <ScanResultsDashboard scanResults={scanResults} />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No scans have been run yet. Start by crawling your website, building indexes, then running a scan.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="crawl">
          <CrawlManager
            status={status?.crawl}
            onStartCrawl={handleStartCrawl}
            projectUrl={selectedProject?.website}
          />
        </TabsContent>

        <TabsContent value="indexes">
          <IndexStatus
            bm25Status={status?.indexes?.bm25}
            vectorStatus={status?.indexes?.vector}
            onBuildIndexes={handleBuildIndexes}
            canBuild={status?.crawl?.totalPages > 0}
          />
        </TabsContent>

        <TabsContent value="scan">
          <Card>
            <CardHeader>
              <CardTitle>Run Visibility Scan</CardTitle>
            </CardHeader>
            <CardContent>
              {status?.indexes?.bm25?.status === 'ready' && status?.indexes?.vector?.status === 'ready' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Run a comprehensive scan to test how AI systems can discover your content.
                  </p>
                  <Button 
                    onClick={() => handleExecuteScan({ 
                      config: {
                        querySource: 'generated',
                        generateQueryCount: 50,
                        useHybridSearch: true,
                        maxResults: 10
                      }
                    })}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Start Scan
                  </Button>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please build indexes before running a scan.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          {scanResults?.recommendations ? (
            <AIOptimizationPanel recommendations={scanResults.recommendations} />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Run a scan to get AI optimization recommendations.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}