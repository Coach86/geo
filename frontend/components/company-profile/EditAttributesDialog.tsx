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
import { Plus, X } from 'lucide-react';

interface EditAttributesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attributes: string[];
  brandName: string;
  onSave: (attributes: string[]) => Promise<void>;
}

export function EditAttributesDialog({ 
  open, 
  onOpenChange, 
  attributes, 
  brandName, 
  onSave 
}: EditAttributesDialogProps) {
  const [editingAttributes, setEditingAttributes] = useState<string[]>(attributes);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const filteredAttributes = editingAttributes.filter(attr => attr.trim() !== "");
      await onSave(filteredAttributes);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save attributes:", error);
      alert("Failed to save attributes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Key Brand Attributes</DialogTitle>
          <DialogDescription>
            Add, edit, or remove brand attributes for {brandName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {editingAttributes.map((attribute, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={attribute}
                onChange={(e) => {
                  const newAttributes = [...editingAttributes];
                  newAttributes[index] = e.target.value;
                  setEditingAttributes(newAttributes);
                }}
                placeholder="Enter attribute"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingAttributes(editingAttributes.filter((_, i) => i !== index));
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingAttributes([...editingAttributes, ""])}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Attribute
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