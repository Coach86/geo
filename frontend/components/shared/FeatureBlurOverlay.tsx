"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface FeatureBlurOverlayProps {
  featureName: string;
  description?: string;
}

export function FeatureBlurOverlay({ featureName, description }: FeatureBlurOverlayProps) {
  const router = useRouter();

  return (
    <>
      {/* Background overlay - only covers the content area */}
      <div className="absolute inset-0 bg-white/60 z-10" aria-hidden="true" />
      
      {/* Dialog positioned at fixed top margin */}
      <div className="absolute inset-x-0 top-0 z-20 flex justify-center p-4 pointer-events-none">
        <Card className="mt-24 max-w-md p-8 text-center shadow-xl bg-white pointer-events-auto">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-accent-100 p-4">
              <Lock className="h-8 w-8 text-accent-600" />
            </div>
          </div>
          
          <h3 className="mb-2 text-2xl font-bold text-gray-900">
            {featureName} is a Premium Feature
          </h3>
          
          <p className="mb-6 text-gray-600">
            {description || `Upgrade to a paid plan to unlock ${featureName.toLowerCase()} and gain deeper insights into your brand's AI presence.`}
          </p>
          
          <Button
            onClick={() => router.push("/update-plan")}
            className="w-full bg-accent-600 hover:bg-accent-700"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Upgrade to Unlock
          </Button>
        </Card>
      </div>
    </>
  );
}