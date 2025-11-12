import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

interface DailySortControlsProps {
  sortOption: "time" | "name" | "priority";
  onSortChange: (value: "time" | "name" | "priority") => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (value: "asc" | "desc") => void;
}

export function DailySortControls({ 
  sortOption, 
  onSortChange, 
  sortOrder, 
  onSortOrderChange 
}: DailySortControlsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={sortOption} onValueChange={onSortChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="time">Horário</SelectItem>
          <SelectItem value="name">Nome</SelectItem>
          <SelectItem value="priority">Prioridade</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortOrder} onValueChange={onSortOrderChange}>
        <SelectTrigger className="w-[140px]">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">Crescente</SelectItem>
          <SelectItem value="desc">Decrescente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
