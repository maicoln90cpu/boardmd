import { useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/ui/useMobile";
import { CategoryFilter } from "@/components/CategoryFilter";
import { FilterPresetsManager } from "./FilterPresetsManager";
import { FilterPreset } from "@/hooks/useFilterPresets";
import { RecurrenceFilter } from "./RecurrenceFilter";

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
  
  // Filtro de coluna/status
  columnFilter?: string[];
  onColumnChange?: (value: string[]) => void;
  columns?: Array<{ id: string; name: string; color?: string | null }>;
  
  // Filtro de data de vencimento
  dueDateFilter?: string;
  onDueDateChange?: (value: string) => void;
  
  // Filtro de recorrência
  recurrenceFilter?: "all" | "recurring" | "non-recurring";
  onRecurrenceFilterChange?: (value: "all" | "recurring" | "non-recurring") => void;
  
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
  columnFilter,
  onColumnChange,
  columns,
  dueDateFilter,
  onDueDateChange,
  recurrenceFilter = "all",
  onRecurrenceFilterChange,
  searchInputRef,
  searchPlaceholder = "Buscar tarefas...",
  showPresets = true,
  sortOption,
}: KanbanFiltersBarProps) {
  const isMobile = useIsMobile();
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  
  // Contar filtros ativos
  const countActiveFilters = () => {
    let count = 0;
    if (searchTerm) count++;
    if (priorityFilter !== "all") count++;
    if (tagFilter !== "all") count++;
    if (categoryFilter && categoryFilter.length > 0 && categoryFilter.length < (categories?.length || 0)) count++;
    if (columnFilter && columnFilter.length > 0 && columnFilter.length < (columns?.length || 0)) count++;
    if (dueDateFilter && dueDateFilter !== "all") count++;
    if (displayMode && displayMode !== "all_tasks") count++;
    if (recurrenceFilter !== "all") count++;
    return count;
  };
  
  // Contar filtros secundários ativos (excluindo busca, prioridade e data)
  const countSecondaryActiveFilters = () => {
    let count = 0;
    if (tagFilter !== "all") count++;
    if (categoryFilter && categoryFilter.length > 0 && categoryFilter.length < (categories?.length || 0)) count++;
    if (columnFilter && columnFilter.length > 0 && columnFilter.length < (columns?.length || 0)) count++;
    if (displayMode && displayMode !== "all_tasks") count++;
    if (recurrenceFilter !== "all") count++;
    return count;
  };
  
  const hasActiveFilters = countActiveFilters() > 0;
  const secondaryFiltersCount = countSecondaryActiveFilters();

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

  // Filtros primários (sempre visíveis em mobile)
  const renderPrimaryFilters = () => (
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

      {/* Data de Vencimento */}
      {onDueDateChange && (
        <Select value={dueDateFilter || "all"} onValueChange={onDueDateChange}>
          <SelectTrigger className="w-full md:w-[180px] h-10">
            <SelectValue placeholder="Vencimento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas datas</SelectItem>
            <SelectItem value="no_date">📭 Sem data</SelectItem>
            <SelectItem value="overdue_today">🔥 Atrasadas + Hoje</SelectItem>
            <SelectItem value="overdue">🔴 Atrasadas</SelectItem>
            <SelectItem value="today">📅 Hoje</SelectItem>
            <SelectItem value="week">📆 Esta semana</SelectItem>
            <SelectItem value="month">🗓️ Este mês</SelectItem>
          </SelectContent>
        </Select>
      )}
    </>
  );

  // Filtros secundários (em sheet no mobile)
  const renderSecondaryFilters = () => (
    <>
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

      {/* Coluna/Status */}
      {columns && columns.length > 0 && onColumnChange && (
        <Select 
          value={columnFilter?.length === 1 ? columnFilter[0] : "all"} 
          onValueChange={(value) => {
            if (value === "all") {
              onColumnChange([]);
            } else {
              onColumnChange([value]);
            }
          }}
        >
          <SelectTrigger className="w-full md:w-[140px] h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {columns.map((col) => (
              <SelectItem key={col.id} value={col.id}>
                <div className="flex items-center gap-2">
                  {col.color && (
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: col.color }}
                    />
                  )}
                  {col.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Filtro de recorrência */}
      {onRecurrenceFilterChange && (
        <RecurrenceFilter 
          value={recurrenceFilter} 
          onChange={onRecurrenceFilterChange} 
        />
      )}
    </>
  );

  // Conteúdo completo dos filtros - para desktop
  const renderAllFiltersContent = () => (
    <>
      {renderPrimaryFilters()}
      {renderSecondaryFilters()}
      
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
      <div className="relative flex-1 min-w-[120px] max-w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder={isMobile ? "Buscar..." : searchPlaceholder}
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
      {showPresets && !isMobile && (
        <FilterPresetsManager
          currentFilters={currentFilters}
          onApplyPreset={handleApplyPreset}
          onClearFilters={onClearFilters}
          hasActiveFilters={!!hasActiveFilters}
        />
      )}

      {/* Mobile: Filtros primários inline + botão para mais */}
      {isMobile ? (
        <>
          {/* Filtros primários inline */}
          {renderPrimaryFilters()}
          
          {/* Botão para mais filtros */}
          <Sheet open={showMoreFilters} onOpenChange={setShowMoreFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
                {secondaryFiltersCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {secondaryFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[60vh]">
              <SheetHeader>
                <SheetTitle>Mais Filtros</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3 mt-4 pb-4">
                {renderSecondaryFilters()}
                
                {/* Presets no mobile */}
                {showPresets && (
                  <div className="pt-2 border-t">
                    <FilterPresetsManager
                      currentFilters={currentFilters}
                      onApplyPreset={handleApplyPreset}
                      onClearFilters={onClearFilters}
                      hasActiveFilters={!!hasActiveFilters}
                    />
                  </div>
                )}
                
                {/* Limpar todos os filtros */}
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onClearFilters();
                      setShowMoreFilters(false);
                    }} 
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar todos os filtros
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        /* Desktop: Filtros inline */
        <div className="flex flex-wrap items-center gap-2">
          {renderAllFiltersContent()}
        </div>
      )}
    </div>
  );
}
