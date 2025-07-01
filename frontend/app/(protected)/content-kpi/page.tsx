'use client';

import { useNavigation } from '@/providers/navigation-provider';
import { ContentKPIDashboard } from '@/components/content-kpi/ContentKPIDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function ContentKPIPage() {
  const { selectedProject } = useNavigation();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Content KPI Analysis
        </h1>
        <p className="text-muted-foreground">
          Analyze your website content for SEO and AI visibility optimization
        </p>
      </div>

      {/* Main Content */}
      {selectedProject ? (
        <ContentKPIDashboard projectId={selectedProject.id} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No project selected</p>
            <p className="text-sm text-muted-foreground">
              Select a project from the sidebar to view content KPI analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}