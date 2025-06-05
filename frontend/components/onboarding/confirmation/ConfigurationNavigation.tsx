import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfigurationNavigationProps {
  currentIndex: number;
  totalConfigs: number;
  onNavigate: (direction: "prev" | "next") => void;
}

export function ConfigurationNavigation({
  currentIndex,
  totalConfigs,
  onNavigate,
}: ConfigurationNavigationProps) {
  if (totalConfigs <= 1) return null;

  return (
    <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onNavigate("prev")}
        disabled={currentIndex === 0}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>
      <span className="text-sm text-gray-500">
        {currentIndex + 1} of {totalConfigs}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onNavigate("next")}
        disabled={currentIndex === totalConfigs - 1}
      >
        Next
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}