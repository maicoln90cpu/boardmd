import { useMemo } from "react";
import { Task } from "./useTasks";
import { Category } from "./useCategories";
import { isToday, isTomorrow, isThisWeek, isPast, parseISO, startOfDay } from "date-fns";

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

  // Aplicar filtros de busca, prioridade, tag e data
  const filteredTasks = useMemo(() => {
    return categoryFilteredTasks.filter((task) => {
      // Filtro de busca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(searchLower);
        const matchesDescription = task.description?.toLowerCase().includes(searchLower);
        const matchesTags = task.tags?.some((tag) => tag.toLowerCase().includes(searchLower));
        if (!matchesTitle && !matchesDescription && !matchesTags) {
          return false;
        }
      }

      // Filtro de prioridade
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      // Filtro de tag
      if (tagFilter !== "all" && !task.tags?.includes(tagFilter)) {
        return false;
      }

      // Filtro de data de vencimento
      if (dueDateFilter !== "all" && task.due_date) {
        const dueDate = parseISO(task.due_date);
        const today = startOfDay(new Date());

        switch (dueDateFilter) {
          case "today":
            if (!isToday(dueDate)) return false;
            break;
          case "tomorrow":
            if (!isTomorrow(dueDate)) return false;
            break;
          case "this_week":
            if (!isThisWeek(dueDate, { weekStartsOn: 1 })) return false;
            break;
          case "overdue":
            if (!isPast(dueDate) || isToday(dueDate)) return false;
            break;
          case "no_date":
            return false; // Tem data, então não passa neste filtro
        }
      } else if (dueDateFilter === "no_date" && task.due_date) {
        return false; // Filtro "sem data" mas tarefa tem data
      }

      return true;
    });
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
