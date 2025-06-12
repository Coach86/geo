import { Card, CardContent } from "@/components/ui/card";
import { Calendar, RefreshCw } from "lucide-react";
import { ProjectResponse } from "@/lib/auth-api";
import { Button } from "@/components/ui/button";

interface ProjectMetadataProps {
  project: ProjectResponse;
  onRunAnalysis?: () => void;
  isAnalysisAllowed?: boolean;
  analysisDisabledReason?: string;
  runningAnalysis?: boolean;
}

export function ProjectMetadata({ 
  project,
  onRunAnalysis,
  isAnalysisAllowed = true,
  analysisDisabledReason,
  runningAnalysis = false
}: ProjectMetadataProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-white">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm flex-1">
            <div className="group cursor-default">
              <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1 group-hover:text-gray-700 transition-colors">
                Project ID
              </p>
              <p className="text-gray-700 font-mono text-xs bg-gray-100 px-2 py-1 rounded group-hover:bg-gray-200 transition-colors">
                {project.id}
              </p>
            </div>
            <div className="group cursor-default">
              <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1 group-hover:text-gray-700 transition-colors">
                Created
              </p>
              <p className="text-gray-700 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                <span className="group-hover:text-gray-900 transition-colors">
                  {formatDate(project.createdAt)}
                </span>
              </p>
            </div>
            <div className="group cursor-default">
              <p className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-1 group-hover:text-gray-700 transition-colors">
                Last Updated
              </p>
              <p className="text-gray-700 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 text-gray-400 group-hover:text-gray-600 group-hover:rotate-180 transition-all duration-500" />
                <span className="group-hover:text-gray-900 transition-colors">
                  {formatDate(project.updatedAt)}
                </span>
              </p>
            </div>
          </div>
          {onRunAnalysis && (
            <div className="ml-6">
              <Button
                onClick={onRunAnalysis}
                disabled={!isAnalysisAllowed || runningAnalysis}
                variant="default"
                size="default"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                title={analysisDisabledReason}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {runningAnalysis ? "Refreshing..." : "Manual Refresh"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
