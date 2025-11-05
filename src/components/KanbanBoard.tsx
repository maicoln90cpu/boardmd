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
}

export function KanbanBoard({ 
  columns, 
  categoryId, 
  compact = false,
  searchTerm = "",
  priorityFilter = "all",
  tagFilter = "all"
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
      await addTask({ ...taskData, column_id: selectedColumn });
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

  const getTasksForColumn = (columnId: string) => {
    return tasks.filter((t) => {
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
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className={`grid grid-cols-3 gap-6 ${compact ? 'p-3' : 'p-6'}`}>
          {columns.map((column) => {
            const columnTasks = getTasksForColumn(column.id);
            return (
              <div key={column.id} className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{column.name}</h2>
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
                  <div className="flex flex-col gap-3 min-h-[200px] p-4 rounded-lg bg-muted/30">
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteClick}
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
