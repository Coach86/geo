import { ProjectResponse } from "@/lib/auth-api";
import { EditableList } from "./EditableList";

interface AttributesListProps {
  project: ProjectResponse;
  onEdit: () => void;
  onUpdate?: (attributes: string[]) => void;
}

export function AttributesList({ project, onEdit, onUpdate }: AttributesListProps) {
  return (
    <EditableList
      title="Key Brand Attributes"
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
    />
  );
}