import { useState } from "react";
import { ProjectResponse } from "@/lib/auth-api";
import { Button } from "@/components/ui/button";
import { ChevronRight, Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditableList } from "./EditableList";

interface AttributesListProps {
  project: ProjectResponse;
  onEdit: () => void;
  onUpdate?: (attributes: string[]) => void;
}

export function AttributesList({ project, onEdit, onUpdate }: AttributesListProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const maxAttributes = 5;
  const isAtLimit = project.keyBrandAttributes.length >= maxAttributes;
  const displayThreshold = 5;
  const displayedAttributes = project.keyBrandAttributes.slice(0, displayThreshold);
  const hiddenCount = Math.max(0, project.keyBrandAttributes.length - displayThreshold);
  
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Key Brand Attributes</h3>
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
        
        {/* Display first 5 attributes */}
        <div className="space-y-2">
          {displayedAttributes.length > 0 ? (
            displayedAttributes.map((attribute, index) => (
              <div
                key={index}
                className="px-3 py-3 bg-blue-50 hover:bg-blue-100 rounded-md text-sm text-gray-700 transition-colors min-h-[2.75rem] flex items-center"
              >
                {attribute}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic px-3 py-3 min-h-[2.75rem] flex items-center">
              No brand attributes defined
            </p>
          )}
          
          {/* Show hidden count */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-blue-50 rounded-md transition-colors flex items-center"
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
            <SheetTitle>Key Brand Attributes</SheetTitle>
            <SheetDescription>
              Manage your brand attributes. You can add, edit, or remove attributes (maximum {maxAttributes}).
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            <EditableList
              title=""
              items={project.keyBrandAttributes}
              onUpdate={onUpdate}
              onEdit={onEdit}
              canAdd={true}
              canExpand={false}
              placeholder="Enter brand attribute..."
              emptyMessage="No brand attributes defined"
              bgColor="blue"
              inputType="input"
              addButtonLabel="Add Attribute"
              isAtLimit={isAtLimit}
              limitMessage="(Max 5)"
              itemCount={`${project.keyBrandAttributes.length}/${maxAttributes} attributes`}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}