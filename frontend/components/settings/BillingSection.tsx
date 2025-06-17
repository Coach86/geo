import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ArrowUpRight } from "lucide-react";
import type { Organization } from "@/lib/organization-api";
import { useAuth } from "@/providers/auth-provider";
import { ContactSalesDialog } from "@/components/shared/ContactSalesDialog";

interface BillingSectionProps {
  organization: Organization;
}

export function BillingSection({ organization }: BillingSectionProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [planName, setPlanName] = useState<string>("Free");
  const [showContactSales, setShowContactSales] = useState(false);

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
        setPlanName(organization.stripePlanId);
      }
    };

    fetchPlanName();
  }, [organization?.stripePlanId, token]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Current plan</span>
              <span className="text-lg font-semibold">{planName}</span>
            </div>
            <Button
              onClick={() => router.push("/update-plan")}
              className="flex items-center gap-2"
            >
              Upgrade
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="pt-2">
            <button
              onClick={() => setShowContactSales(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              If you have custom needs, contact us
            </button>
          </div>
        </CardContent>
      </Card>

      <ContactSalesDialog
        open={showContactSales}
        onOpenChange={setShowContactSales}
      />
    </>
  );
}