import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TaskModal } from "@/components/TaskModal";
import { DailyReviewModal } from "@/components/DailyReviewModal";
import { ImportPreviewModal } from "@/components/ImportPreviewModal";
import { ActivityHistory } from "@/components/ActivityHistory";
import { DailyKanbanView } from "@/components/kanban/DailyKanbanView";
import { ProjectsKanbanView } from "@/components/kanban/ProjectsKanbanView";
import { useCategories } from "@/hooks/useCategories";
import { useColumns } from "@/hooks/useColumns";
import { useTasks, Task } from "@/hooks/useTasks";
import { useDueDateAlerts } from "@/hooks/useDueDateAlerts";
import { useNotes } from "@/hooks/useNotes";
import { useNotebooks } from "@/hooks/useNotebooks";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSettings } from "@/hooks/useSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { KanbanLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useWeeklyAutomation } from "@/hooks/useWeeklyAutomation";
import { useTaskReset } from "@/hooks/useTaskReset";
import { useDataImportExport } from "@/hooks/useDataImportExport";
import { useCategoryFilters } from "@/hooks/useCategoryFilters";
import { useDailyReview } from "@/hooks/useDailyReview";

function Index() {
  const isMobile = useIsMobile();
  const {
    categories,
    loading: loadingCategories,
    addCategory
  } = useCategories();
  const {
    columns,
    loading: loadingColumns,
    hiddenColumns,
    toggleColumnVisibility,
    getVisibleColumns,
    resetToDefaultView,
    deleteColumn,
    renameColumn,
    reorderColumns,
    addColumn,
    toggleColumnKanbanVisibility
  } = useColumns();
  const { notes } = useNotes();
  const { notebooks } = useNotebooks();
  const {
    toggleTheme
  } = useTheme();
  const {
    toast
  } = useToast();
  const {
    addActivity
  } = useActivityLog();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dailyBoardKey, setDailyBoardKey] = useState(0);
  const [projectsBoardKey, setProjectsBoardKey] = useState(0);
  const [viewMode, setViewMode] = useState<"daily" | "all">("daily");
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"by_category" | "all_tasks">("all_tasks");

  // Estado para modal de nova tarefa via atalho
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);

  // CORREÇÃO: Usar useSettings em vez de useLocalStorage para configurações
  const {
    settings,
    updateSettings,
    saveSettings
  } = useSettings();

  // Valores derivados das configurações (somente leitura aqui - editar em Config)
  const simplifiedMode = settings.kanban.simplifiedMode;
  const dailySortOption = settings.kanban.dailySortOption;
  const dailySortOrder = settings.kanban.dailySortOrder;
  const densityMode = settings.defaultDensity;
  const showFavoritesPanel = settings.kanban.showFavoritesPanel;
  const hideBadgesMobile = settings.mobile.hideBadges;
  const dailyGridColumnsMobile = settings.mobile.dailyGridColumns;
  const projectsGridColumnsMobile = settings.mobile.projectsGridColumns;

  // ==========================================
  // HOOKS DE FILTROS DE CATEGORIA
  // ==========================================
  const {
    selectedCategory,
    dailyCategory,
    categoryFilter,
    categoryFilterInitialized,
    selectedCategoryFilterMobile,
    setSelectedCategory,
    setCategoryFilter,
    setSelectedCategoryFilterMobile,
    clearCategoryFilters,
  } = useCategoryFilters(categories);

  // Filtros (persistidos no localStorage - são filtros temporários, não configs)
  const [searchTerm, setSearchTerm] = useLocalStorage<string>("filter-search", "");
  const [priorityFilter, setPriorityFilter] = useLocalStorage<string>("filter-priority", "all");
  const [tagFilter, setTagFilter] = useLocalStorage<string>("filter-tag", "all");
  
  // CORREÇÃO: Usar settings.kanban.projectsSortOption em vez de localStorage
  const projectsSortOption = settings.kanban.projectsSortOption;
  const projectsSortOrder = settings.kanban.projectsSortOrder;

  // Filtros do Kanban Diário (separados dos filtros de Projetos)
  const [dailyPriorityFilter, setDailyPriorityFilter] = useLocalStorage<string>("daily-priority-filter", "all");
  const [dailyTagFilter, setDailyTagFilter] = useLocalStorage<string>("daily-tag-filter", "all");
  const [dailySearchTerm, setDailySearchTerm] = useLocalStorage<string>("daily-search", "");
  
  // Filtros de data persistidos via settings (banco de dados)
  const dailyDueDateFilter = settings.kanban.dailyDueDateFilter;
  const projectsDueDateFilter = settings.kanban.projectsDueDateFilter;

  // Funções para atualizar settings localmente (com sync para DB)
  const setSimplifiedMode = async (value: boolean) => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        simplifiedMode: value
      }
    });
    await saveSettings();
  };
  const setDailySortOption = async (value: "time" | "name" | "priority") => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        dailySortOption: value
      }
    });
    await saveSettings();
  };
  const setDailySortOrder = async (value: "asc" | "desc") => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        dailySortOrder: value
      }
    });
    await saveSettings();
  };
  const setDensityMode = async (value: "comfortable" | "compact" | "ultra-compact") => {
    updateSettings({
      defaultDensity: value
    });
    await saveSettings();
  };
  const setShowFavoritesPanel = async (value: boolean) => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        showFavoritesPanel: value
      }
    });
    await saveSettings();
  };
  const setHideBadgesMobile = async (value: boolean) => {
    updateSettings({
      mobile: {
        ...settings.mobile,
        hideBadges: value
      }
    });
    await saveSettings();
  };
  const setDailyGridColumnsMobile = async (value: 1 | 2) => {
    updateSettings({
      mobile: {
        ...settings.mobile,
        dailyGridColumns: value
      }
    });
    await saveSettings();
  };
  const setProjectsGridColumnsMobile = async (value: 1 | 2) => {
    updateSettings({
      mobile: {
        ...settings.mobile,
        projectsGridColumns: value
      }
    });
    await saveSettings();
  };
  
  // Funções para atualizar filtros de data (persistidos no banco)
  const setDailyDueDateFilter = async (value: string) => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        dailyDueDateFilter: value
      }
    });
    await saveSettings();
  };
  const setProjectsDueDateFilter = async (value: string) => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        projectsDueDateFilter: value
      }
    });
    await saveSettings();
  };

  // Atalhos de teclado globais
  useKeyboardShortcuts({
    onSearch: () => {
      if (viewMode === "all") {
        searchInputRef.current?.focus();
      }
    },
    onNewTask: () => {
      setShowQuickTaskModal(true);
    }
  });

  // Ler view da URL na inicialização OU usar defaultView das configurações
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "all" || view === "daily") {
      setViewMode(view);
    } else if (settings.kanban.defaultView) {
      // Sem view na URL, usar configuração padrão
      setViewMode(settings.kanban.defaultView === "projects" ? "all" : "daily");
    }
  }, [settings.kanban.defaultView]);

  // OTIMIZAÇÃO: Consolidar em uma única instância de useTasks
  // Busca todas as tarefas uma vez e usa filtros locais para diferentes views
  const {
    tasks: allTasks,
    resetAllTasksToFirstColumn: resetDailyTasks,
    updateTask: updateDailyTask,
    addTask
  } = useTasks("all");

  // Hook de notificações de prazo - monitora TODAS as tarefas
  useDueDateAlerts(allTasks);

  // ==========================================
  // HOOKS CUSTOMIZADOS - Refatoração Fase 4
  // ==========================================
  
  // Hook de automação semanal
  useWeeklyAutomation({
    tasks: allTasks,
    columns,
    autoMoveEnabled: settings.kanban.autoMoveToCurrentWeek
  });

  // Hook de reset de tarefas
  const { handleResetRecurrentTasks, handleResetDaily } = useTaskReset({
    columns,
    resetAllTasksToFirstColumn: resetDailyTasks,
    onBoardRefresh: () => setDailyBoardKey(k => k + 1)
  });

  // Hook de importação/exportação
  const {
    handleExport,
    handleImport,
    handleConfirmImport,
    showImportPreview,
    setShowImportPreview,
    importValidation,
    importMerge,
    importFileName,
    isImporting
  } = useDataImportExport({
    categories,
    tasks: allTasks,
    columns,
    addCategory,
    onBoardRefresh: () => {
      setDailyBoardKey(k => k + 1);
      setProjectsBoardKey(k => k + 1);
    }
  });

  // Hook de Daily Review
  const { showDailyReview, setShowDailyReview } = useDailyReview({
    tasks: allTasks,
    settings,
    updateSettings,
    saveSettings,
  });

  // Filtrar tasks baseado no viewMode
  const tasks = useMemo(() => {
    if (viewMode === "daily" && dailyCategory) {
      return allTasks.filter(task => task.category_id === dailyCategory);
    }
    return allTasks;
  }, [allTasks, viewMode, dailyCategory]);

  // Filtrar tasks baseado no viewMode e filtros
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const dailyCat = categories.find(c => c.name === "Diário");

      // No modo "all", excluir tarefas do Diário
      if (viewMode === "all" && task.category_id === dailyCat?.id) {
        return false;
      }

      // Filtro de categoria (apenas no modo "all" e após inicialização)
      if (viewMode === "all" && categoryFilterInitialized && categoryFilter.length > 0 && !categoryFilter.includes(task.category_id)) {
        return false;
      }

      // Filtro mobile de categoria
      if (isMobile && viewMode === "all" && selectedCategoryFilterMobile !== "all") {
        if (task.category_id !== selectedCategoryFilterMobile) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, viewMode, categoryFilter, categories, isMobile, selectedCategoryFilterMobile, categoryFilterInitialized]);

  // Tags disponíveis (usar filteredTasks)
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    filteredTasks.forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [filteredTasks]);

  // Tags disponíveis no Kanban Diário
  const dailyAvailableTags = useMemo(() => {
    if (!dailyCategory) return [];
    const tags = new Set<string>();
    allTasks.filter(task => task.category_id === dailyCategory).forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [allTasks, dailyCategory]);
  const handleClearFilters = () => {
    setSearchTerm("");
    setPriorityFilter("all");
    setTagFilter("all");
    clearCategoryFilters();
    setDisplayMode("by_category");
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTaskForHistory(task.id);
    setShowHistory(true);
  };
  const handleReorderDailyTasks = useCallback(async (reorderedTasks: Array<{
    id: string;
    position: number;
  }>) => {
    if (!updateDailyTask) return;
    try {
      // OTIMIZAÇÃO: Batch update de posições
      for (const { id, position } of reorderedTasks) {
        await supabase
          .from("tasks")
          .update({ position, updated_at: new Date().toISOString() })
          .eq("id", id);
      }

      // Força refresh do board
      window.dispatchEvent(new CustomEvent('task-updated'));
      setDailyBoardKey(k => k + 1);
      addActivity("ai_organize", "Tarefas organizadas com IA");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error reordering tasks:", error);
      toast({
        title: "Erro ao reordenar tarefas",
        variant: "destructive"
      });
    }
  }, [updateDailyTask, addActivity, toast]);

  // Função para equalizar largura das colunas
  const handleEqualizeColumns = () => {
    const equalSize = 100 / visibleColumns.length;
    const equalSizes = visibleColumns.map(() => equalSize);
    if (viewMode === "daily") {
      // Modo Diário: apenas uma categoria
      localStorage.setItem(`kanban-column-sizes-${dailyCategory}`, JSON.stringify(equalSizes));
      setDailyBoardKey(k => k + 1);
    } else {
      // Modo Projetos: atualizar TODAS as categorias visíveis + "all"
      // Atualizar key "all" para modo all_tasks
      localStorage.setItem(`kanban-column-sizes-all`, JSON.stringify(equalSizes));

      // Atualizar cada categoria individual para modo by_category
      const nonDailyCategories = categories.filter(c => c.name !== "Diário");
      nonDailyCategories.forEach(cat => {
        localStorage.setItem(`kanban-column-sizes-${cat.id}`, JSON.stringify(equalSizes));
      });

      // Disparar evento storage para forçar re-leitura
      window.dispatchEvent(new Event('storage'));
      setProjectsBoardKey(k => k + 1);
    }
  };

  // Calcular colunas visíveis considerando modo simplificado
  const visibleColumns = useMemo(() => {
    const kanbanType = viewMode === "daily" ? 'daily' : 'projects';
    const baseColumns = getVisibleColumns(kanbanType);
    if (simplifiedMode && viewMode === "all") {
      // Modo simplificado: mostrar apenas as primeiras 3 colunas por position
      const simplifiedCols = baseColumns.sort((a, b) => a.position - b.position).slice(0, 3);

      // Se não houver pelo menos 3 colunas, mostrar todas disponíveis
      if (simplifiedCols.length < 3) {
        return baseColumns;
      }
      return simplifiedCols;
    }
    return baseColumns;
  }, [getVisibleColumns, simplifiedMode, viewMode]);

  // Item 2: Calcular contadores de tarefas por tipo de coluna
  const taskCounters = useMemo(() => {
    if (viewMode !== "all") return null;
    const counters: {
      total: number;
      recorrente?: number;
      afazer?: number;
      emprogresso?: number;
      futuro?: number;
    } = {
      total: 0
    };
    filteredTasks.forEach(task => {
      counters.total++;
      const column = visibleColumns.find(col => col.id === task.column_id);
      if (column) {
        const columnName = column.name.toLowerCase();

        // Identificar tipo de coluna
        if (columnName.includes("recorrente")) {
          counters.recorrente = (counters.recorrente || 0) + 1;
        } else if (columnName.includes("fazer") || columnName.includes("pendente") || columnName.includes("backlog")) {
          counters.afazer = (counters.afazer || 0) + 1;
        } else if (columnName.includes("progresso") || columnName.includes("andamento") || columnName.includes("doing")) {
          counters.emprogresso = (counters.emprogresso || 0) + 1;
        } else if (columnName.includes("futuro") || columnName.includes("próximo") || columnName.includes("planejado")) {
          counters.futuro = (counters.futuro || 0) + 1;
        }
      }
    });
    return counters;
  }, [filteredTasks, visibleColumns, viewMode]);
  // OTIMIZAÇÃO FASE 3: Skeleton loading em vez de texto
  if (loadingCategories || loadingColumns) {
    return <KanbanLoadingSkeleton />;
  }
  return (
    <div className="min-h-screen bg-background pb-[140px] md:pb-0 flex">
      <Sidebar 
        onExport={handleExport} 
        onImport={handleImport} 
        onThemeToggle={toggleTheme} 
        onViewChange={setViewMode} 
        viewMode={viewMode} 
      />

      <main className="flex-1 overflow-auto">
        {/* Kanban Diário - modo daily */}
        {viewMode === "daily" && dailyCategory && visibleColumns.length > 0 && (
          <DailyKanbanView
            columns={visibleColumns}
            allColumns={columns}
            categories={categories}
            dailyCategory={dailyCategory}
            availableTags={dailyAvailableTags}
            boardKey={dailyBoardKey}
            densityMode={densityMode}
            hideBadges={hideBadgesMobile}
            gridColumns={dailyGridColumnsMobile}
            showFavoritesPanel={showFavoritesPanel}
            sortOption={dailySortOption}
            sortOrder={dailySortOrder}
            searchTerm={dailySearchTerm}
            priorityFilter={dailyPriorityFilter}
            tagFilter={dailyTagFilter}
            dueDateFilter={dailyDueDateFilter}
            onSearchChange={setDailySearchTerm}
            onPriorityChange={setDailyPriorityFilter}
            onTagChange={setDailyTagFilter}
            onDueDateChange={setDailyDueDateFilter}
            onClearFilters={() => {
              setDailyPriorityFilter("all");
              setDailyTagFilter("all");
              setDailySearchTerm("");
              setDailyDueDateFilter("all");
            }}
            onResetRecurrentTasks={handleResetRecurrentTasks}
            onEqualizeColumns={handleEqualizeColumns}
            hiddenColumns={hiddenColumns}
            onToggleColumnVisibility={toggleColumnVisibility}
            onDeleteColumn={deleteColumn}
            onResetToDefault={resetToDefaultView}
            onRenameColumn={renameColumn}
            onAddColumn={addColumn}
            onReorderColumns={reorderColumns}
            onToggleKanbanVisibility={toggleColumnKanbanVisibility}
            showTemplates={showTemplates}
            onShowTemplatesChange={setShowTemplates}
            showColumnManager={showColumnManager}
            onShowColumnManagerChange={setShowColumnManager}
          />
        )}
        
        {/* Todos os Projetos - modo all */}
        {viewMode === "all" && visibleColumns.length > 0 && (
          <ProjectsKanbanView
            columns={visibleColumns}
            allColumns={columns}
            categories={categories}
            tasks={tasks}
            filteredTasks={filteredTasks}
            notes={notes}
            notebooks={notebooks}
            availableTags={availableTags}
            taskCounters={taskCounters}
            boardKey={projectsBoardKey}
            isMobile={isMobile}
            simplifiedMode={simplifiedMode}
            densityMode={densityMode}
            hideBadges={hideBadgesMobile}
            gridColumns={projectsGridColumnsMobile}
            displayMode={displayMode}
            sortOption={projectsSortOption}
            searchTerm={searchTerm}
            priorityFilter={priorityFilter}
            tagFilter={tagFilter}
            dueDateFilter={projectsDueDateFilter}
            categoryFilter={categoryFilter}
            categoryFilterInitialized={categoryFilterInitialized}
            onSearchChange={setSearchTerm}
            onPriorityChange={setPriorityFilter}
            onTagChange={setTagFilter}
            onDueDateChange={setProjectsDueDateFilter}
            onCategoryChange={setCategoryFilter}
            onDisplayModeChange={(value) => setDisplayMode(value as "by_category" | "all_tasks")}
            onClearFilters={() => {
              handleClearFilters();
              setProjectsDueDateFilter("all");
            }}
            onTaskSelect={handleTaskSelect}
            onEqualizeColumns={handleEqualizeColumns}
            hiddenColumns={hiddenColumns}
            onToggleColumnVisibility={toggleColumnVisibility}
            onDeleteColumn={deleteColumn}
            onResetToDefault={resetToDefaultView}
            onRenameColumn={renameColumn}
            onAddColumn={addColumn}
            onReorderColumns={reorderColumns}
            onToggleKanbanVisibility={toggleColumnKanbanVisibility}
            showStats={showStats}
            onShowStatsChange={setShowStats}
            showColumnManager={showColumnManager}
            onShowColumnManagerChange={setShowColumnManager}
          />
        )}
      </main>

      {/* Dialog de Histórico */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📋 Histórico de Atividades</DialogTitle>
          </DialogHeader>
          <ActivityHistory taskId={selectedTaskForHistory} />
        </DialogContent>
      </Dialog>

      {/* Modal de Preview de Importação */}
      <ImportPreviewModal
        open={showImportPreview}
        onOpenChange={setShowImportPreview}
        validationResult={importValidation}
        mergeResult={importMerge}
        fileName={importFileName}
        onConfirmImport={handleConfirmImport}
        isImporting={isImporting}
      />

      {/* Modal de Nova Tarefa via Ctrl+N */}
      <TaskModal
        open={showQuickTaskModal}
        onOpenChange={setShowQuickTaskModal}
        onSave={async (taskData) => {
          if (!taskData.column_id || !taskData.category_id) {
            toast({
              title: "Erro",
              description: "Selecione uma categoria e coluna",
              variant: "destructive"
            });
            return;
          }
          await addTask(taskData);
          toast({
            title: "Tarefa criada",
            description: "Sua tarefa foi adicionada com sucesso"
          });
        }}
        columnId={columns[0]?.id || ""}
        categoryId={viewMode === "daily" ? dailyCategory : (categories.find(c => c.name !== "Diário")?.id || "")}
        isDailyKanban={viewMode === "daily"}
        columns={columns}
      />

      {/* Daily Review Modal */}
      <DailyReviewModal
        open={showDailyReview}
        onOpenChange={setShowDailyReview}
        tasks={allTasks}
      />
    </div>
  );
}
export default Index;