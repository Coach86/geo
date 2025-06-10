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
  Loader2,
  Info,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useNavigation } from "@/providers/navigation-provider";
import CrawlManager from "@/components/ai-visibility/CrawlManager";
import IndexStatus from "@/components/ai-visibility/IndexStatus";
import ScanResultsDashboard from "@/components/ai-visibility/ScanResultsDashboard";
import AIOptimizationPanel from "@/components/ai-visibility/AIOptimizationPanel";
import OverlapAnalysis from "@/components/ai-visibility/OverlapAnalysis";
import ActionPlanDashboard from "@/components/ai-visibility/ActionPlanDashboard";
import { getAIVisibilityStatus, startCrawl, buildIndexes, executeScan, getScanResults, getRecommendations, generateActionPlan, previewActionPlan, getActionPlan, updateActionItem } from "@/lib/api/ai-visibility";
import { toast } from "sonner";
import { useAIVisibilityEvents } from "@/hooks/useAIVisibilityEvents";

// Helper function to generate overlap analysis data from query results
function generateOverlapAnalysisData(queryResults: any[]) {
  if (!queryResults || queryResults.length === 0) {
    return null;
  }

  // Calculate overlap distribution
  const overlapBuckets = {
    "0-20%": 0,
    "20-40%": 0,
    "40-60%": 0,
    "60-80%": 0,
    "80-100%": 0
  };

  queryResults.forEach(result => {
    const overlapPercent = result.overlap * 100;
    if (overlapPercent < 20) overlapBuckets["0-20%"]++;
    else if (overlapPercent < 40) overlapBuckets["20-40%"]++;
    else if (overlapPercent < 60) overlapBuckets["40-60%"]++;
    else if (overlapPercent < 80) overlapBuckets["60-80%"]++;
    else overlapBuckets["80-100%"]++;
  });

  const distribution = Object.entries(overlapBuckets).map(([range, count]) => ({
    range,
    count,
    percentage: (count / queryResults.length) * 100
  }));

  // Calculate overlap by query type
  const queryTypeStats: Record<string, { bm25Only: number; vectorOnly: number; both: number; total: number; totalOverlap: number }> = {};
  
  queryResults.forEach(result => {
    const type = result.intent;
    if (!queryTypeStats[type]) {
      queryTypeStats[type] = { bm25Only: 0, vectorOnly: 0, both: 0, total: 0, totalOverlap: 0 };
    }

    queryTypeStats[type].total++;
    queryTypeStats[type].totalOverlap += result.overlap;

    const hasBm25 = result.mrr.bm25 > 0;
    const hasVector = result.mrr.vector > 0;

    if (hasBm25 && hasVector) {
      queryTypeStats[type].both++;
    } else if (hasBm25) {
      queryTypeStats[type].bm25Only++;
    } else if (hasVector) {
      queryTypeStats[type].vectorOnly++;
    }
  });

  const byQueryType = Object.entries(queryTypeStats).map(([type, stats]) => ({
    type,
    avgOverlap: stats.total > 0 ? stats.totalOverlap / stats.total : 0,
    bm25Only: stats.bm25Only,
    vectorOnly: stats.vectorOnly,
    both: stats.both
  }));

  // Get top overlapping queries
  const topOverlappingQueries = queryResults
    .filter(result => result.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 10)
    .map(result => ({
      query: result.query,
      overlapScore: result.overlap,
      sharedResults: Math.round(result.overlap * Math.min(
        result.bm25Results.documents.length, 
        result.vectorResults.documents.length
      ))
    }));

  return {
    distribution,
    byQueryType,
    topOverlappingQueries
  };
}

export default function AIVisibilityPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { selectedProject } = useNavigation();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [scanResults, setScanResults] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    isScanning: boolean;
    progress: number;
    currentQuery?: string;
    totalQueries?: number;
  }>({ isScanning: false, progress: 0 });
  const [actionPlan, setActionPlan] = useState<any>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  
  // Use WebSocket events for real-time updates
  useAIVisibilityEvents(selectedProject?.id, (event: any) => {
    // Handle different event types
    if (event?.type === 'scan:progress') {
      setScanProgress({
        isScanning: true,
        progress: event.progress || 0,
        currentQuery: event.currentQuery,
        totalQueries: event.totalQueries
      });
    } else if (event?.type === 'scan:completed') {
      setScanProgress({ isScanning: false, progress: 100 });
      loadStatus();
    } else {
      // Other events trigger status reload
      loadStatus();
    }
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
        const latestScan = data.scans[0];
        console.log('Latest scan summary:', latestScan);
        
        // If scan is completed, fetch full results
        if (latestScan.status === 'completed' && latestScan.scanId) {
          try {
            const [fullScanResult, recommendations] = await Promise.all([
              getScanResults(selectedProject.id, latestScan.scanId, token),
              getRecommendations(selectedProject.id, latestScan.scanId, token)
            ]);
            
            console.log('Full scan results:', fullScanResult);
            console.log('Recommendations:', recommendations);
            console.log('Latest scan scanId:', latestScan.scanId);
            console.log('Full scan result scanId:', fullScanResult.scanId);
            
            // Generate overlap analysis data from query results
            const overlapData = generateOverlapAnalysisData(fullScanResult.queryResults || []);
            
            // Ensure scanId is properly set
            const mergedResults = {
              ...latestScan,
              ...fullScanResult,
              scanId: fullScanResult.scanId || latestScan.scanId,
              recommendations: recommendations.recommendations,
              overlapData
            };
            
            console.log('Merged scan results with scanId:', mergedResults.scanId);
            setScanResults(mergedResults);

            // Try to load existing action plan
            try {
              const scanIdToUse = fullScanResult.scanId || latestScan.scanId;
              console.log('Attempting to load action plan for scanId:', scanIdToUse);
              
              if (scanIdToUse) {
                const existingPlan = await getActionPlan(selectedProject.id, scanIdToUse, token);
                if (existingPlan?.actionPlan) {
                  setActionPlan(existingPlan.actionPlan);
                  console.log('Loaded existing action plan:', existingPlan.actionPlan);
                } else {
                  console.log('No action plan in response');
                }
              } else {
                console.log('No scanId available to load action plan');
              }
            } catch (error) {
              console.error('Error loading action plan:', error);
            }
          } catch (error) {
            console.error('Failed to load full scan results:', error);
            setScanResults(latestScan);
          }
        } else {
          setScanResults(latestScan);
        }
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
      
      // WebSocket events will handle progress updates
    } catch (error) {
      console.error("Scan failed:", error);
      toast.error("Failed to start scan");
      // Reset scan progress on error
      setScanProgress({ isScanning: false, progress: 0 });
    }
  };

  const handleGenerateActionPlan = async (scanId: string) => {
    if (!selectedProject || !token) return;
    
    console.log('Generating action plan for scanId:', scanId);
    setIsGeneratingPlan(true);
    try {
      const result = await generateActionPlan(selectedProject.id, scanId, token);
      console.log('Action plan generation result:', result);
      setActionPlan(result.actionPlan);
      setActiveTab("recommendations");
      toast.success("Action plan generated successfully");
    } catch (error) {
      console.error("Action plan generation failed:", error);
      toast.error("Failed to generate action plan");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleMarkComplete = async (actionId: string) => {
    if (!actionPlan || !selectedProject || !token) return;
    
    // Find the current item to toggle its state
    let currentCompleted = false;
    actionPlan.phases.forEach((phase: any) => {
      phase.items.forEach((item: any) => {
        if (item.id === actionId) {
          currentCompleted = item.completed;
        }
      });
    });
    
    try {
      // Update in backend
      const result = await updateActionItem(
        selectedProject.id,
        actionPlan.scanId,
        actionId,
        !currentCompleted,
        token
      );
      
      if (result?.actionPlan) {
        setActionPlan(result.actionPlan);
        toast.success("Action item updated");
      }
    } catch (error) {
      console.error("Failed to update action item:", error);
      toast.error("Failed to update action item");
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
            Test how well ChatGPT, Claude, and other AI assistants can find and cite your website's content
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
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations & Action Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">What This Shows You</h3>
                  <p className="text-blue-800 text-sm leading-relaxed">
                    This overview shows how easy it is for AI assistants like ChatGPT to find and reference your website content. 
                    Higher scores mean AI tools are more likely to mention your brand when users ask relevant questions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {scanResults ? (
            <ScanResultsDashboard 
              scanResults={scanResults} 
              onGenerateActionPlan={handleGenerateActionPlan}
            />
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
          <Card className="bg-green-50 border-green-200 mb-4">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">Step 1: Crawl Your Website</h3>
                  <p className="text-green-800 text-sm leading-relaxed">
                    First, we need to read through your website pages just like AI assistants do. 
                    This process collects all your content so we can test how findable it is. 
                    Think of it like creating a library of all your web pages.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <CrawlManager
            status={status?.crawl}
            onStartCrawl={handleStartCrawl}
            projectUrl={selectedProject?.website}
          />
        </TabsContent>

        <TabsContent value="indexes">
          <Card className="bg-purple-50 border-purple-200 mb-4">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-2">Step 2: Prepare Content for Testing</h3>
                  <p className="text-purple-800 text-sm leading-relaxed mb-3">
                    Now we organize your content into two different "filing systems" that AI assistants use to find information:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Search className="h-4 w-4 text-purple-600 mt-0.5" />
                      <div>
                        <span className="font-medium text-purple-900">Keyword Search:</span>
                        <span className="text-purple-800"> Finds pages with exact words people search for</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Brain className="h-4 w-4 text-purple-600 mt-0.5" />
                      <div>
                        <span className="font-medium text-purple-900">Meaning Search:</span>
                        <span className="text-purple-800"> Finds pages that match the concept or topic, even without exact words</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <IndexStatus
            bm25Status={status?.indexes?.bm25}
            vectorStatus={status?.indexes?.vector}
            onBuildIndexes={handleBuildIndexes}
            canBuild={status?.crawl?.totalPages > 0}
          />
        </TabsContent>

        <TabsContent value="scan">
          <Card className="bg-orange-50 border-orange-200 mb-4">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-2">Step 3: Test AI Visibility</h3>
                  <p className="text-orange-800 text-sm leading-relaxed mb-3">
                    Now we'll simulate what happens when someone asks AI assistants questions about your industry. 
                    We'll test 50 different questions to see how often and how prominently your content appears in the answers.
                  </p>
                  <p className="text-orange-800 text-sm leading-relaxed">
                    This is like asking "If someone asks ChatGPT about topics related to my business, will it mention my website?"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Run Visibility Scan</CardTitle>
            </CardHeader>
            <CardContent>
              {status?.indexes?.bm25?.status === 'ready' && status?.indexes?.vector?.status === 'ready' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Start the test to see how AI assistants find and rank your content.
                  </p>
                  
                  {scanProgress.isScanning ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Scanning in progress...</span>
                        <Badge variant="secondary">
                          {scanProgress.progress}%
                        </Badge>
                      </div>
                      <Progress value={scanProgress.progress} className="h-2" />
                      {scanProgress.currentQuery && (
                        <p className="text-xs text-muted-foreground">
                          Testing query: "{scanProgress.currentQuery}"
                        </p>
                      )}
                      {scanProgress.totalQueries && (
                        <p className="text-xs text-muted-foreground">
                          Progress: {Math.floor((scanProgress.progress / 100) * scanProgress.totalQueries)} of {scanProgress.totalQueries} queries
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button 
                      onClick={() => {
                        setScanProgress({ isScanning: true, progress: 0 });
                        handleExecuteScan({ 
                          config: {
                            querySource: 'generated',
                            generateQueryCount: 50,
                            useHybridSearch: true,
                            maxResults: 10
                          }
                        });
                      }}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Start Scan
                    </Button>
                  )}
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

        <TabsContent value="analysis">
          <Card className="bg-teal-50 border-teal-200 mb-4">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-teal-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-teal-900 mb-2">Deep Dive: How AI Finds Your Content</h3>
                  <p className="text-teal-800 text-sm leading-relaxed mb-3">
                    This analysis shows you the patterns in how AI assistants discover your content. Understanding these patterns helps you optimize your content strategy.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 bg-teal-500 rounded-full mt-1.5"></div>
                      <div>
                        <span className="font-medium text-teal-900">High Overlap:</span>
                        <span className="text-teal-800"> Both search methods find your content - this is great!</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1.5"></div>
                      <div>
                        <span className="font-medium text-teal-900">Low Overlap:</span>
                        <span className="text-teal-800"> Only one search method finds your content - room for improvement</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {scanResults?.overlapData ? (
            <OverlapAnalysis overlapData={scanResults.overlapData} />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Run a scan to see detailed analysis of how AI assistants find your content.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="recommendations">
          <Card className="bg-indigo-50 border-indigo-200 mb-4">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-indigo-900 mb-2">Your Action Plan</h3>
                  <p className="text-indigo-800 text-sm leading-relaxed mb-3">
                    Based on your scan results, here are specific, prioritized steps to improve how AI assistants find and cite your content. 
                    We've ranked these by impact and effort, so you know where to start first.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5"></div>
                      <div>
                        <span className="font-medium text-indigo-900">High Priority:</span>
                        <span className="text-indigo-800"> Quick wins with big impact on AI visibility</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1.5"></div>
                      <div>
                        <span className="font-medium text-indigo-900">Medium Priority:</span>
                        <span className="text-indigo-800"> Important improvements for long-term growth</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                      <div>
                        <span className="font-medium text-indigo-900">Low Priority:</span>
                        <span className="text-indigo-800"> Nice-to-have optimizations when you have time</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Show action plan if generated, otherwise show recommendations */}
          {actionPlan ? (
            <ActionPlanDashboard
              actionPlan={actionPlan}
              projectInfo={{
                brandName: selectedProject?.brandName || "Your Brand",
                industry: selectedProject?.industry || "Unknown",
                website: selectedProject?.website || "#"
              }}
              onMarkComplete={handleMarkComplete}
              onGenerateNewPlan={() => scanResults && handleGenerateActionPlan(scanResults.scanId)}
            />
          ) : scanResults ? (
            <div className="space-y-4">
              {/* Original recommendations */}
              {scanResults.recommendations && scanResults.recommendations.length > 0 && (
                <AIOptimizationPanel recommendations={scanResults.recommendations} />
              )}
              
              {/* Generate action plan CTA */}
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-900">
                    <TrendingUp className="h-5 w-5" />
                    Transform Insights into Action
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-purple-800 mb-4">
                    Generate a detailed action plan with specific content recommendations, 
                    projected improvements, and step-by-step implementation guidance.
                  </p>
                  <Button 
                    onClick={() => handleGenerateActionPlan(scanResults.scanId)}
                    disabled={isGeneratingPlan}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Action Plan...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Generate Action Plan
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Run a scan to get personalized recommendations and generate an action plan.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}