import { useState, useDeferredValue } from "react";
import { DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Column } from "@/hooks/data/useColumns";
import { Task } from "@/hooks/tasks/useTasks";

interface UseKanbanDragDropOptions {
  columns: Column[];
  tasks: Task[];
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onTaskCompleted?: () => void;
}

export function useKanbanDragDrop({
  columns,
  tasks,
  updateTask,
  onTaskCompleted,
}: UseKanbanDragDropOptions) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  
  // OTIMIZAÇÃO: useDeferredValue para overId evitar re-renders excessivos
  const deferredOverId = useDeferredValue(overId);

  // OTIMIZAÇÃO: Sensores configurados para fluidez máxima
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 3,
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 50,
      tolerance: 3,
    },
  });
  
  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragStart = (event: { active: { id: string | number } }) => {
    setActiveId(event.active.id as string);
    setOverId(null);
  };

  const handleDragOver = (event: { over: { id: string | number } | null }) => {
    const newOverId = event.over?.id as string | null;
    if (newOverId) {
      if (newOverId.startsWith("column-")) {
        setOverId(newOverId.replace("column-", ""));
      } else {
        const isColumn = columns.some(c => c.id === newOverId);
        if (isColumn) {
          setOverId(newOverId);
        } else {
          const task = tasks.find(t => t.id === newOverId);
          if (task) {
            setOverId(task.column_id);
          }
        }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return { success: false, reason: "no_target" };
    }

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    
    if (!task) {
      setActiveId(null);
      return { success: false, reason: "task_not_found" };
    }

    // Determinar coluna de destino
    let newColumnId: string;
    const overIdStr = over.id as string;
    
    if (overIdStr.startsWith("column-")) {
      newColumnId = overIdStr.replace("column-", "");
    } else {
      const isColumn = columns.some(c => c.id === overIdStr);
      if (isColumn) {
        newColumnId = overIdStr;
      } else {
        const containerId = over.data?.current?.sortable?.containerId;
        if (containerId) {
          newColumnId = containerId as string;
        } else {
          const overTask = tasks.find(t => t.id === overIdStr);
          newColumnId = overTask?.column_id || task.column_id;
        }
      }
    }

    // Bloquear movimento de tarefas recorrentes para fora da coluna Recorrente
    const sourceColumn = columns.find(col => col.id === task.column_id);
    
    if (task.recurrence_rule && 
        sourceColumn?.name.toLowerCase() === "recorrente" &&
        task.column_id !== newColumnId) {
      setActiveId(null);
      return { success: false, reason: "recurrent_blocked" };
    }

    // Only update if changed column
    if (task.column_id !== newColumnId) {
      const destinationTasks = tasks.filter((t) => t.column_id === newColumnId);
      const newPosition = destinationTasks.length;
      
      const updates: Partial<Task> = {
        column_id: newColumnId,
        position: newPosition
      };

      // Auto-completar ao mover para coluna "Concluído"
      const destinationColumn = columns.find(col => col.id === newColumnId);
      if (destinationColumn?.name.toLowerCase() === "concluído") {
        updates.is_completed = true;
        onTaskCompleted?.();
      }
      // Auto-desmarcar ao sair de "Concluído"
      else if (sourceColumn?.name.toLowerCase() === "concluído") {
        updates.is_completed = false;
      }
      
      await updateTask(taskId, updates);
    }

    setActiveId(null);
    setOverId(null);
    return { success: true };
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  return {
    activeId,
    overId: deferredOverId,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    setActiveId,
    setOverId,
  };
}
