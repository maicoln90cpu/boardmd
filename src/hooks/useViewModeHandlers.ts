import { useMemo, useCallback } from "react";
import { Task } from "@/hooks/tasks/useTasks";
import { Column } from "@/hooks/data/useColumns";
import { useSettings } from "@/hooks/data/useSettings";

interface UseViewModeHandlersProps {
  allTasks: Task[];
  categories: Array<{ id: string; name: string }>;
  selectedCategory: string | null;
  categoryFilter: string[];
  categoryFilterInitialized: boolean;
  selectedCategoryFilterMobile: string;
  isMobile: boolean;
  simplifiedMode: boolean;
  getVisibleColumns: (kanbanType: 'daily' | 'projects') => Column[];
  refreshProjectsBoard: () => void;
  recurrenceFilter?: "all" | "recurring" | "non-recurring";
}

export function useViewModeHandlers({
  allTasks,
  categories,
  selectedCategory,
  categoryFilter,
  categoryFilterInitialized,
  selectedCategoryFilterMobile,
  isMobile,
  simplifiedMode,
  getVisibleColumns,
  refreshProjectsBoard,
  recurrenceFilter = "all",
}: UseViewModeHandlersProps) {
  
  // All tasks (já não há mais filtro por Diário)
  const tasks = useMemo(() => {
    return allTasks;
  }, [allTasks]);

  // Filter tasks based on filters
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    // Filter by selected category in sidebar (high priority)
    if (selectedCategory) {
      filtered = filtered.filter(task => task.category_id === selectedCategory);
    }

    // Category filter (after initialization)
    if (!selectedCategory && categoryFilterInitialized && categoryFilter.length > 0) {
      filtered = filtered.filter(task => categoryFilter.includes(task.category_id));
    }

    // Mobile category filter
    if (isMobile && selectedCategoryFilterMobile !== "all") {
      filtered = filtered.filter(task => task.category_id === selectedCategoryFilterMobile);
    }

    // Recurrence filter
    if (recurrenceFilter === "recurring") {
      filtered = filtered.filter(task => task.recurrence_rule !== null);
    } else if (recurrenceFilter === "non-recurring") {
      filtered = filtered.filter(task => task.recurrence_rule === null);
    }

    return filtered;
  }, [tasks, categoryFilter, isMobile, selectedCategoryFilterMobile, categoryFilterInitialized, selectedCategory, recurrenceFilter]);

  // Available tags
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    filteredTasks.forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [filteredTasks]);

  // Calculate visible columns considering simplified mode
  const visibleColumns = useMemo(() => {
    const baseColumns = getVisibleColumns('projects');
    if (simplifiedMode) {
      const simplifiedCols = baseColumns.sort((a, b) => a.position - b.position).slice(0, 3);
      if (simplifiedCols.length < 3) {
        return baseColumns;
      }
      return simplifiedCols;
    }
    return baseColumns;
  }, [getVisibleColumns, simplifiedMode]);

  // Task counters by column type
  const taskCounters = useMemo(() => {
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
  }, [filteredTasks, visibleColumns]);

  // Equalize column widths via settings (sincronizado)
  const { settings, updateSettings, saveSettings } = useSettings();
  
  const handleEqualizeColumns = useCallback(() => {
    const equalSize = 100 / visibleColumns.length;
    const equalSizes = visibleColumns.map(() => equalSize);
    
    // Atualizar via settings (sincronizado no banco)
    const currentColumnSizes = settings.kanban.columnSizes || {};
    
    // Aplicar para todas as categorias de projetos
    const newColumnSizes = { ...currentColumnSizes, all: equalSizes };
    categories.forEach(cat => {
      newColumnSizes[cat.id] = equalSizes;
    });
    
    updateSettings({
      kanban: {
        ...settings.kanban,
        columnSizes: newColumnSizes,
      },
    });
    refreshProjectsBoard();
    
    saveSettings();
  }, [visibleColumns, categories, refreshProjectsBoard, settings, updateSettings, saveSettings]);

  return {
    tasks,
    filteredTasks,
    availableTags,
    visibleColumns,
    taskCounters,
    handleEqualizeColumns,
  };
}
