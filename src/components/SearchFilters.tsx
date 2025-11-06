import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SearchFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  tagFilter: string;
  onTagChange: (value: string) => void;
  categoryFilter?: string;
  onCategoryChange?: (value: string) => void;
  availableTags: string[];
  categories?: Array<{ id: string; name: string }>;
  onClearFilters: () => void;
  sortOption: string;
  onSortChange: (value: string) => void;
  viewMode?: string;
  displayMode?: string;
  onDisplayModeChange?: (value: string) => void;
  dailySortOption?: string;
  onDailySortChange?: (value: "time" | "name" | "priority") => void;
  dailySortOrder?: string;
  onDailySortOrderChange?: (value: "asc" | "desc") => void;
}

export function SearchFilters({
  searchTerm,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  tagFilter,
  onTagChange,
  categoryFilter,
  onCategoryChange,
  availableTags,
  categories,
  onClearFilters,
  sortOption,
  onSortChange,
  viewMode,
  displayMode,
  onDisplayModeChange,
  dailySortOption,
  onDailySortChange,
  dailySortOrder,
  onDailySortOrderChange,
}: SearchFiltersProps) {
  const hasActiveFilters = searchTerm || priorityFilter !== "all" || tagFilter !== "all" || 
    (categoryFilter && categoryFilter !== "all") || sortOption !== "manual";

  return (
    <div className="flex items-center gap-3 p-4 bg-card border-b">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar tarefas..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={priorityFilter} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="medium">Média</SelectItem>
          <SelectItem value="low">Baixa</SelectItem>
        </SelectContent>
      </Select>

      <Select value={tagFilter} onValueChange={onTagChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Tag" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {availableTags.map((tag) => (
            <SelectItem key={tag} value={tag}>
              {tag}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {viewMode === "all" && categories && onCategoryChange && (
        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {viewMode === "all" && displayMode && onDisplayModeChange && (
        <Select value={displayMode} onValueChange={onDisplayModeChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Exibição" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="by_category">Por categoria</SelectItem>
            <SelectItem value="all_tasks">Todas as tarefas</SelectItem>
          </SelectContent>
        </Select>
      )}

      {viewMode === "daily" && dailySortOption && onDailySortChange && dailySortOrder && onDailySortOrderChange && (
        <>
          <Select value={dailySortOption} onValueChange={onDailySortChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">⏰ Horário</SelectItem>
              <SelectItem value="name">📝 Nome</SelectItem>
              <SelectItem value="priority">🎯 Prioridade</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDailySortOrderChange(dailySortOrder === "asc" ? "desc" : "asc")}
            className="gap-2"
          >
            {dailySortOrder === "asc" ? "↑ Crescente" : "↓ Decrescente"}
          </Button>
        </>
      )}

      {viewMode === "all" && (
        <Select value={sortOption} onValueChange={onSortChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Ordem Manual</SelectItem>
            <SelectItem value="date_asc">Data (Crescente)</SelectItem>
            <SelectItem value="date_desc">Data (Decrescente)</SelectItem>
            <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
            <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
            <SelectItem value="priority_asc">Prioridade (Baixa-Alta)</SelectItem>
            <SelectItem value="priority_desc">Prioridade (Alta-Baixa)</SelectItem>
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      )}
    </div>
  );
}
