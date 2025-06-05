import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";
import type { Organization } from "@/lib/organization-api";

interface OrganizationSectionProps {
  organization: Organization;
}

export function OrganizationSection({ organization }: OrganizationSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Organization ID</Label>
            <p className="text-sm text-muted-foreground font-mono mt-1">
              {organization.id}
            </p>
          </div>
          <div>
            <Label>Created</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(organization.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}