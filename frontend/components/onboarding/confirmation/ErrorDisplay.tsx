import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ErrorDisplayProps {
  error: string | null;
  showNoConfigWarning?: boolean;
}

export function ErrorDisplay({ error, showNoConfigWarning }: ErrorDisplayProps) {
  if (showNoConfigWarning) {
    return (
      <Alert variant="default" className="mb-6 border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          You haven't configured any websites yet. Please add at least one
          website to generate a report.
        </AlertDescription>
      </Alert>
    );
  }

  if (!error) return null;

  return (
    <div className="mt-6">
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">{error}</AlertDescription>
      </Alert>
    </div>
  );
}