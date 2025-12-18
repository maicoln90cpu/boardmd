import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryFilter } from "@/components/CategoryFilter";
import { FilterPresetsManager } from "./FilterPresetsManager";
import { FilterPreset } from "@/hooks/useFilterPresets";

interface KanbanFiltersBarProps {
  // Filtros básicos
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  tagFilter: string;
  onTagChange: (value: string) => void;
  availableTags: string[];
  onClearFilters: () => void;
  
  // Props opcionais para Projetos
  categoryFilter?: string[];
  onCategoryChange?: (value: string[]) => void;
  categories?: Array<{ id: string; name: string }>;
  tasks?: Array<{ category_id: string }>;
  displayMode?: string;
  onDisplayModeChange?: (value: string) => void;
  
  // Controles de busca
  searchInputRef?: React.RefObject<HTMLInputElement>;
  searchPlaceholder?: string;
  
  // Controle de presets
  showPresets?: boolean;
  sortOption?: string;
}

export function KanbanFiltersBar({
  searchTerm,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  tagFilter,
  onTagChange,
  availableTags,
  onClearFilters,
  categoryFilter,
  onCategoryChange,
  categories,
  tasks = [],
  displayMode,
  onDisplayModeChange,
  searchInputRef,
  searchPlaceholder = "Buscar tarefas...",
  showPresets = true,
  sortOption,
}: KanbanFiltersBarProps) {
  const isMobile = useIsMobile();
  
  const hasActiveFilters = searchTerm || 
    priorityFilter !== "all" || 
    tagFilter !== "all" || 
    (categoryFilter && categoryFilter.length > 0 && categoryFilter.length < (categories?.length || 0));

  // Aplicar preset de filtros
  const handleApplyPreset = (filters: FilterPreset["filters"]) => {
    if (filters.searchTerm !== undefined) onSearchChange(filters.searchTerm);
    if (filters.priorityFilter !== undefined) onPriorityChange(filters.priorityFilter);
    if (filters.tagFilter !== undefined) onTagChange(filters.tagFilter);
    if (filters.categoryFilter !== undefined && onCategoryChange) {
      onCategoryChange(filters.categoryFilter);
    }
    if (filters.displayMode !== undefined && onDisplayModeChange) {
      onDisplayModeChange(filters.displayMode);
    }
  };

  // Filtros atuais para salvar em preset
  const currentFilters: FilterPreset["filters"] = {
    searchTerm: searchTerm || undefined,
    priorityFilter: priorityFilter !== "all" ? priorityFilter : undefined,
    tagFilter: tagFilter !== "all" ? tagFilter : undefined,
    categoryFilter: categoryFilter?.length ? categoryFilter : undefined,
    displayMode: displayMode || undefined,
    sortOption: sortOption || undefined,
  };

  // Conteúdo dos filtros - compartilhado entre desktop e mobile
  const renderFiltersContent = () => (
    <>
      {/* Prioridade */}
      <Select value={priorityFilter} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-full md:w-[130px] h-10">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="high">🔴 Alta</SelectItem>
          <SelectItem value="medium">🟡 Média</SelectItem>
          <SelectItem value="low">🟢 Baixa</SelectItem>
        </SelectContent>
      </Select>

      {/* Tag */}
      {availableTags.length > 0 && (
        <Select value={tagFilter} onValueChange={onTagChange}>
          <SelectTrigger className="w-full md:w-[130px] h-10">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {availableTags.map((tag) => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Categoria (apenas Projetos) */}
      {categories && onCategoryChange && (
        <CategoryFilter
          categories={categories}
          selectedCategories={categoryFilter || []}
          onCategoryChange={onCategoryChange}
          tasks={tasks}
          compact={false}
        />
      )}

      {/* Modo de exibição (apenas Projetos) */}
      {displayMode && onDisplayModeChange && (
        <Select value={displayMode} onValueChange={onDisplayModeChange}>
          <SelectTrigger className="w-full md:w-[160px] h-10">
            <SelectValue placeholder="Exibição" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="by_category">📁 Por categoria</SelectItem>
            <SelectItem value="all_tasks">📋 Todas as tarefas</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Limpar filtros */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-10 w-full md:w-auto">
          <X className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      )}
    </>
  );

  return (
    <div className="px-4 md:px-6 py-2 border-b bg-card flex flex-wrap items-center gap-2">
      {/* Campo de Busca */}
      <div className="relative flex-1 min-w-[150px] max-w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10"
        />
        {searchTerm && (
          <button 
            onClick={() => onSearchChange("")} 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>

      {/* Presets de Filtros */}
      {showPresets && (
        <FilterPresetsManager
          currentFilters={currentFilters}
          onApplyPreset={handleApplyPreset}
          onClearFilters={onClearFilters}
          hasActiveFilters={!!hasActiveFilters}
        />
      )}

      {/* Mobile: Botão de filtros em Sheet */}
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2 h-10">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  !
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-3 mt-4 overflow-y-auto">
              {/* Filtros Básicos */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Filtros</h3>
                {renderFiltersContent()}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop: Filtros inline */
        <div className="flex flex-wrap items-center gap-2">
          {renderFiltersContent()}
        </div>
      )}
    </div>
  );
}
