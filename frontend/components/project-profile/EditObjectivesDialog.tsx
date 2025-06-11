import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Target } from "lucide-react";

interface EditObjectivesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentObjectives?: string;
  brandName: string;
  onSave: (objectives: string) => void;
}

export function EditObjectivesDialog({
  open,
  onOpenChange,
  currentObjectives = "",
  brandName,
  onSave,
}: EditObjectivesDialogProps) {
  const [objectives, setObjectives] = useState(currentObjectives);

  // Update the local state when currentObjectives prop changes
  useEffect(() => {
    setObjectives(currentObjectives);
  }, [currentObjectives]);

  const handleSave = () => {
    onSave(objectives);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setObjectives(currentObjectives);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <DialogTitle>Edit Project Objectives</DialogTitle>
          </div>
          <DialogDescription>
            Define what you want to track and monitor for {brandName} in this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="objectives">Project Objectives</Label>
            <Textarea
              id="objectives"
              placeholder="Enter project objectives (e.g., 'Monitor performance of subsidiary company ABC', 'Track sentiment for product line XYZ', 'Follow competitive positioning in the European market', 'Analyze brand perception after Q4 campaign launch')"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              className="min-h-[150px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Specify what aspects of {brandName} you want to track, monitor, or analyze in this project.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save objectives</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}