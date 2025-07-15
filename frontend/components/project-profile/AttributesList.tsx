import { useState, useEffect, useCallback } from "react";
import { ProjectResponse } from "@/lib/auth-api";
import { Button } from "@/components/ui/button";
import { ChevronRight, Settings, RefreshCw, AlertCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EditableList } from "./EditableList";

interface AttributesListProps {
  project: ProjectResponse;
  onEdit: () => void;
  onUpdate?: (attributes: string[]) => void;
  onRegeneratePrompts?: () => void;
}

export function AttributesList({ project, onEdit, onUpdate, onRegeneratePrompts }: AttributesListProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showRegenerateNotice, setShowRegenerateNotice] = useState(false);
  const [originalAttributes, setOriginalAttributes] = useState<string[]>([]);
  const maxAttributes = 5;
  const isAtLimit = project.keyBrandAttributes.length >= maxAttributes;
  const displayThreshold = 5;
  const displayedAttributes = project.keyBrandAttributes.slice(0, displayThreshold);
  const hiddenCount = Math.max(0, project.keyBrandAttributes.length - displayThreshold);

  // Track original attributes when drawer opens
  useEffect(() => {
    if (isDrawerOpen) {
      setOriginalAttributes([...project.keyBrandAttributes]);
      setShowRegenerateNotice(false);
    }
  }, [isDrawerOpen]);

  // Watch for changes to project.keyBrandAttributes while drawer is open
  useEffect(() => {
    if (isDrawerOpen && originalAttributes.length > 0) {
      const hasChanged = project.keyBrandAttributes.length !== originalAttributes.length ||
        !project.keyBrandAttributes.every((attr, index) => attr === originalAttributes[index]);
      
      if (hasChanged && !showRegenerateNotice) {
        setShowRegenerateNotice(true);
      }
    }
  }, [project.keyBrandAttributes, originalAttributes, isDrawerOpen, showRegenerateNotice]);
  
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
                className="px-3 py-3 bg-blue-50 rounded-md text-sm text-gray-700 min-h-[2.75rem] flex items-center"
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
            
            {/* Regeneration Notice */}
            {showRegenerateNotice && (
              <Alert className="mt-4 border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">Brand attributes have been updated</p>
                      <p className="text-sm mt-1">
                        Your alignment prompts should be regenerated to reflect the new attributes.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsDrawerOpen(false);
                        if (onRegeneratePrompts) {
                          onRegeneratePrompts();
                        }
                      }}
                      className="ml-4"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate Prompts
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}