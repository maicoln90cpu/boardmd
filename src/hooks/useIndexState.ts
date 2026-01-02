import { useState, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { useColumns } from "@/hooks/useColumns";
import { useTasks, Task } from "@/hooks/useTasks";
import { useNotes } from "@/hooks/useNotes";
import { useNotebooks } from "@/hooks/useNotebooks";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSettings } from "@/hooks/useSettings";
import { useCategoryFilters } from "@/hooks/useCategoryFilters";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/useToast";
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
  
  // Settings
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

  // Local storage filters
  const [searchTerm, setSearchTerm] = useLocalStorage<string>("filter-search", "");
  const [priorityFilter, setPriorityFilter] = useLocalStorage<string>("filter-priority", "all");
  const [tagFilter, setTagFilter] = useLocalStorage<string>("filter-tag", "all");
  const [dailyPriorityFilter, setDailyPriorityFilter] = useLocalStorage<string>("daily-priority-filter", "all");
  const [dailyTagFilter, setDailyTagFilter] = useLocalStorage<string>("daily-tag-filter", "all");
  const [dailySearchTerm, setDailySearchTerm] = useLocalStorage<string>("daily-search", "");

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
  const dailyDueDateFilter = settings.kanban.dailyDueDateFilter;
  const projectsDueDateFilter = settings.kanban.projectsDueDateFilter;

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
  }, [setSearchTerm, setPriorityFilter, setTagFilter, clearCategoryFilters]);

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
    
    // Task reset
    resetDailyTasks,
    
    // Handlers
    handleReorderDailyTasks,
    handleTaskSelect,
    handleClearFilters,
  };
}
