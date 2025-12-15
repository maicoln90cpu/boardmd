import { useState } from "react";
import { Column } from "@/hooks/useColumns";
import { Task } from "@/hooks/useTasks";
import { TaskCard } from "../TaskCard";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { getColumnTopBarClass, getColumnBackgroundClass } from "./ColumnColorPicker";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  handleUncheckRecurrentTasks: (columnId: string) => void;
  isDailyKanban?: boolean;
  showCategoryBadge?: boolean;
  densityMode?: "comfortable" | "compact" | "ultra-compact";
  hideBadges?: boolean;
  gridColumns?: 1 | 2;
  priorityColors?: PriorityColors;
  originalCategoriesMap?: Record<string, string>;
  getTagColor?: (tagName: string) => string;
  onAddPoints?: () => void;
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
  gridColumns = 2,
  priorityColors,
  originalCategoriesMap = {},
  getTagColor,
  onAddPoints
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
                className={`flex flex-col rounded-lg border overflow-hidden min-h-[300px] ${getColumnBackgroundClass(column.color)}`}
              >
                {/* Barra colorida no topo (estilo KanbanFlow) */}
                <div className={`h-1 w-full ${getColumnTopBarClass(column.color)}`} />
                
                {/* Header da coluna */}
                <div className={`p-2 border-b sticky top-0 z-10 ${getColumnBackgroundClass(column.color)}`}>
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
                      <AnimatePresence mode="popLayout" initial={false}>
                        {columnTasks.map((task) => (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, transition: { duration: 0.08 } }}
                            transition={{
                              duration: 0.12,
                              ease: "easeOut",
                            }}
                          >
                            <TaskCard
                              task={{
                                ...task,
                                // Usar task.id para buscar no mapa (tarefas no diário)
                                // ou task.mirror_task_id para tarefas que apontam para projetos
                                originalCategory: originalCategoriesMap[task.id] || 
                                  (task.mirror_task_id ? originalCategoriesMap[task.mirror_task_id] : undefined)
                              }}
                              onEdit={() => handleEditTask(task)}
                              onDelete={() => handleDeleteClick(task.id)}
                              onToggleFavorite={toggleFavorite}
                              onDuplicate={duplicateTask}
                              isDailyKanban={isDailyKanban}
                              showCategoryBadge={showCategoryBadge}
                          densityMode={densityMode}
                              hideBadges={hideBadges}
                              priorityColors={priorityColors}
                              getTagColor={getTagColor}
                              onAddPoints={onAddPoints}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </SortableContext>
                
                {/* Botão adicionar tarefa - Premium */}
                <Button 
                  size="sm" 
                  className="m-1 h-7 text-[10px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 rounded-full group"
                  onClick={() => handleAddTask(column.id)}
                >
                  <Plus className="h-3 w-3 transition-transform group-hover:rotate-90 duration-200" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
