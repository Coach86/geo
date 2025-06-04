import { Badge } from "@/components/ui/badge";
import { Check, X, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { comparisonData, featureTooltips } from "./pricing-constants";

interface ComparisonTableProps {
  recommendedPlan: string;
}

export function ComparisonTable({ recommendedPlan }: ComparisonTableProps) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-mono-900">
        Feature Comparison
      </h2>
      <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-mono-200">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className="p-4 text-left text-mono-700 font-medium border-b border-mono-200">
                Features
              </th>
              <th
                className={`p-4 text-center text-mono-700 font-medium border-b border-mono-200 ${
                  recommendedPlan === "starter" ? "bg-accent-100" : ""
                }`}
              >
                {recommendedPlan === "starter" && (
                  <div className="mb-1">
                    <Badge className="bg-accent-500 text-white">
                      Recommended
                    </Badge>
                  </div>
                )}
                Starter
              </th>
              <th
                className={`p-4 text-center text-mono-700 font-medium border-b border-mono-200 ${
                  recommendedPlan === "growth"
                    ? "bg-accent-100"
                    : "bg-accent-50"
                }`}
              >
                {recommendedPlan === "growth" && (
                  <div className="mb-1">
                    <Badge className="bg-accent-500 text-white">
                      Recommended
                    </Badge>
                  </div>
                )}
                Growth
              </th>
              <th
                className={`p-4 text-center text-mono-700 font-medium border-b border-mono-200 ${
                  recommendedPlan === "enterprise" ? "bg-accent-100" : ""
                }`}
              >
                {recommendedPlan === "enterprise" && (
                  <div className="mb-1">
                    <Badge className="bg-accent-500 text-white">
                      Recommended
                    </Badge>
                  </div>
                )}
                Enterprise
              </th>
              <th
                className={`p-4 text-center text-mono-700 font-medium border-b border-mono-200 ${
                  recommendedPlan === "agencies"
                    ? "bg-accent-100"
                    : "bg-teal-50"
                }`}
              >
                {recommendedPlan === "agencies" && (
                  <div className="mb-1">
                    <Badge className="bg-accent-500 text-white">
                      Recommended
                    </Badge>
                  </div>
                )}
                Agencies
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? "bg-mono-50" : "bg-white"}
              >
                <td className="p-4 text-mono-800 border-b border-mono-200 font-medium">
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
                          <p className="text-xs">
                            {featureTooltips[row.feature] || ""}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </td>
                <td
                  className={`p-4 text-center border-b border-mono-200 ${
                    recommendedPlan === "starter" ? "bg-accent-50" : ""
                  }`}
                >
                  {typeof row.starter === "boolean" ? (
                    row.starter ? (
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-mono-400 mx-auto" />
                    )
                  ) : (
                    <span className="text-sm">{row.starter}</span>
                  )}
                </td>
                <td
                  className={`p-4 text-center border-b border-mono-200 ${
                    recommendedPlan === "growth"
                      ? "bg-accent-50"
                      : "bg-accent-50/30"
                  }`}
                >
                  {typeof row.growth === "boolean" ? (
                    row.growth ? (
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-mono-400 mx-auto" />
                    )
                  ) : (
                    <span className="text-sm">{row.growth}</span>
                  )}
                </td>
                <td
                  className={`p-4 text-center border-b border-mono-200 ${
                    recommendedPlan === "enterprise" ? "bg-accent-50" : ""
                  }`}
                >
                  {typeof row.enterprise === "boolean" ? (
                    row.enterprise ? (
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-mono-400 mx-auto" />
                    )
                  ) : (
                    <span className="text-sm">{row.enterprise}</span>
                  )}
                </td>
                <td
                  className={`p-4 text-center border-b border-mono-200 ${
                    recommendedPlan === "agencies"
                      ? "bg-accent-50"
                      : "bg-teal-50/30"
                  }`}
                >
                  {typeof row.agencies === "boolean" ? (
                    row.agencies ? (
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-mono-400 mx-auto" />
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
      <div className="mt-4 text-center">
        <p className="text-sm text-mono-500">
          Need a custom plan?{" "}
          <a
            href="mailto:contact@getmint.ai"
            className="text-accent-600 hover:underline"
          >
            Contact our sales team
          </a>
        </p>
      </div>
    </section>
  );
}