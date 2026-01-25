import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface MultiSelectFilterOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
}

interface MultiSelectFilterProps {
  options: MultiSelectFilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
}

export function MultiSelectFilter({
  options,
  selectedValues,
  onChange,
  placeholder = "Selecionar",
  allLabel = "Todas",
  className,
}: MultiSelectFilterProps) {
  const isAllSelected = selectedValues.length === 0 || selectedValues.includes("all");
  
  const handleToggle = (value: string) => {
    if (value === "all") {
      // Selecionar "todas" limpa a seleção
      onChange([]);
      return;
    }
    
    // Remove "all" se estava selecionado e está adicionando filtro específico
    let newValues = selectedValues.filter(v => v !== "all");
    
    if (newValues.includes(value)) {
      newValues = newValues.filter(v => v !== value);
    } else {
      newValues = [...newValues, value];
    }
    
    // Se nenhum selecionado, volta para "all"
    if (newValues.length === 0) {
      onChange([]);
    } else {
      onChange(newValues);
    }
  };
  
  const handleSelectAll = () => {
    onChange([]);
  };
  
  // Texto do botão
  const getButtonText = () => {
    if (isAllSelected) return allLabel;
    if (selectedValues.length === 1) {
      const option = options.find(o => o.value === selectedValues[0]);
      return option ? `${option.icon || ""} ${option.label}`.trim() : selectedValues[0];
    }
    return `${selectedValues.length} selecionados`;
  };
  
  const hasActiveFilters = selectedValues.length > 0 && !selectedValues.includes("all");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full md:w-[160px] h-10 justify-between",
            hasActiveFilters && "border-primary/50 bg-primary/5",
            className
          )}
        >
          <span className="truncate">{getButtonText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <div className="flex flex-col gap-1">
          {/* Opção "Todas" */}
          <label
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent transition-colors",
              isAllSelected && "bg-accent"
            )}
          >
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm">{allLabel}</span>
          </label>
          
          <div className="h-px bg-border my-1" />
          
          {/* Opções individuais */}
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent transition-colors",
                  isSelected && "bg-accent"
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(option.value)}
                />
                <span className="text-sm flex items-center gap-1">
                  {option.icon && <span>{option.icon}</span>}
                  {option.color && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}