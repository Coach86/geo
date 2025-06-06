import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  Database, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";

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

export default function IndexStatus({ 
  bm25Status, 
  vectorStatus, 
  onBuildIndexes,
  canBuild 
}: IndexStatusProps) {
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
    </div>
  );
}