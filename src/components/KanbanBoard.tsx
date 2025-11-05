import { useState } from "react";
import { Column } from "@/hooks/useColumns";
import { Task, useTasks } from "@/hooks/useTasks";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface KanbanBoardProps {
  columns: Column[];
  categoryId: string;
  compact?: boolean;
  searchTerm?: string;
  priorityFilter?: string;
  tagFilter?: string;
  isDailyKanban?: boolean;
  sortOption?: string;
  showCategoryBadge?: boolean;
}

export function KanbanBoard({ 
  columns, 
  categoryId, 
  compact = false,
  searchTerm = "",
  priorityFilter = "all",
  tagFilter = "all",
  isDailyKanban = false,
  sortOption = "manual",
  showCategoryBadge = false
}: KanbanBoardProps) {
  const { tasks, addTask, updateTask, deleteTask } = useTasks(categoryId);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    
    if (!task) {
      setActiveId(null);
      return;
    }

    // Get the actual container ID (column ID) from the droppable
    const containerId = over.data?.current?.sortable?.containerId ?? over.id;
    const newColumnId = containerId as string;

    // Only update if changed column
    if (task.column_id !== newColumnId) {
      // Calculate new position (append to end of destination column)
      const destinationTasks = tasks.filter((t) => t.column_id === newColumnId);
      const newPosition = destinationTasks.length;
      
      updateTask(taskId, { 
        column_id: newColumnId,
        position: newPosition 
      });
    }

    setActiveId(null);
  };

  const handleAddTask = (columnId: string) => {
    setSelectedTask(null);
    setSelectedColumn(columnId);
    setModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setSelectedColumn(task.column_id);
    setModalOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (selectedTask) {
      await updateTask(selectedTask.id, taskData);
    } else {
      await addTask({ ...taskData, column_id: selectedColumn, category_id: categoryId });
    }
  };

  const handleDeleteClick = (id: string) => {
    setTaskToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete);
      setTaskToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleMoveTask = (taskId: string, direction: "left" | "right") => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentColumnIndex = columns.findIndex(c => c.id === task.column_id);
    const targetIndex = direction === "left" ? currentColumnIndex - 1 : currentColumnIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < columns.length) {
      const targetColumn = columns[targetIndex];
      const destinationTasks = tasks.filter(t => t.column_id === targetColumn.id);
      
      updateTask(taskId, {
        column_id: targetColumn.id,
        position: destinationTasks.length
      });
    }
  };

  const getTasksForColumn = (columnId: string) => {
    const filtered = tasks.filter((t) => {
      if (t.column_id !== columnId) return false;
      
      // Filtro de busca
      if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filtro de prioridade
      if (priorityFilter !== "all" && t.priority !== priorityFilter) {
        return false;
      }
      
      // Filtro de tag
      if (tagFilter !== "all" && !t.tags?.includes(tagFilter)) {
        return false;
      }
      
      return true;
    });

    // Aplicar ordenação
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "name_asc":
          return a.title.localeCompare(b.title, "pt-BR");
        case "name_desc":
          return b.title.localeCompare(a.title, "pt-BR");
        case "priority_asc": {
          const priorityMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
          return (priorityMap[a.priority || "medium"] || 2) - (priorityMap[b.priority || "medium"] || 2);
        }
        case "priority_desc": {
          const priorityMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
          return (priorityMap[b.priority || "medium"] || 2) - (priorityMap[a.priority || "medium"] || 2);
        }
        case "date_asc": {
          const timeA = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
          const timeB = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
          return timeA - timeB;
        }
        case "date_desc": {
          const timeA = a.due_date ? new Date(a.due_date).getTime() : Number.NEGATIVE_INFINITY;
          const timeB = b.due_date ? new Date(b.due_date).getTime() : Number.NEGATIVE_INFINITY;
          return timeB - timeA;
        }
        default:
          return a.position - b.position;
      }
    });

    return sorted;
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className={`grid grid-cols-3 ${compact ? 'gap-4 p-2' : 'gap-6 p-6'}`}>
          {columns.map((column, columnIndex) => {
            const columnTasks = getTasksForColumn(column.id);
            return (
              <div key={column.id} className={`flex flex-col ${compact ? 'gap-2' : 'gap-4'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className={`${compact ? 'text-base' : 'text-lg'} font-semibold`}>{column.name}</h2>
                    <span className="text-sm text-muted-foreground">
                      ({columnTasks.length})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAddTask(column.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <SortableContext
                  items={columnTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                  id={column.id}
                >
                  <div className={`flex flex-col ${compact ? 'gap-2 min-h-[120px] p-2' : 'gap-3 min-h-[200px] p-4'} rounded-lg bg-muted/30`}>
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteClick}
                        onMoveLeft={() => handleMoveTask(task.id, "left")}
                        onMoveRight={() => handleMoveTask(task.id, "right")}
                        canMoveLeft={columnIndex > 0}
                        canMoveRight={columnIndex < columns.length - 1}
                        compact={compact}
                        isDailyKanban={isDailyKanban}
                        showCategoryBadge={showCategoryBadge}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="opacity-50">
              <TaskCard
                task={tasks.find((t) => t.id === activeId)!}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSaveTask}
        task={selectedTask}
        columnId={selectedColumn}
        isDailyKanban={isDailyKanban}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
