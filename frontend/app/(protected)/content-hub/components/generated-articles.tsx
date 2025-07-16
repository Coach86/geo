"use client";

import { useState, useEffect } from "react";
import { useNavigation } from "@/providers/navigation-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  FileText, 
  Eye, 
  Edit,
  Trash2,
  Download,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { AuthClient } from "@/lib/auth-client";

interface GeneratedArticle {
  id: string;
  title: string;
  content: string;
  topic: string;
  tone: string;
  wordCount: number;
  status: "draft" | "published" | "archived";
  generatedAt: string;
  publishedAt?: string;
  sourceContentIds: string[];
  metadata: {
    readingTime?: number;
    keywords?: string[];
    targetAudience?: string;
  };
}

interface GenerationJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  config: {
    topics?: string[];
    tone?: string;
    articleCount: number;
    targetLength?: number;
  };
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export function GeneratedArticles() {
  const { selectedProject } = useNavigation();
  const [articles, setArticles] = useState<GeneratedArticle[]>([]);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  
  // Generation config state
  const [articleCount, setArticleCount] = useState(3);
  const [tone, setTone] = useState("professional");
  const [targetLength, setTargetLength] = useState(800);

  useEffect(() => {
    if (selectedProject?.id) {
      fetchArticles();
      fetchJobs();
    }
  }, [selectedProject]);

  const fetchArticles = async () => {
    if (!selectedProject?.id) return;
    
    try {
      setLoading(true);
      const data = await AuthClient.get<GeneratedArticle[]>(
        `/user/project/${selectedProject.id}/articles`
      );
      setArticles(data);
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      toast.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    if (!selectedProject?.id) return;
    
    try {
      const data = await AuthClient.get<GenerationJob[]>(
        `/user/project/${selectedProject.id}/articles/generation-jobs`
      );
      setJobs(data);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    }
  };

  const handleGenerateArticles = async () => {
    if (!selectedProject?.id) return;

    try {
      await AuthClient.post(
        `/user/project/${selectedProject.id}/articles/generate`,
        {
          articleCount,
          tone,
          targetLength,
        }
      );
      toast.success("Article generation started");
      setShowGenerateDialog(false);
      fetchJobs();
      
      // Poll for updates
      const interval = setInterval(() => {
        fetchArticles();
        fetchJobs();
      }, 5000);
      
      setTimeout(() => clearInterval(interval), 60000); // Stop after 1 minute
    } catch (error) {
      console.error("Failed to generate articles:", error);
      toast.error("Failed to start article generation");
    }
  };

  const handlePublish = async (articleId: string) => {
    if (!selectedProject?.id) return;

    try {
      await AuthClient.post(
        `/user/project/${selectedProject.id}/articles/${articleId}/publish`
      );
      toast.success("Article published");
      fetchArticles();
    } catch (error) {
      console.error("Failed to publish article:", error);
      toast.error("Failed to publish article");
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!selectedProject?.id) return;

    try {
      await AuthClient.delete(
        `/user/project/${selectedProject.id}/articles/${articleId}`
      );
      toast.success("Article deleted");
      fetchArticles();
    } catch (error) {
      console.error("Failed to delete article:", error);
      toast.error("Failed to delete article");
    }
  };

  const filteredArticles = articles.filter(article => 
    statusFilter === "all" || article.status === statusFilter
  );

  const activeJob = jobs.find(job => 
    job.status === "pending" || job.status === "processing"
  );

  if (!selectedProject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please select a project first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Articles</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogTrigger asChild>
            <Button disabled={!!activeJob}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Articles
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Articles</DialogTitle>
              <DialogDescription>
                Configure how you want to generate new articles from your content library
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Number of Articles</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[articleCount]}
                    onValueChange={([value]) => setArticleCount(value)}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-right">{articleCount}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Target Length (words)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[targetLength]}
                    onValueChange={([value]) => setTargetLength(value)}
                    min={300}
                    max={2000}
                    step={100}
                    className="flex-1"
                  />
                  <span className="w-16 text-right">{targetLength}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateArticles}>
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Job Status */}
      {activeJob && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              <div>
                <p className="font-medium text-blue-900">
                  Generating {activeJob.config.articleCount} articles...
                </p>
                <p className="text-sm text-blue-700">
                  Started {formatDistanceToNow(new Date(activeJob.createdAt))} ago
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-100">
              {activeJob.status}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Articles Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading articles...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {statusFilter === "all" 
                ? "No articles generated yet"
                : `No ${statusFilter} articles`}
            </p>
            <p className="text-sm text-gray-400">
              Generate articles from your content library to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredArticles.map((article) => (
            <Card key={article.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{article.title}</CardTitle>
                    <CardDescription className="mt-2">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {article.wordCount} words
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {article.metadata.readingTime || Math.ceil(article.wordCount / 200)} min read
                        </span>
                        <Badge variant="secondary">{article.tone}</Badge>
                        <Badge 
                          variant={
                            article.status === "published" ? "default" :
                            article.status === "draft" ? "outline" : "secondary"
                          }
                        >
                          {article.status}
                        </Badge>
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 line-clamp-3 mb-4">
                  {article.content.substring(0, 200)}...
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    <p className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Generated {formatDistanceToNow(new Date(article.generatedAt))} ago
                    </p>
                    {article.publishedAt && (
                      <p className="text-xs mt-1">
                        Published on {format(new Date(article.publishedAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {article.status === "draft" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePublish(article.id)}
                      >
                        Publish
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(article.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}