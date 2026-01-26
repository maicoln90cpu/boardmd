import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface CourseFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  onClearFilters: () => void;
}

const statuses = [
  { value: "all", label: "Todos Status" },
  { value: "not_started", label: "Não Iniciado" },
  { value: "in_progress", label: "Em Progresso" },
  { value: "completed", label: "Concluído" },
  { value: "paused", label: "Pausado" },
];

const categories = [
  { value: "all", label: "Todas Categorias" },
  { value: "programacao", label: "💻 Programação" },
  { value: "design", label: "🎨 Design" },
  { value: "marketing", label: "📈 Marketing" },
  { value: "negocios", label: "💼 Negócios" },
  { value: "idiomas", label: "🌍 Idiomas" },
  { value: "desenvolvimento_pessoal", label: "🧠 Desenvolvimento Pessoal" },
  { value: "financas", label: "💰 Finanças" },
  { value: "saude", label: "🏃 Saúde" },
  { value: "musica", label: "🎵 Música" },
  { value: "fotografia", label: "📷 Fotografia" },
  { value: "outro", label: "📚 Outro" },
];

const priorities = [
  { value: "all", label: "Todas Prioridades" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

export function CourseFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  priorityFilter,
  onPriorityChange,
  onClearFilters,
}: CourseFiltersProps) {
  const hasActiveFilters = 
    searchTerm || 
    statusFilter !== "all" || 
    categoryFilter !== "all" || 
    priorityFilter !== "all";

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cursos..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={onClearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
