import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCategories } from "@/hooks/data/useCategories";
import { useColumns } from "@/hooks/data/useColumns";
import { useTasks, Task } from "@/hooks/tasks/useTasks";
import { useNotes } from "@/hooks/useNotes";
import { useNotebooks } from "@/hooks/useNotebooks";
import { useSettings } from "@/hooks/data/useSettings";
import { useCategoryFilters } from "@/hooks/useCategoryFilters";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/useToast";
import { useActivityLog } from "@/hooks/useActivityLog";

export function useIndexState() {
  const { toast } = useToast();
  const { addActivity } = useActivityLog();
  const [searchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Board keys for force refresh
  const [dailyBoardKey, setDailyBoardKey] = useState(0);
  const [projectsBoardKey, setProjectsBoardKey] = useState(0);
  
  // View mode and modals
  const [viewMode, setViewMode] = useState<"daily" | "all">("daily");
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"by_category" | "all_tasks">("all_tasks");
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);

  // Data hooks
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
  
  // Settings (inclui filtros sincronizados)
  const { settings, updateSettings, saveSettings } = useSettings();

  // Category filters
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

  // Filtros sincronizados via settings (migrados de localStorage)
  const searchTerm = settings.filters?.search ?? "";
  const priorityFilter = settings.filters?.priority ?? "all";
  const tagFilter = settings.filters?.tag ?? "all";
  const dailyPriorityFilter = settings.filters?.dailyPriority ?? "all";
  const dailyTagFilter = settings.filters?.dailyTag ?? "all";
  const dailySearchTerm = settings.filters?.dailySearch ?? "";
  
  // Date filters from settings.kanban
  const dailyDueDateFilter = settings.kanban.dailyDueDateFilter;
  const projectsDueDateFilter = settings.kanban.projectsDueDateFilter;

  // Setters que atualizam settings e salvam no banco
  const setSearchTerm = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, search: value } });
    // Debounce save para não sobrecarregar
  }, [updateSettings, settings.filters]);

  const setPriorityFilter = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, priority: value } });
    saveSettings();
  }, [updateSettings, settings.filters, saveSettings]);

  const setTagFilter = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, tag: value } });
    saveSettings();
  }, [updateSettings, settings.filters, saveSettings]);

  const setDailyPriorityFilter = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, dailyPriority: value } });
    saveSettings();
  }, [updateSettings, settings.filters, saveSettings]);

  const setDailyTagFilter = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, dailyTag: value } });
    saveSettings();
  }, [updateSettings, settings.filters, saveSettings]);

  const setDailySearchTerm = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, dailySearch: value } });
    // Debounce save para não sobrecarregar
  }, [updateSettings, settings.filters]);

  const setDailyDueDateFilter = useCallback((value: string) => {
    updateSettings({ kanban: { ...settings.kanban, dailyDueDateFilter: value } });
    saveSettings();
  }, [updateSettings, settings.kanban, saveSettings]);

  const setProjectsDueDateFilter = useCallback((value: string) => {
    updateSettings({ kanban: { ...settings.kanban, projectsDueDateFilter: value } });
    saveSettings();
  }, [updateSettings, settings.kanban, saveSettings]);

  // Tasks
  const {
    tasks: allTasks,
    resetAllTasksToFirstColumn: resetDailyTasks,
    updateTask: updateDailyTask,
    addTask
  } = useTasks("all");

  // Derived values from settings
  const simplifiedMode = settings.kanban.simplifiedMode;
  const dailySortOption = settings.kanban.dailySortOption;
  const dailySortOrder = settings.kanban.dailySortOrder;
  const densityMode = settings.defaultDensity;
  const showFavoritesPanel = settings.kanban.showFavoritesPanel;
  const hideBadgesMobile = settings.mobile.hideBadges;
  const dailyGridColumnsMobile = settings.mobile.dailyGridColumns;
  const projectsGridColumnsMobile = settings.mobile.projectsGridColumns;
  const projectsSortOption = settings.kanban.projectsSortOption;
  const projectsSortOrder = settings.kanban.projectsSortOrder;

  // Refresh board functions
  const refreshDailyBoard = useCallback(() => setDailyBoardKey(k => k + 1), []);
  const refreshProjectsBoard = useCallback(() => setProjectsBoardKey(k => k + 1), []);
  const refreshAllBoards = useCallback(() => {
    setDailyBoardKey(k => k + 1);
    setProjectsBoardKey(k => k + 1);
  }, []);

  // Task reordering
  const handleReorderDailyTasks = useCallback(async (reorderedTasks: Array<{ id: string; position: number }>) => {
    if (!updateDailyTask) return;
    try {
      for (const { id, position } of reorderedTasks) {
        await supabase
          .from("tasks")
          .update({ position, updated_at: new Date().toISOString() })
          .eq("id", id);
      }
      window.dispatchEvent(new CustomEvent('task-updated'));
      refreshDailyBoard();
      addActivity("ai_organize", "Tarefas organizadas com IA");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error reordering tasks:", error);
      toast({
        title: "Erro ao reordenar tarefas",
        variant: "destructive"
      });
    }
  }, [updateDailyTask, addActivity, toast, refreshDailyBoard]);

  // Task select for history
  const handleTaskSelect = useCallback((task: Task) => {
    setSelectedTaskForHistory(task.id);
    setShowHistory(true);
  }, []);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setPriorityFilter("all");
    setTagFilter("all");
    clearCategoryFilters();
    setDisplayMode("by_category");
    // Clear date filters as well
    setDailyDueDateFilter("all");
    setProjectsDueDateFilter("all");
  }, [setSearchTerm, setPriorityFilter, setTagFilter, clearCategoryFilters, setDailyDueDateFilter, setProjectsDueDateFilter]);

  return {
    // Refs
    searchInputRef,
    
    // Loading states
    loadingCategories,
    loadingColumns,
    
    // Board keys
    dailyBoardKey,
    projectsBoardKey,
    refreshDailyBoard,
    refreshProjectsBoard,
    refreshAllBoards,
    
    // View state
    viewMode,
    setViewMode,
    displayMode,
    setDisplayMode,
    
    // Modals
    showStats,
    setShowStats,
    showHistory,
    setShowHistory,
    showTemplates,
    setShowTemplates,
    showColumnManager,
    setShowColumnManager,
    showQuickTaskModal,
    setShowQuickTaskModal,
    selectedTaskForHistory,
    
    // Data
    categories,
    columns,
    notes,
    notebooks,
    allTasks,
    addTask,
    addCategory,
    
    // Column operations
    hiddenColumns,
    toggleColumnVisibility,
    getVisibleColumns,
    resetToDefaultView,
    deleteColumn,
    renameColumn,
    reorderColumns,
    addColumn,
    toggleColumnKanbanVisibility,
    
    // Settings
    settings,
    updateSettings,
    saveSettings,
    simplifiedMode,
    dailySortOption,
    dailySortOrder,
    densityMode,
    showFavoritesPanel,
    hideBadgesMobile,
    dailyGridColumnsMobile,
    projectsGridColumnsMobile,
    projectsSortOption,
    projectsSortOrder,
    dailyDueDateFilter,
    projectsDueDateFilter,
    
    // Category filters
    selectedCategory,
    dailyCategory,
    categoryFilter,
    categoryFilterInitialized,
    selectedCategoryFilterMobile,
    setSelectedCategory,
    setCategoryFilter,
    setSelectedCategoryFilterMobile,
    clearCategoryFilters,
    
    // Search and filters
    searchTerm,
    setSearchTerm,
    priorityFilter,
    setPriorityFilter,
    tagFilter,
    setTagFilter,
    dailyPriorityFilter,
    setDailyPriorityFilter,
    dailyTagFilter,
    setDailyTagFilter,
    dailySearchTerm,
    setDailySearchTerm,
    
    // Date filters (local storage for immediate sync)
    setDailyDueDateFilter,
    setProjectsDueDateFilter,
    
    // Task reset
    resetDailyTasks,
    
    // Handlers
    handleReorderDailyTasks,
    handleTaskSelect,
    handleClearFilters,
  };
}
