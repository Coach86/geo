"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { getUserUrlUsage, UrlUsageResponse } from "@/lib/auth-api";
import { useAuth } from "@/providers/auth-provider";
import {
  countries,
  languages,
  countryToLanguage,
  languageToCode,
} from "@/constants/markets-languages";

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (projectId: string) => void;
  onCreateProject: (data: {
    url: string;
    market: string;
    language: string;
  }) => Promise<{ id: string }>;
}

export default function AddProjectModal({
  isOpen,
  onClose,
  onSuccess,
  onCreateProject,
}: AddProjectModalProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [selectedUrl, setSelectedUrl] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [market, setMarket] = useState("");
  const [language, setLanguage] = useState("English");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [urlUsage, setUrlUsage] = useState<UrlUsageResponse | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);

  // Get available languages based on selected market
  const getAvailableLanguages = () => {
    if (!market) return languages;

    const marketLanguages = countryToLanguage[market];
    if (!marketLanguages) return languages;

    return languages.filter((lang) => marketLanguages.includes(lang.value));
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setSelectedUrl("");
      setCustomUrl("");
      setShowCustomUrlInput(false);
      setMarket("");
      setLanguage("English");
      setError("");
    }
  }, [isOpen]);

  // Fetch URL usage when modal opens
  useEffect(() => {
    const fetchUrlUsage = async () => {
      if (!isOpen || !token) return;

      setIsLoadingUsage(true);
      try {
        const usage = await getUserUrlUsage(token);
        setUrlUsage(usage);
      } catch (err) {
        console.error("Failed to fetch URL usage:", err);
        toast.error("Failed to load URL usage information");
      } finally {
        setIsLoadingUsage(false);
      }
    };

    fetchUrlUsage();
  }, [isOpen, token]);

  // Handle URL selection change
  const handleUrlSelectionChange = (value: string) => {
    if (value === "add-new") {
      // Check if user can add more URLs
      if (urlUsage && !urlUsage.canAddMore) {
        // Redirect to update plan
        router.push("/update-plan");
        onClose();
        return;
      }
      // Show custom URL input
      setShowCustomUrlInput(true);
      setSelectedUrl("");
    } else {
      // Select existing URL
      setSelectedUrl(value);
      setShowCustomUrlInput(false);
      setCustomUrl("");
    }
  };

  // Update language when market changes
  React.useEffect(() => {
    if (market) {
      const availableLanguages = getAvailableLanguages();
      const marketLanguages = countryToLanguage[market];

      // If current language is not available in the new market, set to first available
      if (marketLanguages && !marketLanguages.includes(language)) {
        setLanguage(marketLanguages[0] || "English");
      }
    }
  }, [market]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Determine the URL to use
    const urlToUse = showCustomUrlInput ? customUrl : selectedUrl;

    // Validate inputs
    if (!urlToUse) {
      setError("Please select or enter a project URL");
      return;
    }

    if (!market) {
      setError("Please select a market");
      return;
    }

    // Validate URL format if it's a custom URL
    if (showCustomUrlInput) {
      try {
        new URL(urlToUse);
      } catch {
        setError("Please enter a valid URL (e.g., https://example.com)");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Convert language name to code for API
      const languageCode = languageToCode[language] || "en";

      const result = await onCreateProject({
        url: urlToUse,
        market,
        language: languageCode,
      });

      toast.success("Project created successfully!");
      onSuccess(result.id);

      // Reset form
      setSelectedUrl("");
      setCustomUrl("");
      setShowCustomUrlInput(false);
      setMarket("");
      setLanguage("English");
      onClose();
    } catch (err: any) {
      console.error("Failed to create project:", err);

      // Check if it's a plan limit error
      if (err.response?.data?.code === "PROJECT_LIMIT_EXCEEDED") {
        setError(
          "You've reached your plan's project limit. Please upgrade to add more projects."
        );
      } else if (err.response?.data?.code === "URL_LIMIT_EXCEEDED") {
        const errorData = err.response.data;
        setError(
          `You've reached your URL limit (${errorData.maxAllowed}). Please upgrade your plan to add more URLs.`
        );
      } else if (err.response?.data?.code === "URL_ALREADY_EXISTS") {
        const errorData = err.response.data;
        setError(
          `You already have a project with this URL: ${errorData.url}`
        );
      } else {
        setError(err.message || "Failed to create project. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Select an existing URL or add a new one to analyze and add to your
            portfolio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Project Website URL</Label>
            {isLoadingUsage ? (
              <div className="flex items-center space-x-2 p-3 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Loading URLs...</span>
              </div>
            ) : (
              <>
                <Select
                  value={showCustomUrlInput ? "add-new" : selectedUrl}
                  onValueChange={handleUrlSelectionChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="url">
                    <SelectValue placeholder="Select an existing URL or add new" />
                  </SelectTrigger>
                  <SelectContent>
                    {urlUsage?.currentUrls.map((url, index) => (
                      <SelectItem key={index} value={url}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{url}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="add-new">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span>Add new URL</span>
                        {urlUsage && !urlUsage.canAddMore && (
                          <span className="text-xs text-orange-600">(Upgrade required)</span>
                        )}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {showCustomUrlInput && (
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="mt-2"
                  />
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="market">Market</Label>
            <Select
              value={market}
              onValueChange={setMarket}
              disabled={isSubmitting}
            >
              <SelectTrigger id="market">
                <SelectValue placeholder="Select a market" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={language}
              onValueChange={setLanguage}
              disabled={isSubmitting}
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableLanguages().map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
