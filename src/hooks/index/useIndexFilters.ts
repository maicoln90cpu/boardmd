import { useCallback } from "react";
import { useSettings } from "@/hooks/data/useSettings";
import { useCategoryFilters } from "@/hooks/useCategoryFilters";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";
import { Category } from "@/hooks/data/useCategories";

export function useIndexFilters(categories: Category[]) {
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

  // Synced filters from settings
  const searchTerm = settings.filters?.search ?? "";
  const priorityFilter = settings.filters?.priority ?? "all";
  const tagFilter = settings.filters?.tag ?? "all";
  const dailyPriorityFilter = settings.filters?.dailyPriority ?? "all";
  const dailyTagFilter = settings.filters?.dailyTag ?? "all";
  const dailySearchTerm = settings.filters?.dailySearch ?? "";
  
  // Date filters from settings.kanban
  const dailyDueDateFilter = settings.kanban.dailyDueDateFilter;
  const projectsDueDateFilter = settings.kanban.projectsDueDateFilter;
  
  // Recurrence filter from settings.filters
  const recurrenceFilter = (settings.filters?.recurrence ?? "all") as "all" | "recurring" | "non-recurring";

  // Debounced save to avoid multiple writes
  const debouncedSave = useDebounceCallback(() => {
    saveSettings();
  }, 500);

  // Setters that update settings locally and save with debounce
  const setSearchTerm = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, search: value } });
    debouncedSave();
  }, [updateSettings, settings.filters, debouncedSave]);

  const setPriorityFilter = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, priority: value } });
    debouncedSave();
  }, [updateSettings, settings.filters, debouncedSave]);

  const setTagFilter = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, tag: value } });
    debouncedSave();
  }, [updateSettings, settings.filters, debouncedSave]);

  const setDailyPriorityFilter = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, dailyPriority: value } });
    debouncedSave();
  }, [updateSettings, settings.filters, debouncedSave]);

  const setDailyTagFilter = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, dailyTag: value } });
    debouncedSave();
  }, [updateSettings, settings.filters, debouncedSave]);

  const setDailySearchTerm = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, dailySearch: value } });
    debouncedSave();
  }, [updateSettings, settings.filters, debouncedSave]);

  const setDailyDueDateFilter = useCallback((value: string) => {
    updateSettings({ kanban: { ...settings.kanban, dailyDueDateFilter: value } });
    debouncedSave();
  }, [updateSettings, settings.kanban, debouncedSave]);

  const setProjectsDueDateFilter = useCallback((value: string) => {
    updateSettings({ kanban: { ...settings.kanban, projectsDueDateFilter: value } });
    debouncedSave();
  }, [updateSettings, settings.kanban, debouncedSave]);

  const setRecurrenceFilter = useCallback((value: "all" | "recurring" | "non-recurring") => {
    updateSettings({ filters: { ...settings.filters, recurrence: value } });
    debouncedSave();
  }, [updateSettings, settings.filters, debouncedSave]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setPriorityFilter("all");
    setTagFilter("all");
    clearCategoryFilters();
    setDailyDueDateFilter("all");
    setProjectsDueDateFilter("all");
    setRecurrenceFilter("all");
  }, [setSearchTerm, setPriorityFilter, setTagFilter, clearCategoryFilters, setDailyDueDateFilter, setProjectsDueDateFilter, setRecurrenceFilter]);

  return {
    // Settings access
    settings,
    updateSettings,
    saveSettings,
    
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
    
    // Date filters
    dailyDueDateFilter,
    setDailyDueDateFilter,
    projectsDueDateFilter,
    setProjectsDueDateFilter,
    
    // Recurrence filter
    recurrenceFilter,
    setRecurrenceFilter,
    
    // Handler
    handleClearFilters,
  };
}
