import { useState } from "react";
import { Column } from "@/hooks/useColumns";
import { Task } from "@/hooks/useTasks";
import { TaskCard } from "../TaskCard";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { getColumnColorClass } from "./ColumnColorPicker";
import { cn } from "@/lib/utils";

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
  handleUncheckRecurrentTasks: (columnId: string) => void;
  isDailyKanban?: boolean;
  showCategoryBadge?: boolean;
  densityMode?: "comfortable" | "compact" | "ultra-compact";
  hideBadges?: boolean;
  gridColumns?: 1 | 2;
}

export function MobileKanbanView({
  columns,
  tasks,
  getTasksForColumn,
  handleAddTask,
  handleEditTask,
  handleDeleteClick,
  toggleFavorite,
  duplicateTask,
  handleMoveTask,
  handleUncheckRecurrentTasks,
  isDailyKanban = false,
  showCategoryBadge = false,
  densityMode = "compact",
  hideBadges = false,
  gridColumns = 2
}: MobileKanbanViewProps) {
  const [activeTab, setActiveTab] = useState(columns[0]?.id || "");

  const currentColumnIndex = columns.findIndex(col => col.id === activeTab);
  const canMoveLeft = currentColumnIndex > 0;
  const canMoveRight = currentColumnIndex < columns.length - 1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2">
              <div className={cn(
                "grid gap-3",
                gridColumns === 1 ? "grid-cols-1" : "grid-cols-2"
              )}>
          {columns.map((column) => {
            const columnTasks = getTasksForColumn(column.id);
            return (
              <div 
                key={column.id} 
                className="flex flex-col bg-card rounded-lg border min-h-[300px]"
              >
                {/* Header da coluna */}
                <div className={`p-2 border-b sticky top-0 bg-card z-10 rounded-t-lg ${getColumnColorClass(column.color)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <h4 className="text-xs font-semibold truncate">{column.name}</h4>
                      <span className="text-[10px] text-muted-foreground">({columnTasks.length})</span>
                      {column.name.toLowerCase() === "recorrente" && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-medium whitespace-nowrap">
                          🔄
                        </span>
                      )}
                    </div>
                    {column.name.toLowerCase() === "recorrente" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleUncheckRecurrentTasks(column.id)}
                        title="Desmarcar todas as tarefas recorrentes"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Lista de tasks */}
                <SortableContext
                  items={columnTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 p-1 space-y-1 overflow-y-auto">
                    {columnTasks.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-[10px]">
                        Vazio
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={() => handleEditTask(task)}
                          onDelete={() => handleDeleteClick(task.id)}
                          onToggleFavorite={toggleFavorite}
                          onDuplicate={duplicateTask}
                          isDailyKanban={isDailyKanban}
                          showCategoryBadge={showCategoryBadge}
                          densityMode="ultra-compact"
                          hideBadges={hideBadges}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
                
                {/* Botão adicionar tarefa */}
                <Button 
                  size="sm" 
                  className="m-1 h-7 text-[10px]"
                  onClick={() => handleAddTask(column.id)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
