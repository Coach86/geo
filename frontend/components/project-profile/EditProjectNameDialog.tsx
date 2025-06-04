import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditProjectNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName?: string;
  brandName: string;
  onSave: (name: string) => Promise<void>;
}

export function EditProjectNameDialog({
  open,
  onOpenChange,
  currentName,
  brandName,
  onSave,
}: EditProjectNameDialogProps) {
  const [name, setName] = useState(currentName || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(name.trim());
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save project name:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project Name</DialogTitle>
          <DialogDescription>
            Customize the display name for your project. If not set, the brand name "{brandName}" will be used.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g., ${brandName} Q1 2025 Campaign`}
            />
            <p className="text-sm text-gray-500">
              Leave empty to use the brand name
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isSaving || !name}
          >
            Clear
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}