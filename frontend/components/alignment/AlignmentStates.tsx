import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, AlertCircle } from "lucide-react";

export function AlignmentLoading() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <Skeleton className="h-12 w-1/3 mb-6" />
        <div className="grid grid-cols-1 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </DashboardLayout>
  );
}

export function AlignmentError({ error }: { error: string }) {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <Terminal className="h-5 w-5" />
          <AlertTitle className="font-semibold">
            Error Fetching Alignment Data
          </AlertTitle>
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}

export function AlignmentNoProject() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Alert className="max-w-2xl mx-auto">
          <Terminal className="h-5 w-5" />
          <AlertTitle className="font-semibold">No Project Selected</AlertTitle>
          <AlertDescription className="text-sm">
            Please select a project from the sidebar to view alignment data.
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}

export function AlignmentNoData() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Alert className="max-w-2xl mx-auto">
          <Terminal className="h-5 w-5" />
          <AlertTitle className="font-semibold">
            No Alignment Data Available
          </AlertTitle>
          <AlertDescription className="text-sm">
            Alignment data could not be loaded or is not currently available.
            Please try again later or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}
