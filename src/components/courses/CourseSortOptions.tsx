import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

export type CourseSortOption = 
  | "name_asc" 
  | "name_desc" 
  | "progress_asc" 
  | "progress_desc"
  | "started_at_asc"
  | "started_at_desc"
  | "priority_asc"
  | "priority_desc"
  | "updated_at_desc";

interface CourseSortOptionsProps {
  value: CourseSortOption;
  onChange: (value: CourseSortOption) => void;
}

const sortOptions: { value: CourseSortOption; label: string }[] = [
  { value: "updated_at_desc", label: "Mais recentes" },
  { value: "name_asc", label: "Nome (A-Z)" },
  { value: "name_desc", label: "Nome (Z-A)" },
  { value: "progress_desc", label: "Maior progresso" },
  { value: "progress_asc", label: "Menor progresso" },
  { value: "started_at_desc", label: "Início (mais recente)" },
  { value: "started_at_asc", label: "Início (mais antigo)" },
  { value: "priority_desc", label: "Prioridade (alta → baixa)" },
  { value: "priority_asc", label: "Prioridade (baixa → alta)" },
];

export function CourseSortOptions({ value, onChange }: CourseSortOptionsProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CourseSortOption)}>
      <SelectTrigger className="w-[180px]">
        <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Ordenar por" />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
