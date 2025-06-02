"use client";

import React, { useState } from "react";
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
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  const [url, setUrl] = useState("");
  const [market, setMarket] = useState("");
  const [language, setLanguage] = useState("English");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Get available languages based on selected market
  const getAvailableLanguages = () => {
    if (!market) return languages;

    const marketLanguages = countryToLanguage[market];
    if (!marketLanguages) return languages;

    return languages.filter((lang) => marketLanguages.includes(lang.value));
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

    // Validate inputs
    if (!url) {
      setError("Please enter a project URL");
      return;
    }

    if (!market) {
      setError("Please select a market");
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert language name to code for API
      const languageCode = languageToCode[language] || "en";

      const result = await onCreateProject({
        url,
        market,
        language: languageCode,
      });

      toast.success("Project created successfully!");
      onSuccess(result.id);

      // Reset form
      setUrl("");
      setMarket("");
      setLanguage("English");
      onClose();
    } catch (err: any) {
      console.error("Failed to create project:", err);

      // Check if it's a plan limit error
      if (err.response?.data?.code === "BRAND_LIMIT_EXCEEDED") {
        setError(
          "You've reached your plan's brand limit. Please upgrade to add more projects."
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
            Enter the project's website URL to analyze and add it to your
            portfolio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Project Website URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
              required
            />
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
            <Button type="submit" disabled={isSubmitting}>
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
