import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Maximize2 } from "lucide-react";

interface DailySortControlsProps {
  sortOption: "time" | "name" | "priority";
  onSortChange: (value: "time" | "name" | "priority") => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (value: "asc" | "desc") => void;
  densityMode?: "comfortable" | "compact" | "ultra-compact";
  onDensityChange?: (value: "comfortable" | "compact" | "ultra-compact") => void;
}

export function DailySortControls({ 
  sortOption, 
  onSortChange, 
  sortOrder, 
  onSortOrderChange,
  densityMode = "comfortable",
  onDensityChange
}: DailySortControlsProps) {
  return (
    <div className="flex items-center gap-2 flex-nowrap">
      <Select value={sortOption} onValueChange={onSortChange}>
        <SelectTrigger className="w-[96px] md:w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="time">Horário</SelectItem>
          <SelectItem value="name">Nome</SelectItem>
          <SelectItem value="priority">Prioridade</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortOrder} onValueChange={onSortOrderChange}>
        <SelectTrigger className="w-[84px] md:w-[140px]">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">Crescente</SelectItem>
          <SelectItem value="desc">Decrescente</SelectItem>
        </SelectContent>
      </Select>

      {onDensityChange && (
        <Select value={densityMode} onValueChange={onDensityChange}>
          <SelectTrigger className="w-[96px] md:w-[160px]">
            <Maximize2 className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="comfortable">Confortável</SelectItem>
            <SelectItem value="compact">Compacto</SelectItem>
            <SelectItem value="ultra-compact">Ultra</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
