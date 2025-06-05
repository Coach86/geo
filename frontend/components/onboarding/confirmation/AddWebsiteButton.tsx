import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddWebsiteButtonProps {
  onClick: () => void;
}

export function AddWebsiteButton({ onClick }: AddWebsiteButtonProps) {
  return (
    <div className="flex justify-center mt-6">
      <Button
        variant="outline"
        className="flex items-center gap-2 border-dashed border-gray-300"
        onClick={onClick}
      >
        <Plus className="h-4 w-4" />
        Add another website to analyze
      </Button>
    </div>
  );
}