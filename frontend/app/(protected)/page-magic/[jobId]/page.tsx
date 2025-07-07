'use client';

import { PageImprovementView } from '@/components/page-magic/PageImprovementView';
import { useParams } from 'next/navigation';

export default function PageImprovementPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  return <PageImprovementView jobId={jobId} />;
}