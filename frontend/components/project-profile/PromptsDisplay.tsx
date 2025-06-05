import { EditableList } from "./EditableList";

interface PromptsDisplayProps {
  prompts: string[];
  type: "visibility" | "alignment" | "sentiment";
  onUpdate?: (prompts: string[]) => void;
  canAdd?: boolean;
  maxPrompts?: number;
  onAddClick?: () => void;
}

export function PromptsDisplay({
  prompts,
  type,
  onUpdate,
  canAdd = false,
  maxPrompts,
  onAddClick,
}: PromptsDisplayProps) {
  const isAtLimit = maxPrompts ? prompts.length >= maxPrompts : false;
  
  const titles = {
    visibility: "Visibility Prompts",
    alignment: "Alignment Prompts",
    sentiment: "Sentiment Prompts",
  };

  const placeholders = {
    visibility: "Enter your new visibility prompt...",
    alignment: "Enter your new alignment prompt...",
    sentiment: "Enter your new sentiment prompt...",
  };

  const buttonLabels = {
    visibility: "Add Visibility Prompt",
    alignment: "Add Alignment Prompt",
    sentiment: "Add Sentiment Prompt",
  };

  return (
    <EditableList
      title={titles[type]}
      items={prompts}
      onUpdate={onUpdate}
      canAdd={canAdd && type === "visibility"}
      canExpand={true}
      expandThreshold={5}
      onAddClick={onAddClick}
      isAtLimit={isAtLimit}
      limitMessage="(Upgrade required)"
      itemCount={undefined}
      placeholder={placeholders[type]}
      emptyMessage={`No ${type} prompts defined`}
      bgColor="gray"
      inputType="textarea"
      addButtonLabel={buttonLabels[type]}
    />
  );
}