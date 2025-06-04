import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Plan } from "@/hooks/use-plans";

interface RecommendationBannerProps {
  recommendedPlan: string;
  plans: Plan[];
  onStartTrial: (planId: string | undefined, planName: string) => void;
}

export function RecommendationBanner({
  recommendedPlan,
  plans,
  onStartTrial,
}: RecommendationBannerProps) {
  const isSubscriptionPlan = recommendedPlan === "starter" || recommendedPlan === "growth";
  const planDisplayName = recommendedPlan.charAt(0).toUpperCase() + recommendedPlan.slice(1);

  const handleAction = () => {
    if (isSubscriptionPlan) {
      const plan = plans.find(p => p.name.toLowerCase() === recommendedPlan);
      if (plan) {
        onStartTrial(plan.id, plan.name);
      }
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
      <div className="bg-accent-50 border-2 border-accent-200 rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-accent-100 p-3 rounded-full mr-4">
              <CheckCircle2 className="h-6 w-6 text-accent-600" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-mono-900">
                Your Recommended Plan
              </h3>
              <p className="text-mono-600">
                Based on your requirements, we recommend the{" "}
                <span className="font-semibold text-accent-700">
                  {planDisplayName} Plan
                </span>
              </p>
            </div>
          </div>
          {isSubscriptionPlan ? (
            <Button
              className={`${
                recommendedPlan === "starter"
                  ? "bg-gray-800 hover:bg-gray-900"
                  : "bg-accent-500 hover:bg-accent-600"
              } text-white px-6`}
              onClick={handleAction}
            >
              Get Started
            </Button>
          ) : (
            <a
              href={`mailto:contact@getmint.ai?subject=${planDisplayName} Plan Inquiry`}
              style={{ textDecoration: "none" }}
              className="inline-block w-full"
            >
              <Button
                className={`${
                  recommendedPlan === "starter"
                    ? "bg-gray-800 hover:bg-gray-900"
                    : "bg-accent-500 hover:bg-accent-600"
                } text-white px-6`}
                asChild
              >
                Contact Sales
              </Button>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}