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
  addDays,
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
  | "today"
  | "tomorrow"
  | "next_7_days"
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

// ============= Helpers =============

/**
 * Normaliza filtro para array (suporte a multi-select)
 */
const normalizeFilterToArray = (filter: string | string[]): string[] => {
  if (Array.isArray(filter)) return filter;
  if (filter === "all" || filter === "") return [];
  return [filter];
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
 * Filtra tarefas por prioridade (suporta múltiplos valores)
 */
export function filterByPriority<T extends TaskLike>(
  tasks: T[],
  priorityFilter: string | string[]
): T[] {
  const priorities = normalizeFilterToArray(priorityFilter);
  if (priorities.length === 0) return tasks;
  return tasks.filter((task) => priorities.includes(task.priority || "medium"));
}

/**
 * Filtra tarefas por tag (suporta múltiplos valores)
 */
export function filterByTag<T extends TaskLike>(
  tasks: T[],
  tagFilter: string | string[]
): T[] {
  const tags = normalizeFilterToArray(tagFilter);
  if (tags.length === 0) return tasks;
  return tasks.filter((task) => 
    task.tags?.some((tag) => tags.includes(tag))
  );
}

/**
 * Verifica se uma tarefa corresponde a um filtro de data específico
 * Usa date-fns para comparações precisas de data
 */
function matchesDueDateFilter<T extends TaskLike>(
  task: T,
  filter: string,
  today: Date
): boolean {
  if (!task.due_date) {
    return filter === "no_date";
  }

  // Parse da data com tratamento de timezone
  const taskDueDate = parseISO(task.due_date);

  switch (filter) {
    case "no_date":
      return false; // Já tratado acima

    case "overdue":
      // Atrasada = antes de hoje E não é hoje E não está concluída
      return isBefore(startOfDay(taskDueDate), today) && !task.is_completed;

    case "today":
      return isToday(taskDueDate);

    case "tomorrow":
      return isTomorrow(taskDueDate);

    case "next_7_days": {
      const next7Days = addDays(today, 7);
      const taskDay = startOfDay(taskDueDate);
      return !isBefore(taskDay, today) && !isAfter(taskDay, next7Days);
    }

    case "week":
    case "this_week": {
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
      const taskDay = startOfDay(taskDueDate);
      return !isBefore(taskDay, weekStart) && !isAfter(taskDay, weekEnd);
    }

    case "month": {
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const taskDay = startOfDay(taskDueDate);
      return !isBefore(taskDay, monthStart) && !isAfter(taskDay, monthEnd);
    }

    default:
      return true;
  }
}

/**
 * Filtra tarefas por data de vencimento (versão KanbanBoard)
 * Suporta múltiplos valores (OR logic)
 */
export function filterByDueDateKanban<T extends TaskLike & { recurrence_rule?: unknown }>(
  tasks: T[],
  dueDateFilter: DueDateFilterType | string | string[],
  hideCompleted: boolean = false
): T[] {
  let filtered = tasks;

  if (hideCompleted) {
    // Tarefas recorrentes SEMPRE são exibidas, mesmo concluídas (ficam riscadas até reset)
    filtered = filtered.filter((task) => {
      if (task.recurrence_rule) return true; // Recorrentes sempre visíveis
      return !task.is_completed;
    });
  }

  const filters = normalizeFilterToArray(dueDateFilter as string | string[]);
  if (filters.length === 0) return filtered;

  const today = startOfToday();

  return filtered.filter((task) =>
    filters.some((filter) => matchesDueDateFilter(task, filter, today))
  );
}

/**
 * Filtra tarefas por data de vencimento (versão useTaskFiltering)
 * Suporta múltiplos valores (OR logic)
 */
export function filterByDueDate<T extends TaskLike>(
  tasks: T[],
  dueDateFilter: string | string[]
): T[] {
  const filters = normalizeFilterToArray(dueDateFilter);
  if (filters.length === 0) return tasks;

  const today = startOfDay(new Date());

  return tasks.filter((task) => {
    return filters.some((filter) => {
      if (filter === "no_date") {
        return !task.due_date;
      }

      if (!task.due_date) {
        return false;
      }

      const dueDate = parseISO(task.due_date);

      switch (filter) {
        case "today":
          return isToday(dueDate);
        case "tomorrow":
          return isTomorrow(dueDate);
        case "next_7_days": {
          const next7Days = addDays(today, 7);
          return !isBefore(dueDate, today) && !isAfter(dueDate, next7Days);
        }
        case "this_week":
          return isThisWeek(dueDate, { weekStartsOn: 1 });
        case "overdue":
          return isPast(dueDate) && !isToday(dueDate);
        default:
          return true;
      }
    });
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
export function applyAllFilters<T extends TaskLike & { recurrence_rule?: unknown }>(
  tasks: T[],
  options: {
    searchTerm?: string;
    priorityFilter?: string | string[];
    tagFilter?: string | string[];
    dueDateFilter?: string | string[];
    hideCompleted?: boolean;
  }
): T[] {
  let result = tasks;

  if (options.hideCompleted) {
    // Tarefas recorrentes SEMPRE são exibidas, mesmo concluídas (ficam riscadas até reset)
    result = result.filter((task) => {
      if (task.recurrence_rule) return true; // Recorrentes sempre visíveis
      return !task.is_completed;
    });
  }

  if (options.searchTerm) {
    result = filterBySearchTerm(result, options.searchTerm);
  }

  if (options.priorityFilter) {
    const priorities = normalizeFilterToArray(options.priorityFilter);
    if (priorities.length > 0) {
      result = filterByPriority(result, priorities);
    }
  }

  if (options.tagFilter) {
    const tags = normalizeFilterToArray(options.tagFilter);
    if (tags.length > 0) {
      result = filterByTag(result, tags);
    }
  }

  if (options.dueDateFilter) {
    const dates = normalizeFilterToArray(options.dueDateFilter);
    if (dates.length > 0) {
      result = filterByDueDate(result, dates);
    }
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
    priorityFilter?: string | string[];
    tagFilter?: string | string[];
    dueDateFilter?: string | string[];
    hideCompleted?: boolean;
  },
  sortOption: SortOptionType = "manual"
): T[] {
  const filtered = applyAllFilters(tasks, filterOptions);
  return sortTasksByOption(filtered, sortOption);
}