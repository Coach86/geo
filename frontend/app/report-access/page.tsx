import React, { Suspense } from "react";
import ReportAccessClient from "./ReportAccessClient";
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
        <div className="container mx-auto max-w-3xl py-12">
          <Card>
            <CardHeader>
              <CardTitle>Accessing Mint Report</CardTitle>
              <CardDescription>Validating your access token...</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-b-blue-700 border-l-blue-300 border-r-blue-600 animate-spin"></div>
              <p className="mt-4 text-center text-muted-foreground">
                Please wait while we validate your access token
              </p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ReportAccessClient />
    </Suspense>
  );
}
