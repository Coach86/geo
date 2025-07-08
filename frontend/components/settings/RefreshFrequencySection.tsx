"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import type { Organization } from "@/lib/organization-api";

interface RefreshFrequencySectionProps {
  organization: Organization;
  token: string | null;
  onOrganizationUpdate: (org: Organization) => void;
}

type RefreshFrequency = 'daily' | 'weekly' | 'unlimited';

export function RefreshFrequencySection({ 
  organization, 
  token,
  onOrganizationUpdate 
}: RefreshFrequencySectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFrequency, setCurrentFrequency] = useState<RefreshFrequency>('weekly');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // Fetch current refresh frequency
  useEffect(() => {
    const fetchRefreshInfo = async () => {
      const planId = organization.stripePlanId || organization.trialPlanId;
      if (!planId) return;

      try {
        // Fetch plan details to get refresh frequency
        const response = await fetch(
          `${API_BASE_URL}/plans/${planId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch plan details");
        }

        const plan = await response.json();
        const frequency = plan.refreshFrequency || 'weekly';
        setCurrentFrequency(frequency);
      } catch (err) {
        console.error("Failed to fetch refresh frequency:", err);
        setError("Failed to load refresh frequency settings");
      }
    };

    fetchRefreshInfo();
  }, [organization, token]);


  const getFrequencyLabel = (frequency: RefreshFrequency) => {
    switch (frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'unlimited':
        return 'Unlimited';
      default:
        return 'Weekly';
    }
  };

  if (loading && !currentFrequency) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analysis Refresh Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Analysis Refresh Frequency</CardTitle>
            <CardDescription>
              Configure how often your brand analysis reports are automatically refreshed
            </CardDescription>
          </div>
          {currentFrequency === 'weekly' && (
            <Badge 
              variant="secondary" 
              className="px-2 py-1 text-xs bg-purple-100 text-purple-700 cursor-pointer hover:bg-purple-200 transition-colors"
              onClick={() => router.push('/pricing')}
            >
              Upgrade
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <Label>Refresh Frequency Options</Label>
          <div className="flex items-center gap-2">
            <Select
              value={currentFrequency}
              onValueChange={(value) => {
                if (value !== currentFrequency) {
                  router.push('/pricing');
                }
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}