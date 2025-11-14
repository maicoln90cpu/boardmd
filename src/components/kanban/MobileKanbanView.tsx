import { useState } from "react";
import { Column } from "@/hooks/useColumns";
import { Task } from "@/hooks/useTasks";
import { TaskCard } from "../TaskCard";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { getColumnColorClass } from "./ColumnColorPicker";

interface MobileKanbanViewProps {
  columns: Column[];
  tasks: Task[];
  getTasksForColumn: (columnId: string) => Task[];
  handleAddTask: (columnId: string) => void;
  handleEditTask: (task: Task) => void;
  handleDeleteClick: (taskId: string) => void;
  toggleFavorite: (taskId: string) => void;
  handleMoveTask: (taskId: string, direction: "left" | "right") => void;
  isDailyKanban?: boolean;
  showCategoryBadge?: boolean;
  densityMode?: "comfortable" | "compact" | "ultra-compact";
}

export function MobileKanbanView({
  columns,
  tasks,
  getTasksForColumn,
  handleAddTask,
  handleEditTask,
  handleDeleteClick,
  toggleFavorite,
  handleMoveTask,
  isDailyKanban = false,
  showCategoryBadge = false,
  densityMode = "compact"
}: MobileKanbanViewProps) {
  const [activeTab, setActiveTab] = useState(columns[0]?.id || "");

  const currentColumnIndex = columns.findIndex(col => col.id === activeTab);
  const canMoveLeft = currentColumnIndex > 0;
  const canMoveRight = currentColumnIndex < columns.length - 1;

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b bg-card px-2">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1">
            {columns.map((column) => {
              const columnTasks = getTasksForColumn(column.id);
              return (
                <TabsTrigger
                  key={column.id}
                  value={column.id}
                  className={`flex-shrink-0 min-w-[120px] ${getColumnColorClass(column.color)}`}
                >
                  <span className="truncate">{column.name}</span>
                  <span className="ml-2 text-xs opacity-70">({columnTasks.length})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {columns.map((column) => {
          const columnTasks = getTasksForColumn(column.id);

          return (
            <TabsContent
              key={column.id}
              value={column.id}
              className="flex-1 overflow-y-auto mt-0 p-3"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">{column.name}</h3>
                <Button
                  onClick={() => handleAddTask(column.id)}
                  size="sm"
                  className="min-h-[44px]"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Tarefa
                </Button>
              </div>

              <SortableContext
                items={columnTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nenhuma tarefa</p>
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <div key={task.id} className="relative">
                        <TaskCard
                          task={task}
                          onEdit={() => handleEditTask(task)}
                          onDelete={() => handleDeleteClick(task.id)}
                          onToggleFavorite={toggleFavorite}
                          isDailyKanban={isDailyKanban}
                          showCategoryBadge={showCategoryBadge}
                          densityMode={densityMode}
                        />
                        
                        {/* Botões de navegação rápida entre colunas */}
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                          {canMoveLeft && currentColumnIndex > 0 && (
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 rounded-full shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveTask(task.id, "left");
                              }}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                          )}
                          {canMoveRight && currentColumnIndex < columns.length - 1 && (
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 rounded-full shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveTask(task.id, "right");
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SortableContext>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
