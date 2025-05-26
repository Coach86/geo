import React, { Suspense } from "react";
import ReportClient from "./ReportClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl py-12">
          <Card>
            <CardHeader>
              <CardTitle>Loading Mint</CardTitle>
              <CardDescription>
                Please wait while we load your report...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full border-4 border-t-blue-500 border-b-blue-700 border-l-blue-300 border-r-blue-600 animate-spin"></div>
              <p className="mt-6 text-center text-muted-foreground">
                Loading your report data
              </p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ReportClient />
    </Suspense>
  );
}
