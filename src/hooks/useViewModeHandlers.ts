import { useMemo, useCallback } from "react";
import { Task } from "@/hooks/tasks/useTasks";
import { Column } from "@/hooks/data/useColumns";

interface UseViewModeHandlersProps {
  viewMode: "daily" | "all";
  allTasks: Task[];
  categories: Array<{ id: string; name: string }>;
  dailyCategory: string | null;
  selectedCategory: string | null;
  categoryFilter: string[];
  categoryFilterInitialized: boolean;
  selectedCategoryFilterMobile: string;
  isMobile: boolean;
  simplifiedMode: boolean;
  getVisibleColumns: (kanbanType: 'daily' | 'projects') => Column[];
  refreshDailyBoard: () => void;
  refreshProjectsBoard: () => void;
}

export function useViewModeHandlers({
  viewMode,
  allTasks,
  categories,
  dailyCategory,
  selectedCategory,
  categoryFilter,
  categoryFilterInitialized,
  selectedCategoryFilterMobile,
  isMobile,
  simplifiedMode,
  getVisibleColumns,
  refreshDailyBoard,
  refreshProjectsBoard,
}: UseViewModeHandlersProps) {
  
  // Filter tasks based on viewMode
  const tasks = useMemo(() => {
    if (viewMode === "daily" && dailyCategory) {
      return allTasks.filter(task => task.category_id === dailyCategory);
    }
    return allTasks;
  }, [allTasks, viewMode, dailyCategory]);

  // Filter tasks based on viewMode and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const dailyCat = categories.find(c => c.name === "Diário");

      // In "all" mode, exclude daily tasks
      if (viewMode === "all" && task.category_id === dailyCat?.id) {
        return false;
      }

      // Filter by selected category in sidebar (high priority)
      if (viewMode === "all" && selectedCategory && task.category_id !== selectedCategory) {
        return false;
      }

      // Category filter (only in "all" mode after initialization)
      if (viewMode === "all" && !selectedCategory && categoryFilterInitialized && categoryFilter.length > 0 && !categoryFilter.includes(task.category_id)) {
        return false;
      }

      // Mobile category filter
      if (isMobile && viewMode === "all" && selectedCategoryFilterMobile !== "all") {
        if (task.category_id !== selectedCategoryFilterMobile) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, viewMode, categoryFilter, categories, isMobile, selectedCategoryFilterMobile, categoryFilterInitialized, selectedCategory]);

  // Available tags
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    filteredTasks.forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [filteredTasks]);

  // Available tags in Daily Kanban
  const dailyAvailableTags = useMemo(() => {
    if (!dailyCategory) return [];
    const tags = new Set<string>();
    allTasks.filter(task => task.category_id === dailyCategory).forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [allTasks, dailyCategory]);

  // Calculate visible columns considering simplified mode
  const visibleColumns = useMemo(() => {
    const kanbanType = viewMode === "daily" ? 'daily' : 'projects';
    const baseColumns = getVisibleColumns(kanbanType);
    if (simplifiedMode && viewMode === "all") {
      const simplifiedCols = baseColumns.sort((a, b) => a.position - b.position).slice(0, 3);
      if (simplifiedCols.length < 3) {
        return baseColumns;
      }
      return simplifiedCols;
    }
    return baseColumns;
  }, [getVisibleColumns, simplifiedMode, viewMode]);

  // Task counters by column type
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

  // Equalize column widths
  const handleEqualizeColumns = useCallback(() => {
    const equalSize = 100 / visibleColumns.length;
    const equalSizes = visibleColumns.map(() => equalSize);
    if (viewMode === "daily") {
      localStorage.setItem(`kanban-column-sizes-${dailyCategory}`, JSON.stringify(equalSizes));
      refreshDailyBoard();
    } else {
      localStorage.setItem(`kanban-column-sizes-all`, JSON.stringify(equalSizes));
      const nonDailyCategories = categories.filter(c => c.name !== "Diário");
      nonDailyCategories.forEach(cat => {
        localStorage.setItem(`kanban-column-sizes-${cat.id}`, JSON.stringify(equalSizes));
      });
      window.dispatchEvent(new Event('storage'));
      refreshProjectsBoard();
    }
  }, [visibleColumns, viewMode, dailyCategory, categories, refreshDailyBoard, refreshProjectsBoard]);

  return {
    tasks,
    filteredTasks,
    availableTags,
    dailyAvailableTags,
    visibleColumns,
    taskCounters,
    handleEqualizeColumns,
  };
}
