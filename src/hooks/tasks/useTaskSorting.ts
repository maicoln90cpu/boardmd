import { useMemo } from "react";
import { Task } from "./useTasks";
import { parseISO } from "date-fns";

export type SortOption = "date" | "time" | "name" | "priority" | "position";
export type SortOrder = "asc" | "desc";

export interface TaskSortOptions {
  sortOption?: SortOption;
  sortOrder?: SortOrder;
}

const priorityOrder: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function useTaskSorting(tasks: Task[], options: TaskSortOptions = {}) {
  const { sortOption = "position", sortOrder = "asc" } = options;

  const sortedTasks = useMemo(() => {
    const tasksCopy = [...tasks];

    tasksCopy.sort((a, b) => {
      let comparison = 0;

      switch (sortOption) {
        case "date":
        case "time":
          // Ordenar por data de vencimento
          if (!a.due_date && !b.due_date) {
            comparison = 0;
          } else if (!a.due_date) {
            comparison = 1; // Sem data vai pro final
          } else if (!b.due_date) {
            comparison = -1;
          } else {
            const dateA = parseISO(a.due_date);
            const dateB = parseISO(b.due_date);
            comparison = dateA.getTime() - dateB.getTime();
          }
          break;

        case "name":
          comparison = a.title.localeCompare(b.title, "pt-BR", {
            sensitivity: "base",
          });
          break;

        case "priority":
          const priorityA = priorityOrder[a.priority || "low"] || 0;
          const priorityB = priorityOrder[b.priority || "low"] || 0;
          comparison = priorityB - priorityA; // Alta prioridade primeiro por padrão
          break;

        case "position":
        default:
          comparison = a.position - b.position;
          break;
      }

      // Aplicar ordem (asc/desc)
      return sortOrder === "desc" ? -comparison : comparison;
    });

    return tasksCopy;
  }, [tasks, sortOption, sortOrder]);

  return {
    sortedTasks,
  };
}

// Função utilitária para converter string de sortOption do KanbanBoard
export function parseSortOption(sortOptionString: string): { sortOption: SortOption; sortOrder: SortOrder } {
  if (!sortOptionString || sortOptionString === "position") {
    return { sortOption: "position", sortOrder: "asc" };
  }

  // Formatos esperados: "date_asc", "date_desc", "name_asc", "priority_desc", etc.
  const parts = sortOptionString.split("_");
  const order = parts[parts.length - 1] as SortOrder;
  const option = parts.slice(0, -1).join("_") as SortOption;

  return {
    sortOption: option || "position",
    sortOrder: order === "desc" ? "desc" : "asc",
  };
}
