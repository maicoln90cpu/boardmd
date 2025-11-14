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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 gap-2">
          {columns.map((column) => {
            const columnTasks = getTasksForColumn(column.id);
            return (
              <div 
                key={column.id} 
                className="flex flex-col bg-card rounded-lg border min-h-[250px]"
              >
                {/* Header da coluna */}
                <div className={`p-2 border-b sticky top-0 bg-card z-10 rounded-t-lg ${getColumnColorClass(column.color)}`}>
                  <h4 className="text-xs font-semibold truncate">{column.name}</h4>
                  <span className="text-[10px] text-muted-foreground">({columnTasks.length})</span>
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
                          isDailyKanban={isDailyKanban}
                          showCategoryBadge={showCategoryBadge}
                          densityMode="ultra-compact"
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
