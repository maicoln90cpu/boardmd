import { useMemo } from "react";
import { Task } from "./useTasks";
import type { Category } from "@/hooks/data/useCategories";
import {
  filterBySearchTerm,
  filterByPriority,
  filterByTag,
  filterByDueDate,
} from "@/lib/taskFilters";

export interface TaskFilterOptions {
  searchTerm?: string;
  priorityFilter?: string | string[];
  tagFilter?: string | string[];
  dueDateFilter?: string | string[];
  recurrenceFilter?: "all" | "recurring" | "non-recurring";
  categoryFilter?: string[];
  categoryFilterInitialized?: boolean;
  excludeCategoryId?: string;
  selectedCategoryFilterMobile?: string;
  isMobile?: boolean;
  viewMode?: "daily" | "all";
}

// Helper para normalizar filtros
const normalizeToArray = (value: string | string[] | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value === "all" || value === "") return [];
  return [value];
};

const hasActiveFilter = (value: string | string[] | undefined): boolean => {
  const arr = normalizeToArray(value);
  return arr.length > 0;
};

export function useTaskFiltering(
  tasks: Task[],
  categories: Category[],
  options: TaskFilterOptions
) {
  const {
    searchTerm = "",
    priorityFilter = [],
    tagFilter = [],
    dueDateFilter = [],
    recurrenceFilter = "all",
    categoryFilter = [],
    categoryFilterInitialized = false,
    excludeCategoryId,
    selectedCategoryFilterMobile = "all",
    isMobile = false,
    viewMode = "all",
  } = options;

  // Filtrar tasks por categoria (exclui categoria especificada)
  const categoryFilteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Excluir categoria específica (ex: Diário no modo projetos)
      if (excludeCategoryId && task.category_id === excludeCategoryId) {
        return false;
      }

      // Filtro de categoria desktop
      if (viewMode === "all" && categoryFilterInitialized && categoryFilter.length > 0) {
        if (!categoryFilter.includes(task.category_id)) {
          return false;
        }
      }

      // Filtro mobile de categoria
      if (isMobile && viewMode === "all" && selectedCategoryFilterMobile !== "all") {
        if (task.category_id !== selectedCategoryFilterMobile) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, excludeCategoryId, categoryFilter, categoryFilterInitialized, selectedCategoryFilterMobile, isMobile, viewMode]);

  // Aplicar filtros de busca, prioridade, tag, data e recorrência
  const filteredTasks = useMemo(() => {
    let result = categoryFilteredTasks;

    // Filtro de busca
    if (searchTerm) {
      result = filterBySearchTerm(result, searchTerm);
    }

    // Filtro de prioridade (suporta array)
    if (hasActiveFilter(priorityFilter)) {
      result = filterByPriority(result, priorityFilter);
    }

    // Filtro de tag (suporta array)
    if (hasActiveFilter(tagFilter)) {
      result = filterByTag(result, tagFilter);
    }

    // Filtro de data de vencimento (suporta array)
    if (hasActiveFilter(dueDateFilter)) {
      result = filterByDueDate(result, dueDateFilter);
    }

    // Filtro de recorrência
    if (recurrenceFilter === "recurring") {
      result = result.filter(task => task.recurrence_rule !== null);
    } else if (recurrenceFilter === "non-recurring") {
      result = result.filter(task => task.recurrence_rule === null);
    }

    return result;
  }, [categoryFilteredTasks, searchTerm, priorityFilter, tagFilter, dueDateFilter, recurrenceFilter]);

  // Extrair tags disponíveis das tarefas filtradas
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    filteredTasks.forEach((task) => {
      task.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [filteredTasks]);

  return {
    filteredTasks,
    availableTags,
    totalCount: filteredTasks.length,
  };
}