import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

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
  searchInputRef?: React.RefObject<HTMLInputElement>;
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
  searchInputRef,
}: SearchFiltersProps) {
  const hasActiveFilters = searchTerm || priorityFilter !== "all" || tagFilter !== "all" || 
    (categoryFilter && categoryFilter !== "all") || sortOption !== "manual";
  const isMobile = useIsMobile();

  // Renderizar filtros (conteúdo compartilhado)
  const renderFilters = () => (
    <>
      <Select value={priorityFilter} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-full min-h-[48px]">
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
        <SelectTrigger className="w-full min-h-[48px]">
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
          <SelectTrigger className="w-full min-h-[48px]">
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
          <SelectTrigger className="w-full min-h-[48px]">
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
            <SelectTrigger className="w-full min-h-[48px]">
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
            size="default"
            onClick={() => onDailySortOrderChange(dailySortOrder === "asc" ? "desc" : "asc")}
            className="gap-2 min-h-[48px] w-full"
          >
            {dailySortOrder === "asc" ? "↑ Crescente" : "↓ Decrescente"}
          </Button>
        </>
      )}

      {viewMode === "all" && (
        <Select value={sortOption} onValueChange={onSortChange}>
          <SelectTrigger className="w-full min-h-[48px]">
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
        <Button variant="ghost" size="default" onClick={onClearFilters} className="min-h-[48px] w-full">
          <X className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      )}
    </>
  );

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-card border-b">
      <div className="relative flex-1 max-w-full sm:max-w-md min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Buscar tarefas..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 min-h-[48px]"
        />
      </div>

      {/* Mobile: Botão de filtros em Sheet */}
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2 min-h-[48px]">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  !
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Filtros e Ordenação</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-3 mt-4 overflow-y-auto max-h-[calc(85vh-100px)]">
              {renderFilters()}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop: Filtros inline */
        <div className="flex flex-wrap items-center gap-2">
          {renderFilters()}
        </div>
      )}
    </div>
  );
}
