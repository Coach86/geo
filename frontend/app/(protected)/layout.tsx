"use client";

import { useAuthGuard } from "@/hooks/use-auth-guard";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authState, isLoading } = useAuthGuard({
    requirePayment: true,
    requireProjects: true,
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  if (authState === "authenticated") {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  // Return null while redirecting
  return null;
}