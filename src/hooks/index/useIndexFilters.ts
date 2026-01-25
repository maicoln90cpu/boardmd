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
    categoryFilter,
    categoryFilterInitialized,
    selectedCategoryFilterMobile,
    setSelectedCategory,
    setCategoryFilter,
    setSelectedCategoryFilterMobile,
    clearCategoryFilters,
  } = useCategoryFilters(categories);

  // Synced filters from settings - agora como arrays
  const searchTerm = settings.filters?.search ?? "";
  
  // Priority filter - converter para array se for string legado
  const priorityFilterRaw = settings.filters?.priority ?? "all";
  const priorityFilter: string[] = Array.isArray(priorityFilterRaw) 
    ? priorityFilterRaw 
    : (priorityFilterRaw === "all" || priorityFilterRaw === "") 
      ? [] 
      : [priorityFilterRaw];
  
  // Tag filter - converter para array se for string legado
  const tagFilterRaw = settings.filters?.tag ?? "all";
  const tagFilter: string[] = Array.isArray(tagFilterRaw)
    ? tagFilterRaw
    : (tagFilterRaw === "all" || tagFilterRaw === "")
      ? []
      : [tagFilterRaw];
  
  // Daily filters (legado - manter compatibilidade)
  const dailyPriorityFilter = settings.filters?.dailyPriority ?? "all";
  const dailyTagFilter = settings.filters?.dailyTag ?? "all";
  const dailySearchTerm = settings.filters?.dailySearch ?? "";
  
  // Date filters from settings.kanban - converter para array
  const dailyDueDateFilterRaw = settings.kanban.dailyDueDateFilter;
  const dailyDueDateFilter: string[] = Array.isArray(dailyDueDateFilterRaw)
    ? dailyDueDateFilterRaw
    : (dailyDueDateFilterRaw === "all" || dailyDueDateFilterRaw === "")
      ? []
      : [dailyDueDateFilterRaw];
  
  const projectsDueDateFilterRaw = settings.kanban.projectsDueDateFilter;
  const projectsDueDateFilter: string[] = Array.isArray(projectsDueDateFilterRaw)
    ? projectsDueDateFilterRaw
    : (projectsDueDateFilterRaw === "all" || projectsDueDateFilterRaw === "")
      ? []
      : [projectsDueDateFilterRaw];
  
  // Recurrence filter from settings.filters
  const recurrenceFilter = (settings.filters?.recurrence ?? "all") as "all" | "recurring" | "non-recurring";

  // Debounced save to avoid multiple writes
  const debouncedSave = useDebounceCallback(() => {
    saveSettings();
  }, 500);

  // Setters que atualizam settings localmente e salvam com debounce
  const setSearchTerm = useCallback((value: string) => {
    updateSettings({ filters: { ...settings.filters, search: value } });
    debouncedSave();
  }, [updateSettings, settings.filters, debouncedSave]);

  // Priority filter - aceita string ou array
  const setPriorityFilter = useCallback((value: string | string[]) => {
    const arrayValue = Array.isArray(value) ? value : (value === "all" ? [] : [value]);
    updateSettings({ filters: { ...settings.filters, priority: arrayValue as any } });
    debouncedSave();
  }, [updateSettings, settings.filters, debouncedSave]);

  // Tag filter - aceita string ou array
  const setTagFilter = useCallback((value: string | string[]) => {
    const arrayValue = Array.isArray(value) ? value : (value === "all" ? [] : [value]);
    updateSettings({ filters: { ...settings.filters, tag: arrayValue as any } });
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

  // Due date filters - aceitam string ou array
  const setDailyDueDateFilter = useCallback((value: string | string[]) => {
    const arrayValue = Array.isArray(value) ? value : (value === "all" ? [] : [value]);
    updateSettings({ kanban: { ...settings.kanban, dailyDueDateFilter: arrayValue as any } });
    debouncedSave();
  }, [updateSettings, settings.kanban, debouncedSave]);

  const setProjectsDueDateFilter = useCallback((value: string | string[]) => {
    const arrayValue = Array.isArray(value) ? value : (value === "all" ? [] : [value]);
    updateSettings({ kanban: { ...settings.kanban, projectsDueDateFilter: arrayValue as any } });
    debouncedSave();
  }, [updateSettings, settings.kanban, debouncedSave]);

  const setRecurrenceFilter = useCallback((value: "all" | "recurring" | "non-recurring") => {
    updateSettings({ filters: { ...settings.filters, recurrence: value } });
    debouncedSave();
  }, [updateSettings, settings.filters, debouncedSave]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setPriorityFilter([]);
    setTagFilter([]);
    clearCategoryFilters();
    setDailyDueDateFilter([]);
    setProjectsDueDateFilter([]);
    setRecurrenceFilter("all");
  }, [setSearchTerm, setPriorityFilter, setTagFilter, clearCategoryFilters, setDailyDueDateFilter, setProjectsDueDateFilter, setRecurrenceFilter]);

  return {
    // Settings access
    settings,
    updateSettings,
    saveSettings,
    
    // Category filters
    selectedCategory,
    categoryFilter,
    categoryFilterInitialized,
    selectedCategoryFilterMobile,
    setSelectedCategory,
    setCategoryFilter,
    setSelectedCategoryFilterMobile,
    clearCategoryFilters,
    
    // Search and filters - retorna arrays
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
    
    // Date filters - retorna arrays
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