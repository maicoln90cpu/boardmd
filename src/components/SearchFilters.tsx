import { Search, X, SlidersHorizontal, Columns3, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryFilter } from "@/components/CategoryFilter";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  tagFilter: string;
  onTagChange: (value: string) => void;
  categoryFilter?: string[];
  onCategoryChange?: (value: string[]) => void;
  availableTags: string[];
  categories?: Array<{ id: string; name: string }>;
  tasks?: Array<{ category_id: string }>;
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
  densityMode?: "comfortable" | "compact" | "ultra-compact";
  onDensityChange?: (mode: "comfortable" | "compact" | "ultra-compact") => void;
  simplifiedMode?: boolean;
  onSimplifiedModeChange?: (value: boolean) => void;
  compact?: boolean;
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
  tasks = [],
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
  densityMode = "comfortable",
  onDensityChange,
  simplifiedMode = false,
  onSimplifiedModeChange,
  compact = false,
}: SearchFiltersProps) {
  const hasActiveFilters = searchTerm || priorityFilter !== "all" || tagFilter !== "all" || 
    (categoryFilter && categoryFilter.length > 0 && categoryFilter.length < (categories?.length || 0)) || 
    sortOption !== "manual";
  const isMobile = useIsMobile();
  
  const densityIcon = {
    "comfortable": "⊟",
    "compact": "▤",
    "ultra-compact": "≡"
  };

  // Classes compartilhadas
  const selectClass = compact ? "w-full text-xs h-9" : "w-auto min-w-[140px] max-w-[180px] h-9 text-sm";
  const buttonClass = compact ? "min-h-[40px]" : "min-h-[48px]";

  // Renderizar filtros (conteúdo compartilhado)
  const renderFilters = () => (
    <>
      <Select value={priorityFilter} onValueChange={onPriorityChange}>
        <SelectTrigger className={selectClass}>
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="medium">Média</SelectItem>
          <SelectItem value="low">Baixa</SelectItem>
        </SelectContent>
      </Select>

          {availableTags.length > 0 && (
            <Select value={tagFilter} onValueChange={onTagChange}>
              <SelectTrigger className={selectClass}>
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
          )}

      {viewMode === "all" && categories && onCategoryChange && (
        <CategoryFilter
          categories={categories}
          selectedCategories={categoryFilter || []}
          onCategoryChange={onCategoryChange}
          compact={compact}
          tasks={tasks}
        />
      )}

      {viewMode === "all" && displayMode && onDisplayModeChange && (
        <Select value={displayMode} onValueChange={onDisplayModeChange}>
          <SelectTrigger className={selectClass}>
            <SelectValue placeholder="Exibição" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="by_category">📁 Por categoria</SelectItem>
            <SelectItem value="all_tasks">📋 Todas as tarefas</SelectItem>
          </SelectContent>
        </Select>
      )}

      {viewMode === "daily" && dailySortOption && onDailySortChange && dailySortOrder && onDailySortOrderChange && (
        <>
          <Select value={dailySortOption} onValueChange={onDailySortChange}>
            <SelectTrigger className={selectClass}>
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
          <SelectTrigger className={selectClass}>
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
      
      {onDensityChange && (
        <Select value={densityMode} onValueChange={onDensityChange}>
          <SelectTrigger className={compact ? "w-[120px] min-h-[40px]" : "w-full sm:w-[140px] min-h-[48px]"}>
            <span className="mr-2">{densityIcon[densityMode]}</span>
            <SelectValue placeholder="Densidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="comfortable">Confortável</SelectItem>
            <SelectItem value="compact">Compacto</SelectItem>
            <SelectItem value="ultra-compact">Ultra</SelectItem>
          </SelectContent>
        </Select>
      )}

      {viewMode === "all" && onSimplifiedModeChange && (
        <Button
          variant={simplifiedMode ? "default" : "outline"}
          size="default"
          onClick={() => onSimplifiedModeChange(!simplifiedMode)}
          className="gap-2 min-h-[48px] w-full sm:w-auto"
        >
          <Columns3 className="h-4 w-4" />
          {simplifiedMode ? "Modo Simplificado" : "Todas Colunas"}
        </Button>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="default" onClick={onClearFilters} className={`${buttonClass} ${compact ? "w-auto" : "w-full"}`}>
          <X className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      )}
    </>
  );

  const containerClass = compact 
    ? "grid grid-cols-3 gap-2 p-2 bg-card border-b"
    : "flex flex-row items-center gap-2 p-2 bg-card border-b flex-nowrap overflow-x-auto";

  const inputClass = compact ? "pl-9 min-h-[40px]" : "pl-9 h-10 text-sm";

  return (
    <div className={containerClass}>
      <div className={compact ? "relative w-64 min-w-0" : "relative max-w-[240px] min-w-0"}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Buscar tarefas..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className={inputClass}
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
              {/* Filtros Básicos sempre visíveis */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Filtros Básicos</h3>
                <Select value={priorityFilter} onValueChange={onPriorityChange}>
                  <SelectTrigger className={selectClass}>
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOption} onValueChange={onSortChange}>
                  <SelectTrigger className={selectClass}>
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="due_date">Data de vencimento</SelectItem>
                    <SelectItem value="priority">Prioridade</SelectItem>
                    <SelectItem value="title">Alfabética</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtros Avançados em Collapsible */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight className="h-4 w-4 transition-transform ui-state-open:rotate-90" />
                  Filtros Avançados
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3">
                  {availableTags.length > 0 && (
                    <Select value={tagFilter} onValueChange={onTagChange}>
                      <SelectTrigger className={selectClass}>
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
                  )}

                  {viewMode === "all" && categories && onCategoryChange && (
                    <CategoryFilter
                      categories={categories}
                      selectedCategories={categoryFilter || []}
                      onCategoryChange={onCategoryChange}
                      tasks={tasks}
                      compact={compact}
                    />
                  )}

                  {onDensityChange && (
                    <Select value={densityMode} onValueChange={onDensityChange as any}>
                      <SelectTrigger className={selectClass}>
                        <SelectValue placeholder="Densidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comfortable">Confortável</SelectItem>
                        <SelectItem value="compact">Compacto</SelectItem>
                        <SelectItem value="ultra-compact">Ultra</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {viewMode === "all" && onSimplifiedModeChange && (
                    <Button
                      variant={simplifiedMode ? "default" : "outline"}
                      size="default"
                      onClick={() => onSimplifiedModeChange(!simplifiedMode)}
                      className="gap-2 min-h-[48px] w-full"
                    >
                      <Columns3 className="h-4 w-4" />
                      {simplifiedMode ? "Modo Simplificado" : "Todas Colunas"}
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {hasActiveFilters && (
                <Button variant="ghost" size="default" onClick={onClearFilters} className={`${buttonClass} w-full`}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
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
