"use client";

import { useAuthGuard } from "@/hooks/use-auth-guard";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedLayoutProps {
  children: React.ReactNode;
  requirePayment?: boolean;
  requireProjects?: boolean;
  loadingComponent?: React.ReactNode;
}

export default function ProtectedLayout({
  children,
  requirePayment = true,
  requireProjects = true,
  loadingComponent,
}: ProtectedLayoutProps) {
  const { authState, isLoading } = useAuthGuard({
    requirePayment,
    requireProjects,
  });

  // Show loading state
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        </div>
      )
    );
  }

  // Only render children if authenticated
  if (authState === "authenticated") {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
}