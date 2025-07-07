'use client';

import { PageDetailView } from '@/components/page-magic/PageDetailView';
import { useParams } from 'next/navigation';

export default function PageDetailPage() {
  const params = useParams();
  const pageId = params.id as string;

  return <PageDetailView pageId={pageId} />;
}