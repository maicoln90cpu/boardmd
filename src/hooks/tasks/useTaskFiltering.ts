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
  priorityFilter?: string;
  tagFilter?: string;
  dueDateFilter?: string;
  categoryFilter?: string[];
  categoryFilterInitialized?: boolean;
  excludeCategoryId?: string;
  selectedCategoryFilterMobile?: string;
  isMobile?: boolean;
  viewMode?: "daily" | "all";
}

export function useTaskFiltering(
  tasks: Task[],
  categories: Category[],
  options: TaskFilterOptions
) {
  const {
    searchTerm = "",
    priorityFilter = "all",
    tagFilter = "all",
    dueDateFilter = "all",
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

  // Aplicar filtros de busca, prioridade, tag e data usando funções centralizadas
  const filteredTasks = useMemo(() => {
    let result = categoryFilteredTasks;

    // Filtro de busca
    if (searchTerm) {
      result = filterBySearchTerm(result, searchTerm);
    }

    // Filtro de prioridade
    if (priorityFilter !== "all") {
      result = filterByPriority(result, priorityFilter);
    }

    // Filtro de tag
    if (tagFilter !== "all") {
      result = filterByTag(result, tagFilter);
    }

    // Filtro de data de vencimento
    if (dueDateFilter !== "all") {
      result = filterByDueDate(result, dueDateFilter);
    }

    return result;
  }, [categoryFilteredTasks, searchTerm, priorityFilter, tagFilter, dueDateFilter]);

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
