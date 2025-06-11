import { ProjectResponse } from "@/lib/auth-api";
import { EditableList } from "./EditableList";

interface CompetitorsListProps {
  project: ProjectResponse;
  onEdit: () => void;
  onUpdate?: (competitors: string[]) => void;
}

export function CompetitorsList({ project, onEdit, onUpdate }: CompetitorsListProps) {
  const maxCompetitors = 5;
  const isAtLimit = project.competitors.length >= maxCompetitors;
  
  return (
    <EditableList
      title="Competitors"
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
      itemCount={`${project.competitors.length}/${maxCompetitors} competitors`}
    />
  );
}