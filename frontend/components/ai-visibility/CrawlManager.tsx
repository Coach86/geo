import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Globe, 
  Play, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({
    maxPages: 100,
    maxDepth: 3,
    crawlDelay: 500,
  });

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
                <h4 className="text-sm font-medium mb-2">Crawled URLs</h4>
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
    </div>
  );
}