"use client";

import Image from "next/image";
import { Lightbulb } from "lucide-react";

export default function RecommendationsPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-accent-100 rounded-lg">
            <Lightbulb className="w-6 h-6 text-accent-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Recommendations
            </h1>
            <p className="text-gray-600 mt-1">
              AI-powered optimization recommendations for your brand
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <h2 className="text-4xl font-bold text-gray-800">Coming Soon</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          <div className="rounded-lg overflow-hidden shadow-lg">
            <Image
              src="/comingsoon-1.png"
              alt="Content KPI Analysis Preview"
              width={800}
              height={600}
              className="w-full h-auto"
            />
          </div>
          
          <div className="rounded-lg overflow-hidden shadow-lg">
            <Image
              src="/comingsoon-2.png"
              alt="Content KPI Dashboard Preview"
              width={800}
              height={600}
              className="w-full h-auto"
            />
          </div>
        </div>

        <p className="text-lg text-gray-600 text-center max-w-2xl">
          We're working on bringing you powerful AI-driven recommendations to optimize your brand's visibility and performance. Stay tuned for updates!
        </p>
      </div>
    </div>
  );
}