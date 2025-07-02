import { useState } from "react";
import { ProjectResponse } from "@/lib/auth-api";
import { Button } from "@/components/ui/button";
import { ChevronRight, Settings } from "lucide-react";
import { useFavicon, extractDomain } from "@/hooks/use-favicon";
import { Favicon } from "@/components/ui/favicon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditableList } from "./EditableList";

interface CompetitorsListProps {
  project: ProjectResponse;
  onEdit: () => void;
  onUpdate?: (competitors: string[]) => void;
}

// Separate component for competitor favicon that uses the hook
function CompetitorFavicon({ website, name }: { website?: string; name: string }) {
  const domain = website ? extractDomain(website) : null;
  const { faviconUrl } = useFavicon(domain);
  
  if (!domain || !faviconUrl) return null;
  
  return (
    <Favicon 
      src={faviconUrl} 
      alt={`${name} favicon`}
      className="w-4 h-4"
      fallbackClassName="w-4 h-4 text-gray-400"
    />
  );
}

export function CompetitorsList({ project, onEdit, onUpdate }: CompetitorsListProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const maxCompetitors = 5;
  const isAtLimit = project.competitors.length >= maxCompetitors;
  const displayThreshold = 5;
  
  // Create a map of competitor details for easy lookup
  const detailsMap = new Map(
    (project.competitorDetails || []).map(detail => [detail.name, detail])
  );
  
  // Get displayed competitors with their details
  const displayedCompetitors = project.competitors.slice(0, displayThreshold).map(name => ({
    name,
    detail: detailsMap.get(name)
  }));
  
  const hiddenCount = Math.max(0, project.competitors.length - displayThreshold);
  
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Competitors</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs hover:bg-gray-100"
            onClick={() => setIsDrawerOpen(true)}
          >
            <Settings className="h-3 w-3 mr-1" />
            Manage
          </Button>
        </div>
        
        {/* Display first 5 competitors */}
        <div className="space-y-2">
          {displayedCompetitors.length > 0 ? (
            displayedCompetitors.map(({ name, detail }, index) => (
              <div
                key={index}
                className="px-3 py-3 bg-gray-50 rounded-md text-sm text-gray-700 min-h-[2.75rem] flex items-center gap-2"
              >
                <CompetitorFavicon website={detail?.website} name={name} />
                <span>{name}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic px-3 py-3 min-h-[2.75rem] flex items-center">
              No competitors defined
            </p>
          )}
          
          {/* Show hidden count */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors flex items-center"
            >
              <ChevronRight className="h-3 w-3 mr-1" />
              {hiddenCount} more
            </button>
          )}
        </div>
      </div>

      {/* Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Competitors</SheetTitle>
            <SheetDescription>
              Manage your competitors. You can add, edit, or remove competitors (maximum {maxCompetitors}).
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Item count */}
            <div className="text-sm text-gray-600">
              {project.competitors.length}/{maxCompetitors} competitors
            </div>
            
            {/* Use EditableList for displaying and editing functionality */}
            <EditableList
              title=""
              items={project.competitors}
              onUpdate={onUpdate}
              onEdit={onEdit}
              canAdd={true}
              canExpand={false}
              placeholder="Enter competitor name..."
              emptyMessage="No competitors defined"
              bgColor="gray"
              inputType="input"
              addButtonLabel="Add Competitor"
              isAtLimit={isAtLimit}
              limitMessage="(Max 5)"
              itemCount=""
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}