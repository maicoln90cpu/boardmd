/**
 * Funções utilitárias para filtrar e ordenar tarefas
 * Centraliza lógica usada em múltiplos componentes (KanbanBoard, useTaskFiltering, etc.)
 */

import {
  startOfToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  isBefore,
  isAfter,
  isToday,
  isTomorrow,
  isThisWeek,
  isPast,
  startOfDay,
} from "date-fns";
import { parseDateTimeForSort } from "./dateUtils";

// ============= Tipos =============

export interface TaskLike {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: string | null;
  tags?: string[] | null;
  is_completed?: boolean | null;
  position: number;
  column_id?: string;
  category_id?: string;
}

export type DueDateFilterType =
  | "all"
  | "no_date"
  | "overdue"
  | "overdue_today"
  | "today"
  | "tomorrow"
  | "week"
  | "this_week"
  | "month";

export type SortOptionType =
  | "manual"
  | "name_asc"
  | "name_desc"
  | "priority_asc"
  | "priority_desc"
  | "date_asc"
  | "date_desc";

// ============= Constantes =============

const PRIORITY_ORDER: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

// ============= Funções de Filtro =============

/**
 * Filtra tarefas por termo de busca (título, descrição, tags)
 */
export function filterBySearchTerm<T extends TaskLike>(
  tasks: T[],
  searchTerm: string
): T[] {
  if (!searchTerm) return tasks;

  const searchLower = searchTerm.toLowerCase();
  return tasks.filter((task) => {
    const matchesTitle = task.title.toLowerCase().includes(searchLower);
    const matchesDescription = task.description?.toLowerCase().includes(searchLower);
    const matchesTags = task.tags?.some((tag) => tag.toLowerCase().includes(searchLower));
    return matchesTitle || matchesDescription || matchesTags;
  });
}

/**
 * Filtra tarefas por prioridade
 */
export function filterByPriority<T extends TaskLike>(
  tasks: T[],
  priorityFilter: string
): T[] {
  if (priorityFilter === "all") return tasks;
  return tasks.filter((task) => task.priority === priorityFilter);
}

/**
 * Filtra tarefas por tag
 */
export function filterByTag<T extends TaskLike>(tasks: T[], tagFilter: string): T[] {
  if (tagFilter === "all") return tasks;
  return tasks.filter((task) => task.tags?.includes(tagFilter));
}

/**
 * Filtra tarefas por data de vencimento (versão KanbanBoard)
 * Usada no KanbanBoard com filtros específicos de semana/mês
 */
export function filterByDueDateKanban<T extends TaskLike>(
  tasks: T[],
  dueDateFilter: DueDateFilterType,
  hideCompleted: boolean = false
): T[] {
  let filtered = tasks;

  if (hideCompleted) {
    filtered = filtered.filter((task) => !task.is_completed);
  }

  if (dueDateFilter === "all") return filtered;

  const today = startOfToday();

  return filtered.filter((task) => {
    const taskDueDate = task.due_date ? parseISO(task.due_date) : null;

    switch (dueDateFilter) {
      case "no_date":
        return taskDueDate === null;

      case "overdue":
        return taskDueDate && isBefore(taskDueDate, today) && !task.is_completed;

      case "overdue_today": {
        if (!taskDueDate) return false;
        const isOverdue = isBefore(taskDueDate, today) && !task.is_completed;
        const isToday = taskDueDate.toDateString() === today.toDateString();
        return isOverdue || isToday;
      }

      case "today":
        return taskDueDate && taskDueDate.toDateString() === today.toDateString();

      case "tomorrow":
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return taskDueDate && taskDueDate.toDateString() === tomorrow.toDateString();

      case "week":
      case "this_week": {
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
        return (
          taskDueDate &&
          !isBefore(taskDueDate, weekStart) &&
          !isAfter(taskDueDate, weekEnd)
        );
      }

      case "month": {
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        return (
          taskDueDate &&
          !isBefore(taskDueDate, monthStart) &&
          !isAfter(taskDueDate, monthEnd)
        );
      }

      default:
        return true;
    }
  });
}

/**
 * Filtra tarefas por data de vencimento (versão useTaskFiltering)
 * Usada em hooks com filtros date-fns
 */
export function filterByDueDate<T extends TaskLike>(
  tasks: T[],
  dueDateFilter: string
): T[] {
  if (dueDateFilter === "all") return tasks;

  const today = startOfDay(new Date());

  return tasks.filter((task) => {
    if (dueDateFilter === "no_date") {
      return !task.due_date;
    }

    if (!task.due_date) {
      return false;
    }

    const dueDate = parseISO(task.due_date);

    switch (dueDateFilter) {
      case "today":
        return isToday(dueDate);
      case "tomorrow":
        return isTomorrow(dueDate);
      case "this_week":
        return isThisWeek(dueDate, { weekStartsOn: 1 });
      case "overdue":
        return isPast(dueDate) && !isToday(dueDate);
      case "overdue_today":
        return isPast(dueDate) || isToday(dueDate);
      default:
        return true;
    }
  });
}

// ============= Funções de Ordenação =============

/**
 * Ordena tarefas por opção selecionada
 */
export function sortTasksByOption<T extends TaskLike>(
  tasks: T[],
  sortOption: SortOptionType
): T[] {
  const sorted = [...tasks];

  sorted.sort((a, b) => {
    switch (sortOption) {
      case "name_asc":
        return a.title.localeCompare(b.title, "pt-BR");

      case "name_desc":
        return b.title.localeCompare(a.title, "pt-BR");

      case "priority_asc": {
        const priorityA = PRIORITY_ORDER[a.priority || "medium"] || 2;
        const priorityB = PRIORITY_ORDER[b.priority || "medium"] || 2;
        return priorityA - priorityB;
      }

      case "priority_desc": {
        const priorityA = PRIORITY_ORDER[a.priority || "medium"] || 2;
        const priorityB = PRIORITY_ORDER[b.priority || "medium"] || 2;
        return priorityB - priorityA;
      }

      case "date_asc": {
        const dtA = parseDateTimeForSort(a.due_date, Number.POSITIVE_INFINITY);
        const dtB = parseDateTimeForSort(b.due_date, Number.POSITIVE_INFINITY);
        if (dtA.date !== dtB.date) return dtA.date - dtB.date;
        return dtA.time - dtB.time;
      }

      case "date_desc": {
        const dtA = parseDateTimeForSort(a.due_date, Number.NEGATIVE_INFINITY);
        const dtB = parseDateTimeForSort(b.due_date, Number.NEGATIVE_INFINITY);
        if (dtA.date !== dtB.date) return dtB.date - dtA.date;
        return dtB.time - dtA.time;
      }

      case "manual":
      default:
        return a.position - b.position;
    }
  });

  return sorted;
}

// ============= Funções Combinadas =============

/**
 * Aplica múltiplos filtros de uma vez
 */
export function applyAllFilters<T extends TaskLike>(
  tasks: T[],
  options: {
    searchTerm?: string;
    priorityFilter?: string;
    tagFilter?: string;
    dueDateFilter?: string;
    hideCompleted?: boolean;
  }
): T[] {
  let result = tasks;

  if (options.hideCompleted) {
    result = result.filter((task) => !task.is_completed);
  }

  if (options.searchTerm) {
    result = filterBySearchTerm(result, options.searchTerm);
  }

  if (options.priorityFilter && options.priorityFilter !== "all") {
    result = filterByPriority(result, options.priorityFilter);
  }

  if (options.tagFilter && options.tagFilter !== "all") {
    result = filterByTag(result, options.tagFilter);
  }

  if (options.dueDateFilter && options.dueDateFilter !== "all") {
    result = filterByDueDate(result, options.dueDateFilter);
  }

  return result;
}

/**
 * Filtra e ordena tarefas em uma única operação
 */
export function filterAndSortTasks<T extends TaskLike>(
  tasks: T[],
  filterOptions: {
    searchTerm?: string;
    priorityFilter?: string;
    tagFilter?: string;
    dueDateFilter?: string;
    hideCompleted?: boolean;
  },
  sortOption: SortOptionType = "manual"
): T[] {
  const filtered = applyAllFilters(tasks, filterOptions);
  return sortTasksByOption(filtered, sortOption);
}
