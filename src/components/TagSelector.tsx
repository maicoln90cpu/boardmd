import React, { useState } from "react";
import { Check, Plus, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTags, TAG_PRESET_COLORS } from "@/hooks/useTags";
import { cn } from "@/lib/utils";

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  disabled = false,
}) => {
  const { tags, addTag, getTagColor } = useTags();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_PRESET_COLORS[0].value);

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const result = await addTag(newTagName.trim(), selectedColor);
    if (result) {
      // Automatically select the new tag
      if (!selectedTags.includes(result.name)) {
        onTagsChange([...selectedTags, result.name]);
      }
      setNewTagName("");
      setIsCreating(false);
      setSelectedColor(TAG_PRESET_COLORS[0].value);
    }
  };

  const handleRemoveTag = (tagName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsChange(selectedTags.filter((t) => t !== tagName));
  };

  return (
    <div className="space-y-2">
      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tagName) => (
            <Badge
              key={tagName}
              variant="secondary"
              className="gap-1 pr-1 text-white"
              style={{ backgroundColor: getTagColor(tagName) }}
            >
              {tagName}
              <button
                type="button"
                onClick={(e) => handleRemoveTag(tagName, e)}
                className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="w-full justify-between text-muted-foreground"
          >
            <span>Selecionar tags...</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-64 p-2 bg-popover border shadow-lg z-50" 
          align="start"
          sideOffset={4}
        >
          {/* Create new tag section */}
          {isCreating ? (
            <div className="space-y-2 p-2 border-b mb-2">
              <Input
                placeholder="Nome da tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                  if (e.key === "Escape") {
                    setIsCreating(false);
                    setNewTagName("");
                  }
                }}
              />
              
              {/* Color picker */}
              <div className="flex flex-wrap gap-1.5">
                {TAG_PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      selectedColor === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>

              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                >
                  Criar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setIsCreating(false);
                    setNewTagName("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-primary mb-2"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4" />
              Criar nova tag
            </Button>
          )}

          {/* Existing tags list */}
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {tags.length === 0 && !isCreating ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma tag criada ainda
              </p>
            ) : (
              tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                      isSelected
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => handleToggleTag(tag.name)}
                  >
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 truncate">{tag.name}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
