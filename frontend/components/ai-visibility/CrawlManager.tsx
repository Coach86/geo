import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Globe, 
  Play, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  FileText,
  Clock,
  Link,
  Hash,
  Eye
} from "lucide-react";
import { getCrawledPages } from "@/lib/api/ai-visibility";
import { useAuth } from "@/providers/auth-provider";
import { useNavigation } from "@/providers/navigation-provider";

interface CrawledPage {
  url: string;
  title?: string;
  h1?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  status: string;
  crawledAt: string;
  wordCount: number;
  crawlDepth: number;
  parentUrl?: string;
  outboundLinks?: string[];
  internalLinks?: string[];
  errorMessage?: string;
  metadata?: {
    keywords?: string[];
    author?: string;
    publishedDate?: Date;
    modifiedDate?: Date;
    language?: string;
  };
}

interface CrawlManagerProps {
  status?: {
    totalPages: number;
    successfulPages: number;
    failedPages: number;
    urls: string[];
    isActive?: boolean;
    currentUrl?: string | null;
    queueSize?: number;
  };
  onStartCrawl: (config: any) => Promise<void>;
  projectUrl?: string;
}

export default function CrawlManager({ status, onStartCrawl, projectUrl }: CrawlManagerProps) {
  const { token } = useAuth();
  const { selectedProject } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({
    maxPages: 100,
    maxDepth: 3,
    crawlDelay: 500,
  });
  const [showPagesDialog, setShowPagesDialog] = useState(false);
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectedPage, setSelectedPage] = useState<CrawledPage | null>(null);

  const loadCrawledPages = async () => {
    if (!selectedProject || !token) return;
    
    setLoadingPages(true);
    try {
      const data = await getCrawledPages(selectedProject.id, token);
      setCrawledPages(data.pages || []);
    } catch (error) {
      console.error("Failed to load crawled pages:", error);
    } finally {
      setLoadingPages(false);
    }
  };

  useEffect(() => {
    if (showPagesDialog) {
      loadCrawledPages();
    }
  }, [showPagesDialog]);

  const handleStartCrawl = async () => {
    setIsLoading(true);
    try {
      await onStartCrawl({
        rootUrl: projectUrl,
        config: {
          ...config,
          respectRobotsTxt: true,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const successRate = status?.totalPages 
    ? (status.successfulPages / status.totalPages) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website Crawler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.isActive && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <AlertDescription>
                <div className="space-y-1">
                  <div>Crawling in progress...</div>
                  {status.currentUrl && (
                    <div className="text-xs text-muted-foreground">
                      Currently crawling: {status.currentUrl}
                    </div>
                  )}
                  {status.queueSize !== undefined && status.queueSize > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {status.queueSize} URLs in queue
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {status && status.totalPages > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Crawl Status</span>
                <Badge variant={successRate === 100 ? "success" : "secondary"}>
                  {status.totalPages} pages crawled
                </Badge>
              </div>
              
              <Progress value={successRate} className="h-2" />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-2xl font-bold">{status.successfulPages}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Successful</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-2xl font-bold">{status.failedPages}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span className="text-2xl font-bold">{status.totalPages}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Crawled URLs</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPagesDialog(true)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View All Pages
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {status.urls.slice(0, 10).map((url, index) => (
                    <div key={index} className="text-xs text-muted-foreground truncate">
                      {url}
                    </div>
                  ))}
                  {status.urls.length > 10 && (
                    <div className="text-xs text-muted-foreground italic">
                      ...and {status.urls.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No crawl data available. Start by crawling your website.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium">Crawl Configuration</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxPages">Max Pages</Label>
                <Input
                  id="maxPages"
                  type="number"
                  value={config.maxPages}
                  onChange={(e) => setConfig({ ...config, maxPages: parseInt(e.target.value) })}
                  min={1}
                  max={1000}
                />
              </div>
              <div>
                <Label htmlFor="maxDepth">Max Depth</Label>
                <Input
                  id="maxDepth"
                  type="number"
                  value={config.maxDepth}
                  onChange={(e) => setConfig({ ...config, maxDepth: parseInt(e.target.value) })}
                  min={1}
                  max={5}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="crawlDelay">Crawl Delay (ms)</Label>
              <Input
                id="crawlDelay"
                type="number"
                value={config.crawlDelay}
                onChange={(e) => setConfig({ ...config, crawlDelay: parseInt(e.target.value) })}
                min={100}
                max={5000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Delay between requests to avoid overloading the server
              </p>
            </div>

            <Button 
              onClick={handleStartCrawl}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Crawling...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Crawl
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Crawled Pages Dialog */}
      <Dialog open={showPagesDialog} onOpenChange={setShowPagesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Crawled Pages</DialogTitle>
          </DialogHeader>
          
          {loadingPages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[60vh]">
              {/* Pages List */}
              <div className="border rounded-lg">
                <div className="p-3 border-b bg-muted/50">
                  <h3 className="font-medium text-sm">Pages ({crawledPages.length})</h3>
                </div>
                <ScrollArea className="h-[calc(60vh-48px)]">
                  <div className="p-2 space-y-1">
                    {crawledPages.map((page, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedPage(page)}
                        className={`w-full text-left p-3 rounded-md transition-colors ${
                          selectedPage?.url === page.url
                            ? "bg-accent"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium truncate flex-1">
                              {page.title || page.url}
                            </span>
                            <Badge
                              variant={page.status === "success" ? "success" : "destructive"}
                              className="text-xs"
                            >
                              {page.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {page.url}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {page.wordCount} words
                            </span>
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              Depth {page.crawlDepth}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Page Details */}
              <div className="border rounded-lg">
                <div className="p-3 border-b bg-muted/50">
                  <h3 className="font-medium text-sm">Page Details</h3>
                </div>
                {selectedPage ? (
                  <ScrollArea className="h-[calc(60vh-48px)]">
                    <div className="p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Basic Information</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs text-muted-foreground">URL</span>
                            <div className="flex items-center gap-2">
                              <p className="text-sm break-all">{selectedPage.url}</p>
                              <a
                                href={selectedPage.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                          {selectedPage.title && (
                            <div>
                              <span className="text-xs text-muted-foreground">Title</span>
                              <p className="text-sm">{selectedPage.title}</p>
                            </div>
                          )}
                          {selectedPage.h1 && (
                            <div>
                              <span className="text-xs text-muted-foreground">H1</span>
                              <p className="text-sm">{selectedPage.h1}</p>
                            </div>
                          )}
                          {selectedPage.metaDescription && (
                            <div>
                              <span className="text-xs text-muted-foreground">Meta Description</span>
                              <p className="text-sm">{selectedPage.metaDescription}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Crawl Information</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Status</span>
                            <Badge
                              variant={selectedPage.status === "success" ? "success" : "destructive"}
                            >
                              {selectedPage.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Crawled At</span>
                            <span className="text-sm">
                              {new Date(selectedPage.crawledAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Word Count</span>
                            <span className="text-sm">{selectedPage.wordCount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Crawl Depth</span>
                            <span className="text-sm">{selectedPage.crawlDepth}</span>
                          </div>
                        </div>
                      </div>

                      {selectedPage.errorMessage && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{selectedPage.errorMessage}</AlertDescription>
                        </Alert>
                      )}

                      <Tabs defaultValue="links" className="mt-4">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="links">Links</TabsTrigger>
                          <TabsTrigger value="metadata">Metadata</TabsTrigger>
                        </TabsList>
                        <TabsContent value="links" className="space-y-3">
                          <div>
                            <h5 className="text-xs font-medium mb-1">
                              Internal Links ({selectedPage.internalLinks?.length || 0})
                            </h5>
                            <ScrollArea className="h-32 w-full rounded border">
                              <div className="p-2 space-y-1">
                                {selectedPage.internalLinks?.map((link, i) => (
                                  <div key={i} className="text-xs text-muted-foreground truncate">
                                    {link}
                                  </div>
                                )) || (
                                  <p className="text-xs text-muted-foreground italic">No internal links</p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                          <div>
                            <h5 className="text-xs font-medium mb-1">
                              External Links ({selectedPage.outboundLinks?.length || 0})
                            </h5>
                            <ScrollArea className="h-32 w-full rounded border">
                              <div className="p-2 space-y-1">
                                {selectedPage.outboundLinks?.map((link, i) => (
                                  <div key={i} className="text-xs text-muted-foreground truncate">
                                    {link}
                                  </div>
                                )) || (
                                  <p className="text-xs text-muted-foreground italic">No external links</p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                        </TabsContent>
                        <TabsContent value="metadata" className="space-y-2">
                          {selectedPage.metadata ? (
                            <>
                              {selectedPage.metadata.keywords && (
                                <div>
                                  <span className="text-xs text-muted-foreground">Keywords</span>
                                  <p className="text-sm">{selectedPage.metadata.keywords.join(", ")}</p>
                                </div>
                              )}
                              {selectedPage.metadata.author && (
                                <div>
                                  <span className="text-xs text-muted-foreground">Author</span>
                                  <p className="text-sm">{selectedPage.metadata.author}</p>
                                </div>
                              )}
                              {selectedPage.metadata.language && (
                                <div>
                                  <span className="text-xs text-muted-foreground">Language</span>
                                  <p className="text-sm">{selectedPage.metadata.language}</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No metadata available</p>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-[calc(60vh-48px)] text-muted-foreground">
                    <p className="text-sm">Select a page to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}