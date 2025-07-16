"use client";

import { useState, useEffect } from "react";
import { useNavigation } from "@/providers/navigation-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Link, Calendar, Trash2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { AuthClient } from "@/lib/auth-client";

interface ContentItem {
  id: string;
  url: string;
  title: string;
  content: string;
  metadata: {
    author?: string;
    publishedDate?: string;
    tags?: string[];
    wordCount?: number;
  };
  scrapedAt: string;
  createdAt: string;
}

export function ContentLibrary() {
  const { selectedProject } = useNavigation();
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    if (selectedProject?.id) {
      fetchContentItems();
    }
  }, [selectedProject]);

  const fetchContentItems = async () => {
    if (!selectedProject?.id) return;
    
    try {
      setLoading(true);
      const data = await AuthClient.get<ContentItem[]>(
        `/user/project/${selectedProject.id}/content-library`
      );
      setContentItems(data);
    } catch (error) {
      console.error("Failed to fetch content items:", error);
      toast.error("Failed to load content library");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUrl = async () => {
    if (!newUrl.trim() || !selectedProject?.id) return;

    try {
      setSubmitting(true);
      await AuthClient.post(
        `/user/project/${selectedProject.id}/content-library/submit-url`,
        { url: newUrl }
      );
      toast.success("Content added successfully");
      setNewUrl("");
      fetchContentItems();
    } catch (error) {
      console.error("Failed to submit URL:", error);
      toast.error("Failed to add content");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!selectedProject?.id) return;

    try {
      await AuthClient.delete(
        `/user/project/${selectedProject.id}/content-library/${itemId}`
      );
      toast.success("Content removed");
      fetchContentItems();
    } catch (error) {
      console.error("Failed to delete content:", error);
      toast.error("Failed to remove content");
    }
  };

  if (!selectedProject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please select a project first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add URL Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add Content</CardTitle>
          <CardDescription>
            Submit a URL to add content to your library
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/article"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              disabled={submitting}
              onKeyPress={(e) => e.key === "Enter" && handleSubmitUrl()}
            />
            <Button
              onClick={handleSubmitUrl}
              disabled={!newUrl.trim() || submitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Items Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading content library...</p>
        </div>
      ) : contentItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">
              No content in your library yet
            </p>
            <p className="text-sm text-gray-400">
              Start by adding URLs above to build your content library
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contentItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2">
                    {item.title}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {item.content.substring(0, 150)}...
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Link className="h-3 w-3" />
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline truncate flex-1"
                  >
                    {item.url}
                  </a>
                  <ExternalLink className="h-3 w-3" />
                </div>
                {item.metadata.author && (
                  <p className="text-xs text-gray-500 mb-1">
                    By {item.metadata.author}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Added {formatDistanceToNow(new Date(item.createdAt))} ago
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex gap-2 flex-wrap">
                  {item.metadata.tags?.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {item.metadata.wordCount && (
                    <Badge variant="outline" className="text-xs">
                      {item.metadata.wordCount} words
                    </Badge>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}