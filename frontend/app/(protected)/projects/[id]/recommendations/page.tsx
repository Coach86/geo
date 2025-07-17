'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { RecommendationsDashboard } from '@/components/recommendations/RecommendationsDashboard';

export default function ProjectRecommendationsPage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <div className="container mx-auto py-6">
      <RecommendationsDashboard projectId={projectId} />
    </div>
  );
}