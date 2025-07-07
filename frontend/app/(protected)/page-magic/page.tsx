'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePostHogFlags } from '@/hooks/use-posthog-flags';
import { PageMagicDashboard } from '@/components/page-magic/PageMagicDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { PageTransition } from '@/components/shared/PageTransition';

export default function PageMagicPage() {
  const { isFeatureEnabled, isLoading } = usePostHogFlags();
  const router = useRouter();

  useEffect(() => {
    // Redirect if user doesn't have access to page-magic feature
    if (!isLoading && !isFeatureEnabled('page-magic')) {
      router.push('/home');
    }
  }, [isFeatureEnabled, isLoading, router]);

  // Show loading state
  if (isLoading) {
    return (
      <PageTransition loading={true}>
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Show access denied if feature flag is disabled
  if (!isFeatureEnabled('page-magic')) {
    return (
      <PageTransition loading={false}>
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Access Denied</p>
              <p className="text-sm text-muted-foreground text-center">
                You don't have access to the Page Magic feature.
                <br />
                Please contact your administrator for access.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return <PageMagicDashboard />;
}