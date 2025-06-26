import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ArrowUpRight, AlertCircle, XCircle } from "lucide-react";
import type { Organization } from "@/lib/organization-api";
import { useAuth } from "@/providers/auth-provider";
import { ContactSalesDialog } from "@/components/shared/ContactSalesDialog";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface BillingSectionProps {
  organization: Organization;
}

export function BillingSection({ organization }: BillingSectionProps) {
  const router = useRouter();
  const { token } = useAuth();
  const { toast } = useToast();
  const [planName, setPlanName] = useState<string>("Free");
  const [showContactSales, setShowContactSales] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

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

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/user/profile/cancel-subscription`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel subscription');
      }

      const data = await response.json();
      toast({
        title: "Subscription Canceled",
        description: data.message,
      });
      setShowCancelDialog(false);
      // Refresh the page to update the subscription status
      router.refresh();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const isPaidPlan = organization?.stripePlanId && 
                     organization.stripePlanId !== "manual" && 
                     planName !== "Free";
  
  const canCancelSubscription = isPaidPlan && organization?.subscriptionStatus !== 'canceling';

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
              {organization?.subscriptionStatus === 'canceling' && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Canceling
                </Badge>
              )}
            </div>
            <Button
              onClick={() => router.push("/update-plan")}
              className="flex items-center gap-2"
            >
              Upgrade
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
          
          {organization?.subscriptionStatus === 'canceling' && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {organization?.subscriptionCancelAt ? (
                <>
                  Your subscription will end on {format(new Date(organization.subscriptionCancelAt), 'MMMM d, yyyy')}. 
                  You'll continue to have access until then.
                </>
              ) : organization?.subscriptionCurrentPeriodEnd ? (
                <>
                  Your subscription is scheduled to cancel at the end of the current billing period on{' '}
                  {format(new Date(organization.subscriptionCurrentPeriodEnd), 'MMMM d, yyyy')}. 
                  You'll continue to have access until then.
                </>
              ) : (
                'Your subscription is scheduled to cancel. You\'ll continue to have access until the end of your billing period.'
              )}
            </div>
          )}
          
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setShowContactSales(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              If you have custom needs, contact us
            </button>
            {canCancelSubscription && (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="text-sm text-muted-foreground hover:text-destructive transition-colors"
              >
                Cancel my subscription
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <ContactSalesDialog
        open={showContactSales}
        onOpenChange={setShowContactSales}
      />

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Cancel Subscription
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? Your access will continue until the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelLoading ? "Canceling..." : "Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}