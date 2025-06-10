import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Database, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileText,
  Sparkles
} from "lucide-react";
import { testSearch } from "@/lib/api/ai-visibility";
import { useAuth } from "@/providers/auth-provider";
import { useNavigation } from "@/providers/navigation-provider";

interface IndexStatusProps {
  bm25Status?: {
    id: string;
    status: string;
    chunkCount: number;
    createdAt: string;
    configuration: any;
  };
  vectorStatus?: {
    id: string;
    status: string;
    chunkCount: number;
    createdAt: string;
    configuration: any;
  };
  onBuildIndexes: () => Promise<void>;
  canBuild: boolean;
}

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  score: number;
  rank: number;
}

interface SearchTestResults {
  bm25Results?: SearchResult[];
  vectorResults?: SearchResult[];
  hybridResults?: SearchResult[];
}

export default function IndexStatus({ 
  bm25Status, 
  vectorStatus, 
  onBuildIndexes,
  canBuild 
}: IndexStatusProps) {
  const { token } = useAuth();
  const { selectedProject } = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchTestResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchTab, setActiveSearchTab] = useState("bm25");

  const handleTestSearch = async () => {
    if (!searchQuery.trim() || !selectedProject || !token) return;
    
    setIsSearching(true);
    try {
      const results = await testSearch(selectedProject.id, searchQuery, 10, token);
      setSearchResults(results);
    } catch (error) {
      console.error("Search test failed:", error);
    } finally {
      setIsSearching(false);
    }
  };
  const renderStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">Not Built</Badge>;
    
    switch (status) {
      case 'ready':
        return <Badge variant="success">Ready</Badge>;
      case 'building':
        return <Badge variant="secondary">Building...</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'outdated':
        return <Badge variant="warning">Outdated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderStatusIcon = (status?: string) => {
    if (!status) return <XCircle className="h-5 w-5 text-gray-400" />;
    
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'building':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'outdated':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BM25 Index Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                BM25 Index
              </span>
              {renderStatusIcon(bm25Status?.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                {renderStatusBadge(bm25Status?.status)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Chunks</span>
                <span className="text-sm font-medium">{bm25Status?.chunkCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{formatDate(bm25Status?.createdAt)}</span>
              </div>
            </div>
            
            {bm25Status?.configuration && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  k1: {bm25Status.configuration.k1}, b: {bm25Status.configuration.b}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vector Index Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Vector Index
              </span>
              {renderStatusIcon(vectorStatus?.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                {renderStatusBadge(vectorStatus?.status)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Chunks</span>
                <span className="text-sm font-medium">{vectorStatus?.chunkCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{formatDate(vectorStatus?.createdAt)}</span>
              </div>
            </div>
            
            {vectorStatus?.configuration && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Model: {vectorStatus.configuration.embeddingModel}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dimensions: {vectorStatus.configuration.dimension}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Build Action */}
      <Card>
        <CardContent className="pt-6">
          {!canBuild ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need to crawl your website before building indexes.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Build or rebuild search indexes from your crawled pages. This process will create both 
                BM25 (keyword-based) and vector (semantic) indexes for comprehensive AI visibility analysis.
              </p>
              <Button 
                onClick={onBuildIndexes}
                className="w-full"
                variant={bm25Status?.status === 'ready' && vectorStatus?.status === 'ready' ? 'outline' : 'default'}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {bm25Status?.status === 'ready' && vectorStatus?.status === 'ready' ? 'Rebuild' : 'Build'} Indexes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Testing Interface */}
      {bm25Status?.status === 'ready' && vectorStatus?.status === 'ready' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Test Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-query">Search Query</Label>
              <div className="flex gap-2">
                <Input
                  id="search-query"
                  placeholder="Enter a test query..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
                />
                <Button 
                  onClick={handleTestSearch}
                  disabled={!searchQuery.trim() || isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {searchResults && (
              <div className="space-y-4 pt-4 border-t">
                <Tabs value={activeSearchTab} onValueChange={setActiveSearchTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="bm25">BM25</TabsTrigger>
                    <TabsTrigger value="vector">Vector</TabsTrigger>
                    <TabsTrigger value="hybrid">Hybrid</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="bm25" className="mt-4">
                    <SearchResultsList 
                      results={searchResults.bm25Results} 
                      type="BM25 (Keyword-based)"
                    />
                  </TabsContent>
                  
                  <TabsContent value="vector" className="mt-4">
                    <SearchResultsList 
                      results={searchResults.vectorResults} 
                      type="Vector (Semantic)"
                    />
                  </TabsContent>
                  
                  <TabsContent value="hybrid" className="mt-4">
                    <SearchResultsList 
                      results={searchResults.hybridResults} 
                      type="Hybrid (Combined)"
                    />
                  </TabsContent>
                </Tabs>

                {/* Comparison Summary */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Search Performance</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">BM25 Results:</span>
                      <p className="font-medium">{searchResults.bm25Results?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vector Results:</span>
                      <p className="font-medium">{searchResults.vectorResults?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hybrid Results:</span>
                      <p className="font-medium">{searchResults.hybridResults?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SearchResultsList({ results, type }: { results?: SearchResult[]; type: string }) {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No results found for {type} search</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full">
      <div className="space-y-3">
        {results.map((result, index) => (
          <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between mb-1">
              <h4 className="text-sm font-medium line-clamp-1">
                {result.title || result.url}
              </h4>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  #{result.rank}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {result.score.toFixed(3)}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
              {result.url}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {result.snippet}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}