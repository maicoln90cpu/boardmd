import { useState, memo, useCallback, useMemo } from "react";
import { Column } from "@/hooks/data/useColumns";
import { Task } from "@/hooks/tasks/useTasks";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { SwipeableTaskCard } from "./SwipeableTaskCard";
import { MobileChecklistItem } from "./MobileChecklistItem";
import { MobileColumnDrawer } from "./MobileColumnDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/useToast";
import { logger } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";
import { getColumnTopBarClass } from "@/lib/columnStyles";

interface PriorityColors {
  high: { background: string; text: string };
  medium: { background: string; text: string };
  low: { background: string; text: string };
}

interface MobileKanbanViewProps {
  columns: Column[];
  tasks: Task[];
  getTasksForColumn: (columnId: string) => Task[];
  handleAddTask: (columnId: string) => void;
  handleEditTask: (task: Task) => void;
  handleDeleteClick: (taskId: string) => void;
  toggleFavorite: (taskId: string) => void;
  duplicateTask: (taskId: string) => void;
  handleMoveTask: (taskId: string, direction: "left" | "right") => void;
  showCategoryBadge?: boolean;
  densityMode?: "comfortable" | "compact" | "ultra-compact";
  hideBadges?: boolean;
  gridColumns?: 1 | 2;
  priorityColors?: PriorityColors;
  originalCategoriesMap?: Record<string, string>;
  getTagColor?: (tagName: string) => string;
  onAddPoints?: () => void;
}

interface EnrichedTask extends Task {
  columnId: string;
  columnColor: string;
  columnName: string;
  isRecurrent: boolean;
}

type SortMode = "column" | "priority" | "date";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const SORT_LABELS: Record<SortMode, string> = {
  column: "Coluna",
  priority: "Prioridade",
  date: "Data",
};

const SORT_CYCLE: SortMode[] = ["column", "priority", "date"];

export const MobileKanbanView = memo(function MobileKanbanView({
  columns,
  getTasksForColumn,
  handleAddTask,
  handleEditTask,
  handleDeleteClick,
  toggleFavorite,
  priorityColors,
  onAddPoints,
}: MobileKanbanViewProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("column");
  const [moveDrawerOpen, setMoveDrawerOpen] = useState(false);
  const [taskToMove, setTaskToMove] = useState<EnrichedTask | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Achatar todas as tarefas com metadados da coluna
  const allEnrichedTasks = useMemo(() => {
    const result: EnrichedTask[] = [];
    for (const col of columns) {
      const colTasks = getTasksForColumn(col.id);
      const colorClass = getColumnTopBarClass(col.color);
      const isRecurrent = col.name.toLowerCase() === "recorrente";
      for (const task of colTasks) {
        result.push({
          ...task,
          columnId: col.id,
          columnColor: colorClass,
          columnName: col.name,
          isRecurrent,
        });
      }
    }
    return result;
  }, [columns, getTasksForColumn]);

  // Filtrar por coluna ativa
  const filteredTasks = useMemo(() => {
    if (!activeFilter) return allEnrichedTasks;
    return allEnrichedTasks.filter((t) => t.columnId === activeFilter);
  }, [allEnrichedTasks, activeFilter]);

  // Ordenar
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    if (sortMode === "priority") {
      sorted.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority || ""] ?? 3;
        const pb = PRIORITY_ORDER[b.priority || ""] ?? 3;
        return pa - pb;
      });
    } else if (sortMode === "date") {
      sorted.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
    }
    // "column" mantém a ordem original (já agrupada por coluna)
    return sorted;
  }, [filteredTasks, sortMode]);

  // Gerar itens com separadores de grupo (apenas "Todas" + sort "column")
  const renderItems = useMemo(() => {
    const items: Array<{ type: "separator"; columnName: string; columnColor: string; count: number } | { type: "task"; task: EnrichedTask }> = [];

    if (!activeFilter && sortMode === "column") {
      let lastColumnId = "";
      for (const task of sortedTasks) {
        if (task.columnId !== lastColumnId) {
          const count = sortedTasks.filter((t) => t.columnId === task.columnId).length;
          items.push({ type: "separator", columnName: task.columnName, columnColor: task.columnColor, count });
          lastColumnId = task.columnId;
        }
        items.push({ type: "task", task });
      }
    } else {
      for (const task of sortedTasks) {
        items.push({ type: "task", task });
      }
    }
    return items;
  }, [sortedTasks, activeFilter, sortMode]);

  // Contagem por coluna
  const columnCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of allEnrichedTasks) {
      counts[t.columnId] = (counts[t.columnId] || 0) + 1;
    }
    return counts;
  }, [allEnrichedTasks]);

  // Toggle completion via swipe
  const handleSwipeComplete = useCallback(
    async (task: Task) => {
      try {
        const newCompleted = !task.is_completed;
        const { error } = await supabase
          .from("tasks")
          .update({ is_completed: newCompleted })
          .eq("id", task.id);
        if (error) throw error;
        if (newCompleted && onAddPoints) onAddPoints();
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        toast({
          title: newCompleted ? "Tarefa concluída!" : "Tarefa reaberta",
          duration: 1500,
        });
      } catch (error) {
        logger.error("Erro ao atualizar tarefa:", error);
        toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
      }
    },
    [onAddPoints, toast, queryClient],
  );

  const cycleSortMode = useCallback(() => {
    setSortMode((prev) => {
      const idx = SORT_CYCLE.indexOf(prev);
      return SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
    });
  }, []);

  const handleLongPress = useCallback(
    (taskId: string) => {
      const task = allEnrichedTasks.find((t) => t.id === taskId);
      if (task) {
        setTaskToMove(task);
        setMoveDrawerOpen(true);
      }
    },
    [allEnrichedTasks],
  );

  const handleMoveToColumn = useCallback(
    async (columnId: string) => {
      if (!taskToMove) return;
      try {
        const { error } = await supabase
          .from("tasks")
          .update({ column_id: columnId })
          .eq("id", taskToMove.id);
        if (error) throw error;
        const targetCol = columns.find((c) => c.id === columnId);
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        toast({
          title: `Movida para "${targetCol?.name || "coluna"}"`,
          duration: 1500,
        });
      } catch (error) {
        logger.error("Erro ao mover tarefa:", error);
        toast({ title: "Erro ao mover tarefa", variant: "destructive" });
      } finally {
        setMoveDrawerOpen(false);
        setTaskToMove(null);
      }
    },
    [taskToMove, columns, queryClient, toast],
  );

  const targetColumnId = activeFilter || columns[0]?.id || "";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Pills de filtro + ordenação */}
      <div className="px-2 py-2 border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-10 space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveFilter(null)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
              !activeFilter
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-accent",
            )}
          >
            Todas ({allEnrichedTasks.length})
          </button>
          {columns.map((col) => {
            const count = columnCounts[col.id] || 0;
            const isActive = activeFilter === col.id;
            const colorClass = getColumnTopBarClass(col.color);
            return (
              <button
                key={col.id}
                onClick={() => setActiveFilter(isActive ? null : col.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-accent",
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", colorClass)} />
                {col.name.length > 8 ? col.name.substring(0, 8) + "…" : col.name}
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Botão de ordenação */}
        <button
          onClick={cycleSortMode}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
          aria-label={`Ordenar por ${SORT_LABELS[sortMode]}`}
        >
          <ArrowUpDown className="h-3 w-3" />
          <span>Ordenar: <span className="font-medium text-foreground">{SORT_LABELS[sortMode]}</span></span>
        </button>
      </div>

      {/* Lista unificada */}
      <div className="flex-1 overflow-y-auto" role="list" aria-label="Lista de tarefas">
        {renderItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">Nenhuma tarefa encontrada</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {renderItems.map((item) => {
              if (item.type === "separator") {
                return (
                  <div
                    key={`sep-${item.columnName}`}
                    className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border/30"
                  >
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", item.columnColor)} />
                    <span className="text-[11px] font-semibold text-foreground/80">
                      {item.columnName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">({item.count})</span>
                  </div>
                );
              }

              const task = item.task;
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  {task.isRecurrent ? (
                    <MobileChecklistItem
                      task={task}
                      columnColor={task.columnColor}
                      onToggleComplete={() => handleSwipeComplete(task)}
                      onEdit={() => handleEditTask(task)}
                      onToggleFavorite={toggleFavorite}
                      onLongPress={handleLongPress}
                      priorityColors={priorityColors}
                    />
                  ) : (
                    <SwipeableTaskCard
                      taskId={task.id}
                      onComplete={() => handleSwipeComplete(task)}
                      onEdit={() => handleEditTask(task)}
                      onDelete={() => handleDeleteClick(task.id)}
                      isCompleted={task.is_completed || false}
                    >
                      <MobileChecklistItem
                        task={task}
                        columnColor={task.columnColor}
                        onToggleComplete={() => handleSwipeComplete(task)}
                        onEdit={() => handleEditTask(task)}
                        onToggleFavorite={toggleFavorite}
                        onLongPress={handleLongPress}
                        priorityColors={priorityColors}
                      />
                    </SwipeableTaskCard>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* FAB para adicionar tarefa */}
      <div className="sticky bottom-0 p-2 bg-background/95 backdrop-blur-sm border-t border-border/50">
        <Button
          size="sm"
          className="w-full h-9 text-xs bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md rounded-full"
          onClick={() => handleAddTask(targetColumnId)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nova tarefa
        </Button>
      </div>

      {/* Drawer para mover tarefa */}
      <MobileColumnDrawer
        open={moveDrawerOpen}
        onOpenChange={setMoveDrawerOpen}
        columns={columns}
        currentColumnId={taskToMove?.columnId || ""}
        onSelectColumn={handleMoveToColumn}
      />
    </div>
  );
});
