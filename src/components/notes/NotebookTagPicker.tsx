import { useState } from "react";
import { NotebookTag } from "@/hooks/useNotebooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Tag, X, Check } from "lucide-react";

interface NotebookTagPickerProps {
  tags: NotebookTag[];
  availableTags: NotebookTag[];
  onAddTag: (tag: NotebookTag) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag?: (tag: NotebookTag) => void;
}

const TAG_COLORS = [
  { name: "Vermelho", value: "#ef4444" },
  { name: "Laranja", value: "#f97316" },
  { name: "Âmbar", value: "#f59e0b" },
  { name: "Verde", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Índigo", value: "#6366f1" },
  { name: "Roxo", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Cinza", value: "#6b7280" },
];

export function NotebookTagPicker({
  tags,
  availableTags,
  onAddTag,
  onRemoveTag,
  onCreateTag,
}: NotebookTagPickerProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[5].value);

  const unusedTags = availableTags.filter(
    (availableTag) => !tags.some((t) => t.id === availableTag.id)
  );

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;

    const newTag: NotebookTag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newTagName.trim(),
      color: newTagColor,
    };

    if (onCreateTag) {
      onCreateTag(newTag);
    }
    onAddTag(newTag);
    
    setNewTagName("");
    setNewTagColor(TAG_COLORS[5].value);
    setIsCreating(false);
  };

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="flex items-center gap-1 pr-1"
          style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: tag.color }}
        >
          <span className="text-xs">{tag.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveTag(tag.id);
            }}
            className="hover:bg-black/10 rounded p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Tag className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          {!isCreating ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Adicionar tag
              </p>
              
              {unusedTags.length > 0 && (
                <div className="space-y-1">
                  {unusedTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        onAddTag(tag);
                        setOpen(false);
                      }}
                      className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-accent text-left"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm">{tag.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-3 w-3 mr-2" />
                Criar nova tag
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Criar nova tag
              </p>
              
              <Input
                placeholder="Nome da tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="h-8"
                autoFocus
              />

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Cor</p>
                <div className="flex flex-wrap gap-1">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewTagColor(color.value)}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {newTagColor === color.value && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setIsCreating(false);
                    setNewTagName("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                >
                  Criar
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Componente de filtro por tag
export function NotebookTagFilter({
  allTags,
  selectedTagId,
  onSelectTag,
}: {
  allTags: NotebookTag[];
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
}) {
  if (allTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      <button
        onClick={() => onSelectTag(null)}
        className={`text-xs px-2 py-1 rounded-full transition-colors ${
          selectedTagId === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted hover:bg-muted/80"
        }`}
      >
        Todas
      </button>
      {allTags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelectTag(tag.id)}
          className={`text-xs px-2 py-1 rounded-full transition-colors flex items-center gap-1 ${
            selectedTagId === tag.id
              ? "ring-2 ring-offset-1"
              : "hover:opacity-80"
          }`}
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
            borderColor: tag.color,
            ...(selectedTagId === tag.id && { ringColor: tag.color }),
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          {tag.name}
        </button>
      ))}
    </div>
  );
}
