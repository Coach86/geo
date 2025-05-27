"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Check, Info, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface FeatureComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendedPlan?: "starter" | "growth" | "enterprise" | "agencies";
  billingPeriod?: "monthly" | "yearly";
}

export function FeatureComparisonDialog({
  open,
  onOpenChange,
  recommendedPlan = "starter",
  billingPeriod = "yearly",
}: FeatureComparisonDialogProps) {
  // Prix mensuels et annuels pour chaque plan
  const pricing = {
    starter: {
      monthly: 89,
      yearly: 69,
    },
    growth: {
      monthly: 199,
      yearly: 159,
    },
    enterprise: null, // Contact sales
    agencies: null, // Contact sales
  };

  const comparisonData = [
    {
      feature: "URLs included",
      tooltip: "Number of websites you can monitor simultaneously",
      starter: "1",
      growth: "3",
      enterprise: "15",
      agencies: "Unlimited",
    },
    {
      feature: "Markets/Languages",
      tooltip: "Geographic markets and languages covered per URL",
      starter: "1",
      growth: "3 per URL",
      enterprise: "3 per URL",
      agencies: "Unlimited",
    },
    {
      feature: "Competitors tracked",
      tooltip: "Number of competitors you can track per URL",
      starter: "5 per URL",
      growth: "5 per URL",
      enterprise: "Unlimited",
      agencies: "Unlimited",
    },
    {
      feature: "Spontaneous prompts",
      tooltip: "Number of spontaneous visibility prompts you can use",
      starter: "Up to 15",
      growth: "Up to 20",
      enterprise: "Unlimited",
      agencies: "Unlimited",
    },
    {
      feature: "AI models",
      tooltip: "Number of AI models used for analysis",
      starter: "5",
      growth: "8+",
      enterprise: "All",
      agencies: "All + Custom",
    },
    {
      feature: "Refresh frequency",
      tooltip: "How often your data is updated",
      starter: "Weekly",
      growth: "Weekly",
      enterprise: "Daily (beta)",
      agencies: "Daily & On demand",
    },
    {
      feature: "CSV Export",
      tooltip: "Export raw data for further analysis",
      starter: false,
      growth: true,
      enterprise: true,
      agencies: true,
    },
    {
      feature: "API Access",
      tooltip: "Programmatic access to your data (beta)",
      starter: false,
      growth: false,
      enterprise: true,
      agencies: true,
    },
    {
      feature: "Custom prompts",
      tooltip: "Create your own prompts for testing",
      starter: false,
      growth: false,
      enterprise: true,
      agencies: true,
    },
    {
      feature: "Custom personas",
      tooltip: "Create user personas for targeted testing",
      starter: false,
      growth: false,
      enterprise: true,
      agencies: true,
    },
    {
      feature: "White-label portal",
      tooltip: "Branded dashboard for your clients",
      starter: false,
      growth: false,
      enterprise: false,
      agencies: true,
    },
    {
      feature: "Dedicated CSM",
      tooltip: "Dedicated Customer Success Manager",
      starter: false,
      growth: false,
      enterprise: true,
      agencies: true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white z-10 p-6 pb-4 border-b">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold">
              Feature Comparison
            </DialogTitle>
            <DialogClose className="h-8 w-8 rounded-md hover:bg-gray-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </DialogClose>
          </div>
        </div>

        <div className="p-6 pt-2">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-4 text-left text-mono-700 font-medium border-b border-gray-200">
                    Features
                  </th>
                  <th
                    className={`p-4 text-center text-mono-700 font-medium border-b border-gray-200 ${
                      recommendedPlan === "starter" ? "bg-indigo-100" : ""
                    }`}
                  >
                    {recommendedPlan === "starter" && (
                      <div className="mb-1">
                        <Badge className="bg-indigo-500 text-white">
                          Recommended
                        </Badge>
                      </div>
                    )}
                    <div>Starter</div>
                    <div className="text-sm font-normal mt-1">
                      {pricing.starter ? (
                        <>
                          <div className="text-indigo-600 font-medium">
                            €
                            {billingPeriod === "monthly"
                              ? pricing.starter.monthly
                              : pricing.starter.yearly}{" "}
                            /mo
                          </div>
                          {billingPeriod === "yearly" && (
                            <div className="text-xs text-gray-500">
                              billed annually
                            </div>
                          )}
                        </>
                      ) : (
                        "Contact Sales"
                      )}
                    </div>
                  </th>
                  <th
                    className={`p-4 text-center text-mono-700 font-medium border-b border-gray-200 ${
                      recommendedPlan === "growth"
                        ? "bg-indigo-100"
                        : "bg-indigo-50"
                    }`}
                  >
                    {recommendedPlan === "growth" && (
                      <div className="mb-1">
                        <Badge className="bg-indigo-500 text-white">
                          Recommended
                        </Badge>
                      </div>
                    )}
                    <div>Growth</div>
                    <div className="text-sm font-normal mt-1">
                      {pricing.growth ? (
                        <>
                          <div className="text-indigo-600 font-medium">
                            €
                            {billingPeriod === "monthly"
                              ? pricing.growth.monthly
                              : pricing.growth.yearly}{" "}
                            /mo
                          </div>
                          {billingPeriod === "yearly" && (
                            <div className="text-xs text-gray-500">
                              billed annually
                            </div>
                          )}
                        </>
                      ) : (
                        "Contact Sales"
                      )}
                    </div>
                  </th>
                  <th
                    className={`p-4 text-center text-mono-700 font-medium border-b border-gray-200 ${
                      recommendedPlan === "enterprise" ? "bg-indigo-100" : ""
                    }`}
                  >
                    {recommendedPlan === "enterprise" && (
                      <div className="mb-1">
                        <Badge className="bg-indigo-500 text-white">
                          Recommended
                        </Badge>
                      </div>
                    )}
                    <div>Enterprise</div>
                    <div className="text-sm font-normal mt-1 text-gray-700">
                      Contact Sales
                    </div>
                  </th>
                  <th
                    className={`p-4 text-center text-mono-700 font-medium border-b border-gray-200 ${
                      recommendedPlan === "agencies"
                        ? "bg-indigo-100"
                        : "bg-teal-50"
                    }`}
                  >
                    {recommendedPlan === "agencies" && (
                      <div className="mb-1">
                        <Badge className="bg-indigo-500 text-white">
                          Recommended
                        </Badge>
                      </div>
                    )}
                    <div>Agencies</div>
                    <div className="text-sm font-normal mt-1 text-gray-700">
                      Contact Sales
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
                    <td className="p-4 text-mono-800 border-b border-gray-200 font-medium">
                      <div className="flex items-center">
                        <span>{row.feature}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 ml-1.5 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[200px]"
                            >
                              <p className="text-xs">{row.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                    <td
                      className={`p-4 text-center border-b border-gray-200 ${
                        recommendedPlan === "starter" ? "bg-indigo-50" : ""
                      }`}
                    >
                      {typeof row.starter === "boolean" ? (
                        row.starter ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-400 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm">{row.starter}</span>
                      )}
                    </td>
                    <td
                      className={`p-4 text-center border-b border-gray-200 ${
                        recommendedPlan === "growth"
                          ? "bg-indigo-50"
                          : "bg-indigo-50/30"
                      }`}
                    >
                      {typeof row.growth === "boolean" ? (
                        row.growth ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-400 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm">{row.growth}</span>
                      )}
                    </td>
                    <td
                      className={`p-4 text-center border-b border-gray-200 ${
                        recommendedPlan === "enterprise" ? "bg-indigo-50" : ""
                      }`}
                    >
                      {typeof row.enterprise === "boolean" ? (
                        row.enterprise ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-400 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm">{row.enterprise}</span>
                      )}
                    </td>
                    <td
                      className={`p-4 text-center border-b border-gray-200 ${
                        recommendedPlan === "agencies"
                          ? "bg-indigo-50"
                          : "bg-teal-50/30"
                      }`}
                    >
                      {typeof row.agencies === "boolean" ? (
                        row.agencies ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-400 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm">{row.agencies}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need a custom plan?{" "}
              <a
                href="mailto:contact@getmint.ai"
                className="text-indigo-600 hover:underline"
              >
                Contact our sales team
              </a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
