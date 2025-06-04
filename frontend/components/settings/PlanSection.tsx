import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Crown, Building, Users, Cpu } from "lucide-react";
import type { Organization } from "@/lib/organization-api";

interface PlanSectionProps {
  organization: Organization;
  selectedModelsCount: number;
}

export function PlanSection({ organization, selectedModelsCount }: PlanSectionProps) {
  const router = useRouter();

  const getPlanName = () => {
    if (!organization?.stripePlanId) return "Free";
    if (organization.stripePlanId === "manual") return "Manual";
    return "Pro";
  };

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
              <p className="text-2xl font-bold">{getPlanName()}</p>
              <Badge variant="secondary">
                {organization.stripePlanId || "free"}
              </Badge>
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

        {organization.stripeCustomerId && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Stripe Customer ID: {organization.stripeCustomerId}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}