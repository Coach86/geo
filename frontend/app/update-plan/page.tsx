"use client";

import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Building, Zap } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      { text: "1 Brand", included: true },
      { text: "3 AI Models", included: true },
      { text: "Weekly Reports", included: true },
      { text: "Email Support", included: true },
      { text: "Multiple Brands", included: false },
      { text: "All AI Models", included: false },
      { text: "Priority Support", included: false },
      { text: "Custom Integrations", included: false },
    ],
    limits: {
      maxBrands: 1,
      maxAIModels: 3,
    },
  },
  {
    name: "Pro",
    price: "$49",
    period: "per month",
    popular: true,
    features: [
      { text: "Up to 5 Brands", included: true },
      { text: "All AI Models", included: true },
      { text: "Weekly Reports", included: true },
      { text: "Priority Email Support", included: true },
      { text: "API Access", included: true },
      { text: "Advanced Analytics", included: true },
      { text: "Custom Integrations", included: false },
      { text: "Dedicated Account Manager", included: false },
    ],
    limits: {
      maxBrands: 5,
      maxAIModels: 10,
    },
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact sales",
    features: [
      { text: "Unlimited Brands", included: true },
      { text: "All AI Models", included: true },
      { text: "Daily Reports", included: true },
      { text: "24/7 Phone Support", included: true },
      { text: "API Access", included: true },
      { text: "Advanced Analytics", included: true },
      { text: "Custom Integrations", included: true },
      { text: "Dedicated Account Manager", included: true },
    ],
    limits: {
      maxBrands: -1, // unlimited
      maxAIModels: -1, // unlimited
    },
  },
];

export default function UpdatePlanPage() {
  const router = useRouter();

  const handleSelectPlan = (planName: string) => {
    if (planName === "Enterprise") {
      // Redirect to contact page or open contact modal
      window.location.href = "mailto:sales@example.com?subject=Enterprise Plan Inquiry";
    } else {
      // In a real app, this would integrate with Stripe or another payment provider
      toast.info("Payment integration coming soon!");
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Upgrade Your Plan</h1>
          <p className="text-lg text-muted-foreground">
            You've reached your current plan's brand limit. Choose a plan that fits your needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan, index) => (
            <div key={plan.name}>
              <Card className={`relative h-full ${plan.popular ? "border-primary shadow-lg" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <div className="mb-4">
                    <Crown className={`h-12 w-12 mx-auto ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">/{plan.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="h-5 w-5 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={feature.included ? "" : "text-muted-foreground"}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-6">
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handleSelectPlan(plan.name)}
                    >
                      {plan.name === "Enterprise" ? "Contact Sales" : `Upgrade to ${plan.name}`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Need help choosing the right plan?
          </p>
          <Button variant="link" onClick={() => router.back()}>
            <Zap className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Add missing import
import { toast } from "sonner";