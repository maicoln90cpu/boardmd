import { useState } from "react";
import { Sparkles, Plus, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAISubtasks } from "@/hooks/useAISubtasks";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface AISubtasksSuggesterProps {
  taskTitle: string;
  taskDescription?: string;
  existingSubtasks: Subtask[];
  onAddSubtasks: (subtasks: Subtask[]) => void;
  disabled?: boolean;
}

export function AISubtasksSuggester({
  taskTitle,
  taskDescription,
  existingSubtasks,
  onAddSubtasks,
  disabled = false,
}: AISubtasksSuggesterProps) {
  const { isLoading, suggestions, generateSubtasks, clearSuggestions, suggestionsToSubtasks } = useAISubtasks();
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    setSelectedSuggestions(new Set());
    await generateSubtasks(taskTitle, taskDescription);
  };

  const toggleSuggestion = (suggestion: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(suggestion)) {
      newSelected.delete(suggestion);
    } else {
      newSelected.add(suggestion);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleAddSelected = () => {
    if (selectedSuggestions.size === 0) return;

    const newSubtasks = suggestionsToSubtasks(Array.from(selectedSuggestions));
    onAddSubtasks([...existingSubtasks, ...newSubtasks]);
    clearSuggestions();
    setSelectedSuggestions(new Set());
  };

  const handleAddAll = () => {
    const newSubtasks = suggestionsToSubtasks(suggestions);
    onAddSubtasks([...existingSubtasks, ...newSubtasks]);
    clearSuggestions();
    setSelectedSuggestions(new Set());
  };

  const handleDismiss = () => {
    clearSuggestions();
    setSelectedSuggestions(new Set());
  };

  // Don't show if title is too short
  if (!taskTitle || taskTitle.trim().length < 3) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Generate button */}
      {suggestions.length === 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={disabled || isLoading}
          className="gap-2 text-primary border-primary/30 hover:bg-primary/5"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando sugestões...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Sugerir subtarefas com IA
            </>
          )}
        </Button>
      )}

      {/* Suggestions list */}
      {suggestions.length > 0 && (
        <div className="p-3 rounded-lg border bg-primary/5 border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Sugestões de IA</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {suggestions.map((suggestion, index) => {
              const isSelected = selectedSuggestions.has(suggestion);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleSuggestion(suggestion)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors",
                    isSelected
                      ? "bg-primary/20 text-primary-foreground border border-primary"
                      : "bg-background hover:bg-muted border border-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className={cn(isSelected && "font-medium")}>
                    {suggestion}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              type="button"
              size="sm"
              onClick={handleAddSelected}
              disabled={selectedSuggestions.size === 0}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              Adicionar selecionadas ({selectedSuggestions.size})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddAll}
            >
              Adicionar todas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
