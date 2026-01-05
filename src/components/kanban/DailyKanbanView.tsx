import { memo } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { KanbanFiltersBar } from "@/components/kanban/KanbanFiltersBar";
import { FavoritesSection } from "@/components/FavoritesSection";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { ColumnManager } from "@/components/kanban/ColumnManager";
import { Button } from "@/components/ui/button";
import { RotateCcw, FileText, Columns3, Equal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Column } from "@/hooks/data/useColumns";
import { Category } from "@/hooks/data/useCategories";

interface DailyKanbanViewProps {
  // Dados
  columns: Column[];
  allColumns: Column[];
  categories: Category[];
  dailyCategory: string;
  availableTags: string[];
  boardKey: number;
  
  // Configurações de display
  densityMode: "comfortable" | "compact" | "ultra-compact";
  hideBadges: boolean;
  gridColumns: 1 | 2;
  showFavoritesPanel: boolean;
  
  // Ordenação
  sortOption: string;
  sortOrder: "asc" | "desc";
  
  // Filtros
  searchTerm: string;
  priorityFilter: string;
  tagFilter: string;
  dueDateFilter: string;
  
  // Callbacks de filtro
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onClearFilters: () => void;
  
  // Callbacks de ação
  onResetRecurrentTasks: () => void;
  onEqualizeColumns: () => void;
  
  // Column Manager
  hiddenColumns: string[];
  onToggleColumnVisibility: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => Promise<boolean>;
  onResetToDefault: () => void;
  onRenameColumn: (columnId: string, newName: string) => void;
  onAddColumn: (name: string) => void;
  onReorderColumns: (columns: Column[]) => void;
  onToggleKanbanVisibility: (columnId: string, kanbanType: 'daily' | 'projects', visible: boolean) => void;
  
  // Modais
  showTemplates: boolean;
  onShowTemplatesChange: (show: boolean) => void;
  showColumnManager: boolean;
  onShowColumnManagerChange: (show: boolean) => void;
}

export const DailyKanbanView = memo(function DailyKanbanView({
  columns,
  allColumns,
  categories,
  dailyCategory,
  availableTags,
  boardKey,
  densityMode,
  hideBadges,
  gridColumns,
  showFavoritesPanel,
  sortOption,
  sortOrder,
  searchTerm,
  priorityFilter,
  tagFilter,
  dueDateFilter,
  onSearchChange,
  onPriorityChange,
  onTagChange,
  onDueDateChange,
  onClearFilters,
  onResetRecurrentTasks,
  onEqualizeColumns,
  hiddenColumns,
  onToggleColumnVisibility,
  onDeleteColumn,
  onResetToDefault,
  onRenameColumn,
  onAddColumn,
  onReorderColumns,
  onToggleKanbanVisibility,
  showTemplates,
  onShowTemplatesChange,
  showColumnManager,
  onShowColumnManagerChange,
}: DailyKanbanViewProps) {
  // Computar sortOption string para o KanbanBoard
  const sortOptionString = sortOrder === "asc" 
    ? `${sortOption === "time" ? "date" : sortOption}_asc` 
    : `${sortOption === "time" ? "date" : sortOption}_desc`;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Cabeçalho Kanban Diário */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="px-6 py-3 border-b flex-wrap gap-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-center">📅 Kanban Diário</h2>
          <div className="gap-2 flex-wrap items-center justify-center flex flex-row">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onShowColumnManagerChange(true)} 
              className="flex items-center gap-2"
            >
              <Columns3 className="h-4 w-4" />
              Colunas
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onEqualizeColumns} 
              title="Equalizar largura das colunas" 
              className="h-9 w-9"
            >
              <Equal className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onShowTemplatesChange(true)} 
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Templates
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onResetRecurrentTasks} 
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar Recorrentes
            </Button>
          </div>
        </div>

        {/* Filtros do Kanban Diário */}
        <KanbanFiltersBar
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          priorityFilter={priorityFilter}
          onPriorityChange={onPriorityChange}
          tagFilter={tagFilter}
          onTagChange={onTagChange}
          availableTags={availableTags}
          dueDateFilter={dueDateFilter}
          onDueDateChange={onDueDateChange}
          onClearFilters={onClearFilters}
          searchPlaceholder="Buscar no Diário..."
        />
      </div>

      {/* Layout Kanban + Favoritos */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Kanban Board */}
        <div className={cn("overflow-y-auto", showFavoritesPanel ? "flex-1" : "w-full")}>
          <KanbanBoard 
            key={boardKey} 
            columns={columns} 
            categoryId={dailyCategory} 
            compact 
            isDailyKanban 
            sortOption={sortOptionString} 
            densityMode={densityMode} 
            hideBadges={hideBadges} 
            gridColumns={gridColumns}
            priorityFilter={priorityFilter}
            tagFilter={tagFilter}
            searchTerm={searchTerm}
            dueDateFilter={dueDateFilter}
          />
        </div>

        {/* Favoritos */}
        {showFavoritesPanel && (
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l overflow-y-auto">
            <FavoritesSection columns={allColumns} categories={categories} />
          </div>
        )}
      </div>

      {/* Modais */}
      <TemplateSelector open={showTemplates} onOpenChange={onShowTemplatesChange} />
      
      <ColumnManager 
        open={showColumnManager} 
        onOpenChange={onShowColumnManagerChange} 
        columns={allColumns} 
        hiddenColumns={hiddenColumns} 
        onToggleVisibility={onToggleColumnVisibility} 
        onDeleteColumn={onDeleteColumn} 
        onResetToDefault={onResetToDefault} 
        onRenameColumn={onRenameColumn} 
        onAddColumn={onAddColumn} 
        onReorderColumns={onReorderColumns} 
        onToggleKanbanVisibility={onToggleKanbanVisibility} 
      />
    </div>
  );
});
