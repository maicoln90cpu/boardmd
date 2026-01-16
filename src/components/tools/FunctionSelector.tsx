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
import { useToolFunctions, FUNCTION_PRESET_COLORS } from "@/hooks/useToolFunctions";
import { cn } from "@/lib/utils";

interface FunctionSelectorProps {
  selectedFunctionIds: string[];
  onFunctionsChange: (functionIds: string[]) => void;
  disabled?: boolean;
}

export const FunctionSelector: React.FC<FunctionSelectorProps> = ({
  selectedFunctionIds,
  onFunctionsChange,
  disabled = false,
}) => {
  const { functions, addFunction, getFunctionById } = useToolFunctions();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState("");
  const [selectedColor, setSelectedColor] = useState(FUNCTION_PRESET_COLORS[0].value);

  const handleToggleFunction = (functionId: string) => {
    if (selectedFunctionIds.includes(functionId)) {
      onFunctionsChange(selectedFunctionIds.filter((id) => id !== functionId));
    } else {
      onFunctionsChange([...selectedFunctionIds, functionId]);
    }
  };

  const handleCreateFunction = async () => {
    if (!newFunctionName.trim()) return;

    const result = await addFunction(newFunctionName.trim(), selectedColor);
    if (result) {
      // Automatically select the new function
      if (!selectedFunctionIds.includes(result.id)) {
        onFunctionsChange([...selectedFunctionIds, result.id]);
      }
      setNewFunctionName("");
      setIsCreating(false);
      setSelectedColor(FUNCTION_PRESET_COLORS[0].value);
    }
  };

  const handleRemoveFunction = (functionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onFunctionsChange(selectedFunctionIds.filter((id) => id !== functionId));
  };

  const getSelectedFunctionData = (functionId: string) => {
    return getFunctionById(functionId);
  };

  return (
    <div className="space-y-2">
      {/* Selected functions display */}
      {selectedFunctionIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedFunctionIds.map((functionId) => {
            const func = getSelectedFunctionData(functionId);
            if (!func) return null;
            return (
              <Badge
                key={functionId}
                variant="secondary"
                className="gap-1 pr-1 text-white"
                style={{ backgroundColor: func.color || "#6B7280" }}
              >
                {func.name}
                <button
                  type="button"
                  onClick={(e) => handleRemoveFunction(functionId, e)}
                  className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
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
            <span>Selecionar funções...</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-2 bg-popover border shadow-lg z-50"
          align="start"
          sideOffset={4}
        >
          {/* Create new function section */}
          {isCreating ? (
            <div className="space-y-2 p-2 border-b mb-2">
              <Input
                placeholder="Nome da função..."
                value={newFunctionName}
                onChange={(e) => setNewFunctionName(e.target.value.slice(0, 50))}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateFunction();
                  }
                  if (e.key === "Escape") {
                    setIsCreating(false);
                    setNewFunctionName("");
                  }
                }}
              />

              {/* Color picker */}
              <div className="flex flex-wrap gap-1.5">
                {FUNCTION_PRESET_COLORS.map((color) => (
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
                  onClick={handleCreateFunction}
                  disabled={!newFunctionName.trim()}
                >
                  Criar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setIsCreating(false);
                    setNewFunctionName("");
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
              Criar nova função
            </Button>
          )}

          {/* Existing functions list */}
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {functions.length === 0 && !isCreating ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma função criada ainda
              </p>
            ) : (
              functions.map((func) => {
                const isSelected = selectedFunctionIds.includes(func.id);
                return (
                  <button
                    key={func.id}
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                      isSelected ? "bg-accent" : "hover:bg-accent/50"
                    )}
                    onClick={() => handleToggleFunction(func.id)}
                  >
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: func.color || "#6B7280" }}
                    />
                    <span className="flex-1 truncate">{func.name}</span>
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
