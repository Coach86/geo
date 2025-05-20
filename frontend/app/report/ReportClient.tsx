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
      status: string;
      description: string;
    };
    accord: {
      value: string;
      status: string;
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
      status: string;
      positives: string;
      negatives: string;
      isAverage?: boolean;
    }[];
    questions: {
      question: string;
      results: {
        model: string;
        sentiment: string;
        status: string;
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
      status: string;
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
  const [tokenRenewalStatus, setTokenRenewalStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle');

  // Get the token from the URL parameters
  const token = searchParams.get("token");

  // Define the API base URL based on environment
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  // Function to request a new token
  const renewToken = async (userId: string) => {
    try {
      setTokenRenewalStatus('requesting');
      
      // Make the request to generate a new token
      const renewResponse = await fetch(`${apiBaseUrl}/tokens/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!renewResponse.ok) {
        throw new Error('Failed to renew access token');
      }
      
      const result = await renewResponse.json();
      
      if (result.success) {
        setTokenRenewalStatus('success');
        // Show a message that a new token has been sent by email
        setError('Your access token has expired. A new token has been sent to your email.');
      } else {
        throw new Error('Token renewal response did not indicate success');
      }
    } catch (err) {
      console.error('Error renewing token:', err);
      setTokenRenewalStatus('error');
      // Redirect to report access page if renewal fails
      router.push(`/report-access?token=${token}`);
    }
  };
  
  useEffect(() => {
    const fetchReport = async () => {
      if (!token) {
        setLoading(false);
        setError("No access token provided");
        return;
      }

      try {
        // Try the new token endpoint first, then fall back to the legacy one if needed
        console.log(
          `Trying to validate token with new endpoint: ${apiBaseUrl}/tokens/validate?token=${token.substring(
            0,
            8
          )}...`
        );
        let validationResponse = await fetch(
          `${apiBaseUrl}/tokens/validate?token=${token}`
        );

        // Log detailed info about the response
        console.log(
          `Token validation response status: ${validationResponse.status}`
        );

        if (!validationResponse.ok) {
          throw new Error("Failed to validate token");
        }

        const validationResult = await validationResponse.json();

        if (!validationResult.valid) {
          throw new Error("Invalid or expired token");
        }

        // Token is valid, get the report data
        // For the new token structure, we get reportId from the query params
        const reportId =
          searchParams.get("reportId") || validationResult.reportId;
        // We don't need companyId for the new token-based access
        const companyId = validationResult.companyId;

        if (!reportId) {
          throw new Error("Missing report ID");
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

        // If the token is invalid or expired, try to renew it automatically
        if (err.message === "Invalid or expired token" || err.message === "Failed to validate token") {
          // Try to get validation result for user ID even if token is expired
          try {
            const expiredValidationResponse = await fetch(
              `${apiBaseUrl}/tokens/validate?token=${token}`
            );
            
            const expiredValidationResult = await expiredValidationResponse.json();
            
            if (expiredValidationResult.userId) {
              // We have the userId from the expired token, request a new one
              console.log(`Attempting to renew expired token for user: ${expiredValidationResult.userId}`);
              await renewToken(expiredValidationResult.userId);
            } else {
              // If we can't get the userId, redirect to the access page
              router.push(`/report-access?token=${token}`);
            }
          } catch (renewError) {
            console.error("Error during token renewal attempt:", renewError);
            router.push(`/report-access?token=${token}`);
          }
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
            {tokenRenewalStatus === 'success' ? (
              <Alert className="bg-green-50 border-green-200">
                <AlertTitle>New Access Token Sent</AlertTitle>
                <AlertDescription>
                  Your access token has expired. A new token has been sent to your email address.
                  Please check your inbox and use the new link to access the report.
                </AlertDescription>
              </Alert>
            ) : tokenRenewalStatus === 'requesting' ? (
              <Alert>
                <AlertTitle>Requesting New Access Token</AlertTitle>
                <AlertDescription>
                  Your access token has expired. We're requesting a new one to be sent to your email...
                </AlertDescription>
                <div className="mt-4 flex justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-b-blue-700 border-l-blue-300 border-r-blue-600 animate-spin"></div>
                </div>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          {tokenRenewalStatus === 'success' && (
            <div className="px-6 pb-6 flex justify-center">
              <Button variant="outline" onClick={() => router.push('/')}>
                Return to Home
              </Button>
            </div>
          )}
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
