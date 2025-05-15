"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import BrandReport from "@/components/brand-report";

// Interface for report data with required fields for the brand report
interface ReportData {
  id: string;
  companyId: string;
  weekStart: string;
  generatedAt: string;
  // Report content sections
  brand: string;
  metadata: {
    url: string;
    market: string;
    flag: string;
    competitors: string;
    date: string;
    models: string;
  };
  kpi: {
    pulse: {
      value: string;
      description: string;
    };
    tone: {
      value: string;
      status: "green" | "yellow" | "red";
      description: string;
    };
    accord: {
      value: string;
      status: "green" | "yellow" | "red";
      description: string;
    };
    arena: {
      competitors: string[];
      description: string;
    };
  };
  pulse: {
    promptsTested: number;
    modelVisibility: {
      model: string;
      value: number;
      isAverage?: boolean;
    }[];
  };
  tone: {
    sentiments: {
      model: string;
      sentiment: string;
      status: "green" | "yellow" | "red";
      positives: string;
      negatives: string;
      isAverage?: boolean;
    }[];
    questions: {
      question: string;
      results: {
        model: string;
        sentiment: string;
        status: "green" | "yellow" | "red";
        keywords: string;
      }[];
    }[];
  };
  accord: {
    attributes: {
      name: string;
      rate: string;
      alignment: "✅" | "⚠️" | "❌";
    }[];
    score: {
      value: string;
      status: "green" | "yellow" | "red";
    };
  };
  arena: {
    competitors: {
      name: string;
      chatgpt: number;
      claude: number;
      mistral: number;
      gemini: number;
      global: string;
      size: "lg" | "md" | "sm";
      sentiment: "positive" | "neutral" | "negative";
    }[];
    battle: {
      competitors: {
        name: string;
        comparisons: {
          model: string;
          positives: string[];
          negatives: string[];
        }[];
      }[];
      chatgpt?: {
        positives: string[];
        negatives: string[];
      };
      claude?: {
        positives: string[];
        negatives: string[];
      };
    };
  };
}

function Report() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Get the token from the URL parameters
  const token = searchParams.get("token");

  // Define the API base URL based on environment
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  useEffect(() => {
    const fetchReport = async () => {
      if (!token) {
        setLoading(false);
        setError("No access token provided");
        return;
      }

      try {
        // First validate the token
        const validationResponse = await fetch(
          `${apiBaseUrl}/reports/access/validate?token=${token}`
        );

        if (!validationResponse.ok) {
          throw new Error("Failed to validate token");
        }

        const validationResult = await validationResponse.json();

        if (!validationResult.valid) {
          throw new Error("Invalid or expired token");
        }

        // Token is valid, get the report data
        const reportId = validationResult.reportId;
        const companyId = validationResult.companyId;

        if (!reportId || !companyId) {
          throw new Error("Missing report ID or company ID");
        }

        // Fetch the report content from the backend API
        const reportResponse = await fetch(
          `${apiBaseUrl}/reports/content/${reportId}?token=${token}`
        );

        if (!reportResponse.ok) {
          throw new Error("Failed to fetch report data");
        }

        // Get the report data - it should already be in the proper format
        // thanks to our backend transformations
        const reportData = await reportResponse.json();
        console.log("Report data from API:", reportData);

        // Set the report data for rendering
        setReportData(reportData);
      } catch (err: any) {
        console.error("Error fetching report:", err);
        setError(err.message || "Failed to load report");

        // If the token is invalid or expired, redirect to the access page
        if (err.message === "Invalid or expired token") {
          router.push(`/report-access?token=${token}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [token, apiBaseUrl, router]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Loading Brand Intelligence Report</CardTitle>
            <CardDescription>
              Please wait while we load your report...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full border-4 border-t-blue-500 border-b-blue-700 border-l-blue-300 border-r-blue-600 animate-spin"></div>
            <p className="mt-6 text-center text-muted-foreground">
              Loading your report data
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Report Access Error</CardTitle>
            <CardDescription>
              We encountered a problem loading your report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  // Render the BrandReport component with the loaded report data
  return <BrandReport data={reportData} />;
}

export default Report;
