import { useCallback } from "react";
import { Task } from "@/hooks/tasks/useTasks";
import { useIndexFilters } from "@/hooks/index/useIndexFilters";
import { useIndexViewState } from "@/hooks/index/useIndexViewState";
import { useIndexData } from "@/hooks/index/useIndexData";

export function useIndexState() {
  // Modular hooks
  const viewState = useIndexViewState();
  const data = useIndexData();
  const filters = useIndexFilters(data.categories);

  // Derived values from settings
  const simplifiedMode = filters.settings.kanban.simplifiedMode;
  const densityMode = filters.settings.defaultDensity;
  const showFavoritesPanel = filters.settings.kanban.showFavoritesPanel;
  const hideBadgesMobile = filters.settings.mobile.hideBadges;
  const projectsGridColumnsMobile = filters.settings.mobile.projectsGridColumns;
  const projectsSortOption = filters.settings.kanban.projectsSortOption;
  const projectsSortOrder = filters.settings.kanban.projectsSortOrder;

  const handleTaskSelect = useCallback((task: Task) => {
    data.handleTaskSelect(task, viewState.setSelectedTaskForHistory, viewState.setShowHistory);
  }, [data.handleTaskSelect, viewState.setSelectedTaskForHistory, viewState.setShowHistory]);

  // Clear filters with display mode reset
  const handleClearFilters = useCallback(() => {
    filters.handleClearFilters();
    viewState.setDisplayMode("by_category");
  }, [filters.handleClearFilters, viewState.setDisplayMode]);

  return {
    // Refs
    searchInputRef: viewState.searchInputRef,
    
    // Loading states
    loadingCategories: data.loadingCategories,
    loadingColumns: data.loadingColumns,
    
    // Board keys
    projectsBoardKey: viewState.projectsBoardKey,
    refreshProjectsBoard: viewState.refreshProjectsBoard,
    refreshAllBoards: viewState.refreshAllBoards,
    
    // View state
    displayMode: viewState.displayMode,
    setDisplayMode: viewState.setDisplayMode,
    
    // Modals
    showStats: viewState.showStats,
    setShowStats: viewState.setShowStats,
    showHistory: viewState.showHistory,
    setShowHistory: viewState.setShowHistory,
    showTemplates: viewState.showTemplates,
    setShowTemplates: viewState.setShowTemplates,
    showColumnManager: viewState.showColumnManager,
    setShowColumnManager: viewState.setShowColumnManager,
    showQuickTaskModal: viewState.showQuickTaskModal,
    setShowQuickTaskModal: viewState.setShowQuickTaskModal,
    selectedTaskForHistory: viewState.selectedTaskForHistory,
    
    // Data
    categories: data.categories,
    columns: data.columns,
    notes: data.notes,
    notebooks: data.notebooks,
    allTasks: data.allTasks,
    addTask: data.addTask,
    addCategory: data.addCategory,
    
    // Column operations
    hiddenColumns: data.hiddenColumns,
    toggleColumnVisibility: data.toggleColumnVisibility,
    getVisibleColumns: data.getVisibleColumns,
    resetToDefaultView: data.resetToDefaultView,
    deleteColumn: data.deleteColumn,
    renameColumn: data.renameColumn,
    reorderColumns: data.reorderColumns,
    addColumn: data.addColumn,
    toggleColumnKanbanVisibility: data.toggleColumnKanbanVisibility,
    
    // Settings
    settings: filters.settings,
    updateSettings: filters.updateSettings,
    saveSettings: filters.saveSettings,
    simplifiedMode,
    densityMode,
    showFavoritesPanel,
    hideBadgesMobile,
    projectsGridColumnsMobile,
    projectsSortOption,
    projectsSortOrder,
    projectsDueDateFilter: filters.projectsDueDateFilter,
    
    // Recurrence filter
    recurrenceFilter: filters.recurrenceFilter,
    setRecurrenceFilter: filters.setRecurrenceFilter,
    
    // Category filters
    selectedCategory: filters.selectedCategory,
    categoryFilter: filters.categoryFilter,
    categoryFilterInitialized: filters.categoryFilterInitialized,
    selectedCategoryFilterMobile: filters.selectedCategoryFilterMobile,
    setSelectedCategory: filters.setSelectedCategory,
    setCategoryFilter: filters.setCategoryFilter,
    setSelectedCategoryFilterMobile: filters.setSelectedCategoryFilterMobile,
    clearCategoryFilters: filters.clearCategoryFilters,
    
    // Search and filters
    searchTerm: filters.searchTerm,
    setSearchTerm: filters.setSearchTerm,
    priorityFilter: filters.priorityFilter,
    setPriorityFilter: filters.setPriorityFilter,
    tagFilter: filters.tagFilter,
    setTagFilter: filters.setTagFilter,
    
    // Date filters
    setProjectsDueDateFilter: filters.setProjectsDueDateFilter,
    
    // Handlers
    handleTaskSelect,
    handleClearFilters,
  };
}
