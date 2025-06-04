import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";

interface EditableListProps {
  title: string;
  items: string[];
  onUpdate?: (items: string[]) => void;
  onEdit?: () => void;
  canAdd?: boolean;
  canExpand?: boolean;
  expandThreshold?: number;
  onAddClick?: () => void;
  isAtLimit?: boolean;
  limitMessage?: string;
  itemCount?: string;
  placeholder?: string;
  emptyMessage?: string;
  bgColor?: "gray" | "blue" | "purple";
  inputType?: "input" | "textarea";
  addButtonLabel?: string;
}

export function EditableList({
  title,
  items,
  onUpdate,
  onEdit,
  canAdd = true,
  canExpand = false,
  expandThreshold = 5,
  onAddClick,
  isAtLimit = false,
  limitMessage,
  itemCount,
  placeholder = "Enter new item...",
  emptyMessage = "No items defined",
  bgColor = "gray",
  inputType = "input",
  addButtonLabel = "Add Item",
}: EditableListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newItemValue, setNewItemValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEdit = (index: number, newValue: string) => {
    const updated = [...items];
    if (newValue.trim()) {
      updated[index] = newValue.trim();
    } else {
      updated.splice(index, 1);
    }
    
    if (onUpdate) {
      onUpdate(updated);
    } else if (onEdit) {
      onEdit();
    }
  };

  const handleAdd = () => {
    if (newItemValue.trim()) {
      const updated = [...items, newItemValue.trim()];
      if (onUpdate) {
        onUpdate(updated);
      } else if (onEdit) {
        onEdit();
      }
      setNewItemValue("");
      setIsAdding(false);
    }
  };

  const displayedItems = canExpand && !isExpanded ? items.slice(0, expandThreshold) : items;
  const hasMore = canExpand && items.length > expandThreshold;

  const bgColors = {
    gray: {
      normal: "bg-gray-50 hover:bg-gray-100",
      add: "bg-gray-50 border-gray-200",
      addHover: "hover:border-gray-400 hover:bg-gray-50",
    },
    blue: {
      normal: "bg-blue-50 hover:bg-blue-100",
      add: "bg-blue-50 border-blue-200",
      addHover: "hover:border-blue-400 hover:bg-blue-50",
    },
    purple: {
      normal: "bg-purple-50 hover:bg-purple-100",
      add: "bg-purple-50 border-purple-200",
      addHover: "hover:border-purple-400 hover:bg-purple-50",
    },
  };

  const colors = bgColors[bgColor];

  return (
    <div>
      <div className="flex items-center justify-between mb-3 min-h-[1.5rem]">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs hover:bg-gray-100"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <><ChevronUp className="h-3 w-3 mr-1" />Collapse</>
            ) : (
              <><ChevronDown className="h-3 w-3 mr-1" />Expand ({items.length})</>
            )}
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {items.length > 0 ? (
          displayedItems.map((item, index) => (
            <div
              key={index}
              className={`px-3 py-3 ${colors.normal} rounded-md text-sm text-gray-700 transition-colors cursor-pointer min-h-[2.75rem] flex items-center`}
              onClick={() => {
                if (onUpdate) {
                  setEditingIndex(index);
                  setEditingValue(item);
                }
              }}
            >
              {editingIndex === index ? (
                inputType === "textarea" ? (
                  <Textarea
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    autoFocus
                    className="min-h-[60px] resize-none"
                    onBlur={() => {
                      handleEdit(index, editingValue);
                      setEditingIndex(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={() => {
                      handleEdit(index, editingValue);
                      setEditingIndex(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEdit(index, editingValue);
                        setEditingIndex(null);
                      }
                    }}
                    autoFocus
                    className="h-8 px-2 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                )
              ) : (
                item
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400 italic px-3 py-3 min-h-[2.75rem] flex items-center">
            {emptyMessage}
          </p>
        )}
        
        {/* Add new item section */}
        {canAdd && (
          <>
            {isAdding ? (
              <div className={`p-3 ${colors.add} border-2 rounded-md`}>
                <div className="space-y-2">
                  {inputType === "textarea" ? (
                    <Textarea
                      value={newItemValue}
                      onChange={(e) => setNewItemValue(e.target.value)}
                      placeholder={placeholder}
                      autoFocus
                      className="min-h-[60px] resize-none"
                    />
                  ) : (
                    <Input
                      value={newItemValue}
                      onChange={(e) => setNewItemValue(e.target.value)}
                      placeholder={placeholder}
                      autoFocus
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAdd();
                        }
                      }}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAdd}
                      size="sm"
                      disabled={!newItemValue.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setIsAdding(false);
                        setNewItemValue("");
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    if (isAtLimit && onAddClick) {
                      onAddClick();
                    } else {
                      setIsAdding(true);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className={`w-full border-dashed border-gray-300 ${colors.addHover} transition-colors`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {addButtonLabel}
                  {isAtLimit && limitMessage && <span className="text-xs text-orange-600 ml-1">{limitMessage}</span>}
                </Button>
                
                {itemCount && (
                  <div className="text-xs text-gray-500 text-center">
                    {itemCount}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}