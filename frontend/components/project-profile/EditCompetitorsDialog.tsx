import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface EditCompetitorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitors: string[];
  brandName: string;
  onSave: (competitors: string[]) => Promise<void>;
}

export function EditCompetitorsDialog({
  open,
  onOpenChange,
  competitors,
  brandName,
  onSave,
}: EditCompetitorsDialogProps) {
  const [editingCompetitors, setEditingCompetitors] =
    useState<string[]>(competitors);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const filteredCompetitors = editingCompetitors.filter(
        (comp) => comp.trim() !== ""
      );
      await onSave(filteredCompetitors);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save competitors:", error);
      alert("Failed to save competitors. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Competitors</DialogTitle>
          <DialogDescription>
            Add, edit, or remove competitors for {brandName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {editingCompetitors.map((competitor, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={competitor}
                onChange={(e) => {
                  const newCompetitors = [...editingCompetitors];
                  newCompetitors[index] = e.target.value;
                  setEditingCompetitors(newCompetitors);
                }}
                placeholder="Enter competitor name"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingCompetitors(
                    editingCompetitors.filter((_, i) => i !== index)
                  );
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingCompetitors([...editingCompetitors, ""])}
            className="w-full"
            disabled={editingCompetitors.length >= 5}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Competitor
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
