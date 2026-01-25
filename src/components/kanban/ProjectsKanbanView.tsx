import { memo, useRef, lazy, Suspense } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { KanbanFiltersBar } from "@/components/kanban/KanbanFiltersBar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { DashboardStats } from "@/components/DashboardStats";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Columns3, Equal, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Column } from "@/hooks/data/useColumns";
import { Category } from "@/hooks/data/useCategories";
import { Task } from "@/hooks/tasks/useTasks";
import { Note } from "@/hooks/useNotes";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load ColumnManager - componente pesado com muitas dependências
const ColumnManager = lazy(() => import("./ColumnManager").then(m => ({ default: m.ColumnManager })));

interface TaskCounters {
  total: number;
  recorrente?: number;
  afazer?: number;
  emprogresso?: number;
  futuro?: number;
}

interface ProjectsKanbanViewProps {
  // Dados
  columns: Column[];
  allColumns: Column[];
  categories: Category[];
  tasks: Task[];
  filteredTasks: Task[];
  notes: Note[];
  notebooks: any[];
  availableTags: string[];
  taskCounters: TaskCounters | null;
  boardKey: number;
  
  // Configurações de display
  isMobile: boolean;
  simplifiedMode: boolean;
  densityMode: "comfortable" | "compact" | "ultra-compact";
  hideBadges: boolean;
  gridColumns: 1 | 2;
  displayMode: "by_category" | "all_tasks";
  
  // Ordenação
  sortOption: string;
  
  // Filtros - agora suportam arrays para multi-select
  searchTerm: string;
  priorityFilter: string | string[];
  tagFilter: string | string[];
  dueDateFilter: string | string[];
  recurrenceFilter?: "all" | "recurring" | "non-recurring";
  categoryFilter: string[];
  categoryFilterInitialized: boolean;
  selectedCategory?: string;
  
  // Callbacks de filtro - agora aceitam arrays
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: string | string[]) => void;
  onTagChange: (value: string | string[]) => void;
  onDueDateChange: (value: string | string[]) => void;
  onRecurrenceFilterChange?: (value: "all" | "recurring" | "non-recurring") => void;
  onCategoryChange: (value: string[]) => void;
  onDisplayModeChange: (value: string) => void;
  onClearFilters: () => void;
  onClearCategorySelection?: () => void;
  
  // Callbacks de ação
  onTaskSelect: (task: Task) => void;
  onEqualizeColumns: () => void;
  onResetRecurrentTasks?: () => void;
  
  // Column Manager
  hiddenColumns: string[];
  onToggleColumnVisibility: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => Promise<boolean>;
  onResetToDefault: () => void;
  onRenameColumn: (columnId: string, newName: string) => void;
  onAddColumn: (name: string) => void;
  onReorderColumns: (columns: Column[]) => void;
  onToggleKanbanVisibility: (columnId: string, kanbanType: 'projects', visible: boolean) => void;
  
  // Modais
  showStats: boolean;
  onShowStatsChange: (show: boolean) => void;
  showColumnManager: boolean;
  onShowColumnManagerChange: (show: boolean) => void;
}

export const ProjectsKanbanView = memo(function ProjectsKanbanView({
  columns,
  allColumns,
  categories,
  tasks,
  filteredTasks,
  notes,
  notebooks,
  availableTags,
  taskCounters,
  boardKey,
  isMobile,
  simplifiedMode,
  densityMode,
  hideBadges,
  gridColumns,
  displayMode,
  sortOption,
  searchTerm,
  priorityFilter,
  tagFilter,
  dueDateFilter,
  categoryFilter,
  categoryFilterInitialized,
  selectedCategory,
  recurrenceFilter = "all",
  onSearchChange,
  onPriorityChange,
  onTagChange,
  onDueDateChange,
  onRecurrenceFilterChange,
  onCategoryChange,
  onDisplayModeChange,
  onClearFilters,
  onClearCategorySelection,
  onTaskSelect,
  onEqualizeColumns,
  onResetRecurrentTasks,
  hiddenColumns,
  onToggleColumnVisibility,
  onDeleteColumn,
  onResetToDefault,
  onRenameColumn,
  onAddColumn,
  onReorderColumns,
  onToggleKanbanVisibility,
  showStats,
  onShowStatsChange,
  showColumnManager,
  onShowColumnManagerChange,
}: ProjectsKanbanViewProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const nonDailyCategories = categories.filter((c) => c.name !== "Diário");
  const selectedCategoryName = selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : null;

  return (
    <>
      <div className="border-b bg-background">
        {/* DESKTOP: Layout original em 1 linha */}
        {!isMobile && (
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">
                {selectedCategoryName ? `📁 ${selectedCategoryName}` : "📊 Todos os Projetos"}
              </h2>
              {selectedCategory && onClearCategorySelection && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearCategorySelection}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Ver todos
                </Button>
              )}
              {simplifiedMode && (
                <Badge variant="secondary" className="text-xs">
                  Modo Simplificado
                </Badge>
              )}
              {/* Badges com contadores */}
              {taskCounters && (
                <div className="flex gap-3">
                  <Badge variant="outline" className="text-xs">
                    Total: {taskCounters.total}
                  </Badge>
                  {taskCounters.recorrente && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                    >
                      🔄 Recorrente: {taskCounters.recorrente}
                    </Badge>
                  )}
                  {taskCounters.afazer && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    >
                      📋 A Fazer: {taskCounters.afazer}
                    </Badge>
                  )}
                  {taskCounters.emprogresso && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                    >
                      🚀 Em Progresso: {taskCounters.emprogresso}
                    </Badge>
                  )}
                  {taskCounters.futuro && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
                    >
                      📅 Futuro: {taskCounters.futuro}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onShowColumnManagerChange(true)}>
                <Columns3 className="h-4 w-4 mr-2" />
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
              {onResetRecurrentTasks && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResetRecurrentTasks}
                  title="Resetar tarefas recorrentes concluídas"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetar Recorrentes
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onShowStatsChange(true)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Estatísticas
              </Button>
            </div>
          </div>
        )}

        {/* MOBILE: Layout em 3 linhas */}
        {isMobile && (
          <>
            {/* LINHA 1: Logo + Buscar */}
            <div className="px-3 py-2 border-b flex items-center gap-2">
              <h2 className="text-base font-semibold flex-shrink-0">
                {selectedCategoryName ? `📁 ${selectedCategoryName}` : "📊 Todos"}
              </h2>
              {selectedCategory && onClearCategorySelection && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearCategorySelection}
                  className="h-6 px-1.5 text-[10px]"
                >
                  ✕
                </Button>
              )}
              <div className="flex-1" />
            </div>

            {/* LINHA 2: Botão Colunas + Equalizar + Resetar + Estatísticas */}
            <div className="px-3 py-2 border-b flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShowColumnManagerChange(true)}
                className="flex-1 h-10"
              >
                <Columns3 className="h-4 w-4 mr-2" />
                Colunas
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onEqualizeColumns}
                title="Equalizar largura das colunas"
                className="h-10 w-10"
              >
                <Equal className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShowStatsChange(true)}
                className="flex-1 h-10"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Estatísticas
              </Button>
            </div>
            {/* LINHA 3: Botão Resetar Recorrentes (separado para destaque) */}
            {onResetRecurrentTasks && (
              <div className="px-3 py-2 border-b">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResetRecurrentTasks}
                  className="w-full h-10"
                  title="Resetar tarefas recorrentes concluídas"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetar Recorrentes
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filtros do Kanban Projetos */}
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
        recurrenceFilter={recurrenceFilter}
        onRecurrenceFilterChange={onRecurrenceFilterChange}
        onClearFilters={onClearFilters}
        categoryFilter={categoryFilter}
        onCategoryChange={onCategoryChange}
        categories={nonDailyCategories}
        tasks={tasks}
        displayMode={displayMode}
        onDisplayModeChange={onDisplayModeChange}
        searchInputRef={searchInputRef}
        searchPlaceholder="Buscar em Projetos..."
      />

      {/* Renderizar baseado no displayMode */}
      {displayMode === "all_tasks" ? (
        <div className="mb-8" key={`all-tasks-${boardKey}`}>
          <div className="px-6 py-3 bg-muted/50 flex items-center justify-between">
            <h3 className="text-lg font-semibold">📋 Todas as Tarefas</h3>
            <Badge variant="secondary" className="text-xs">
              {filteredTasks.length} {filteredTasks.length === 1 ? "tarefa" : "tarefas"}
            </Badge>
          </div>
        <KanbanBoard
            key={`all-board-${boardKey}`}
            columns={columns}
            categoryId="all"
            searchTerm={searchTerm}
            priorityFilter={priorityFilter}
            tagFilter={tagFilter}
            dueDateFilter={dueDateFilter}
            sortOption={sortOption}
            showCategoryBadge
            densityMode={densityMode}
            hideBadges={hideBadges}
            gridColumns={gridColumns}
            categoryFilter={categoryFilter}
            categoryFilterInitialized={categoryFilterInitialized}
            selectedCategoryId={selectedCategory}
          />
        </div>
      ) : (
        /* Renderizar Kanbans por categoria */
        nonDailyCategories
          .filter((cat) => !categoryFilterInitialized || categoryFilter.includes(cat.id))
          .map((category) => {
            const categoryTasks = filteredTasks.filter((t) => t.category_id === category.id);
            return (
              <div key={`${category.id}-${boardKey}`} className="mb-8">
                <div className="px-6 py-3 bg-muted/50 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {categoryTasks.length} {categoryTasks.length === 1 ? "tarefa" : "tarefas"}
                  </Badge>
                </div>
                <KanbanBoard
                  key={`board-${category.id}-${boardKey}`}
                  columns={columns}
                  categoryId={category.id}
                  searchTerm={searchTerm}
                  priorityFilter={priorityFilter}
                  tagFilter={tagFilter}
                  dueDateFilter={dueDateFilter}
                  sortOption={sortOption}
                  densityMode={densityMode}
                  hideBadges={hideBadges}
                  gridColumns={gridColumns}
                  selectedCategoryId={selectedCategory}
                />
              </div>
            );
          })
      )}

      {/* Dialog de Estatísticas */}
      <Dialog open={showStats} onOpenChange={onShowStatsChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>📊 Estatísticas do Projeto</DialogTitle>
          </DialogHeader>
          <DashboardStats tasks={filteredTasks} />
        </DialogContent>
      </Dialog>

      {/* Dialog de Gerenciamento de Colunas */}
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
    </>
  );
});
