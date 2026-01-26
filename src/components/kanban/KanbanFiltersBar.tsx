import { useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/ui/useMobile";
import { CategoryFilter } from "@/components/CategoryFilter";
import { FilterPresetsManager } from "./FilterPresetsManager";
import { FilterPreset } from "@/hooks/useFilterPresets";
import { RecurrenceFilter } from "./RecurrenceFilter";
import { MultiSelectFilter } from "./MultiSelectFilter";

interface KanbanFiltersBarProps {
  // Filtros básicos - agora aceitam arrays
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: string | string[];
  onPriorityChange: (value: string | string[]) => void;
  tagFilter: string | string[];
  onTagChange: (value: string | string[]) => void;
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
  
  // Filtro de data de vencimento - agora aceita array
  dueDateFilter?: string | string[];
  onDueDateChange?: (value: string | string[]) => void;
  
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

// Opções de prioridade
const priorityOptions = [
  { value: "high", label: "Alta", icon: "🔴" },
  { value: "medium", label: "Média", icon: "🟡" },
  { value: "low", label: "Baixa", icon: "🟢" },
];

// Opções de data de vencimento (removido overdue_today pois multi-select permite selecionar ambos)
const dueDateOptions = [
  { value: "no_date", label: "Sem data", icon: "📭" },
  { value: "overdue", label: "Atrasadas", icon: "🔴" },
  { value: "today", label: "Hoje", icon: "📅" },
  { value: "next_7_days", label: "Próximos 7 dias", icon: "📆" },
  { value: "week", label: "Esta semana", icon: "📆" },
  { value: "month", label: "Este mês", icon: "🗓️" },
];

// Helper para normalizar valor para array
const normalizeToArray = (value: string | string[]): string[] => {
  if (Array.isArray(value)) return value;
  if (value === "all" || value === "") return [];
  return [value];
};

// Helper para verificar se tem filtros ativos
const hasActiveFilter = (value: string | string[]): boolean => {
  const arr = normalizeToArray(value);
  return arr.length > 0 && !arr.includes("all");
};

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
  
  // Normalizar valores para arrays
  const priorityValues = normalizeToArray(priorityFilter);
  const tagValues = normalizeToArray(tagFilter);
  const dueDateValues = normalizeToArray(dueDateFilter || "all");
  
  // Contar filtros ativos
  const countActiveFilters = () => {
    let count = 0;
    if (searchTerm) count++;
    if (hasActiveFilter(priorityFilter)) count++;
    if (hasActiveFilter(tagFilter)) count++;
    if (categoryFilter && categoryFilter.length > 0 && categoryFilter.length < (categories?.length || 0)) count++;
    if (columnFilter && columnFilter.length > 0 && columnFilter.length < (columns?.length || 0)) count++;
    if (dueDateFilter && hasActiveFilter(dueDateFilter)) count++;
    if (displayMode && displayMode !== "all_tasks") count++;
    if (recurrenceFilter !== "all") count++;
    return count;
  };
  
  // Contar filtros secundários ativos (excluindo busca, prioridade e data)
  const countSecondaryActiveFilters = () => {
    let count = 0;
    if (hasActiveFilter(tagFilter)) count++;
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
    priorityFilter: hasActiveFilter(priorityFilter) ? (Array.isArray(priorityFilter) ? priorityFilter.join(",") : priorityFilter) : undefined,
    tagFilter: hasActiveFilter(tagFilter) ? (Array.isArray(tagFilter) ? tagFilter.join(",") : tagFilter) : undefined,
    categoryFilter: categoryFilter?.length ? categoryFilter : undefined,
    displayMode: displayMode || undefined,
    sortOption: sortOption || undefined,
  };

  // Filtrar a tag "recorrente" da lista para evitar duplicação com RecurrenceFilter
  const filteredTags = availableTags.filter(tag => tag.toLowerCase() !== "recorrente");
  
  // Converter tags para opções do MultiSelectFilter
  const tagOptions = filteredTags.map(tag => ({
    value: tag,
    label: tag,
  }));

  // Filtros primários (sempre visíveis em mobile)
  const renderPrimaryFilters = () => (
    <>
      {/* Prioridade - Multi-Select */}
      <MultiSelectFilter
        options={priorityOptions}
        selectedValues={priorityValues}
        onChange={onPriorityChange}
        placeholder="Prioridade"
        allLabel="Todas prioridades"
        className="w-full md:w-[160px]"
      />

      {/* Data de Vencimento - Multi-Select */}
      {onDueDateChange && (
        <MultiSelectFilter
          options={dueDateOptions}
          selectedValues={dueDateValues}
          onChange={onDueDateChange}
          placeholder="Vencimento"
          allLabel="Todas datas"
          className="w-full md:w-[180px]"
        />
      )}
    </>
  );

  // Filtros secundários (em sheet no mobile)
  const renderSecondaryFilters = () => (
    <>
      {/* Tag - Multi-Select */}
      {filteredTags.length > 0 && (
        <MultiSelectFilter
          options={tagOptions}
          selectedValues={tagValues}
          onChange={onTagChange}
          placeholder="Tags"
          allLabel="Todas tags"
          className="w-full md:w-[160px]"
        />
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

      {/* Coluna/Status - Multi-Select */}
      {columns && columns.length > 0 && onColumnChange && (
        <MultiSelectFilter
          options={columns.map(col => ({
            value: col.id,
            label: col.name,
            color: col.color || undefined,
          }))}
          selectedValues={columnFilter || []}
          onChange={onColumnChange}
          placeholder="Status"
          allLabel="Todos status"
          className="w-full md:w-[160px]"
        />
      )}

      {/* Modo de exibição (apenas Projetos) */}
      {displayMode && onDisplayModeChange && (
        <MultiSelectFilter
          options={[
            { value: "by_category", label: "Por categoria", icon: "📁" },
            { value: "all_tasks", label: "Todas as tarefas", icon: "📋" },
          ]}
          selectedValues={[displayMode]}
          onChange={(values) => {
            // Modo de exibição é sempre single select
            if (values.length > 0) {
              onDisplayModeChange(values[values.length - 1]);
            }
          }}
          placeholder="Exibição"
          allLabel="Exibição"
          className="w-full md:w-[180px]"
        />
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