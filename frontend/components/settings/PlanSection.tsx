import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Crown, Building, Users, Cpu } from "lucide-react";
import type { Organization } from "@/lib/organization-api";
import { useAuth } from "@/providers/auth-provider";

interface PlanSectionProps {
  organization: Organization;
  selectedModelsCount: number;
}

export function PlanSection({ organization, selectedModelsCount }: PlanSectionProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [planName, setPlanName] = useState<string>("Free");

  useEffect(() => {
    const fetchPlanName = async () => {
      if (!organization?.stripePlanId || organization.stripePlanId === "manual") {
        setPlanName(organization.stripePlanId === "manual" ? "Manual" : "Free");
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/public/plans/${organization.stripePlanId}/name`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setPlanName(data.name);
        }
      } catch (error) {
        console.error('Error fetching plan name:', error);
        // Fallback to stripePlanId if fetch fails
        setPlanName(organization.stripePlanId);
      }
    };

    fetchPlanName();
  }, [organization?.stripePlanId, token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Plan Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold">{planName}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/update-plan")}
          >
            Upgrade Plan
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <Label>Projects</Label>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold">
                {organization.currentProjects || 0} /{" "}
                {organization.planSettings.maxProjects}
              </p>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${
                    ((organization.currentProjects || 0) /
                      organization.planSettings.maxProjects) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label>Users</Label>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold">
                {organization.currentUsers || 0}
                {organization.planSettings.maxUsers !== -1 &&
                  ` / ${organization.planSettings.maxUsers}`}
              </p>
            </div>
            {organization.planSettings.maxUsers !== -1 && (
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      ((organization.currentUsers || 0) /
                        organization.planSettings.maxUsers) *
                      100
                    }%`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <Label>AI Models</Label>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold">
                {selectedModelsCount} /{" "}
                {organization.planSettings.maxAIModels}
              </p>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${
                    (selectedModelsCount /
                      organization.planSettings.maxAIModels) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}