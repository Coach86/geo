"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FeatureExampleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
}

export function FeatureExampleDialog({
  open,
  onOpenChange,
  feature,
}: FeatureExampleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{feature}</DialogTitle>
          <DialogDescription>
            Learn more about this feature and how it can help your brand.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Feature details and examples coming soon.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}