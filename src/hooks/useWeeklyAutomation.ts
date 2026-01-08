import { useCallback, useEffect } from "react";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/useToast";
import { Task } from "@/hooks/tasks/useTasks";

interface Column {
  id: string;
  name: string;
  position: number;
}

interface UseWeeklyAutomationProps {
  tasks: Task[];
  columns: Column[];
  autoMoveEnabled: boolean;
  excludeColumnNames: string[]; // Nomes de colunas a excluir da automação
}

export function useWeeklyAutomation({
  tasks,
  columns,
  autoMoveEnabled,
  excludeColumnNames
}: UseWeeklyAutomationProps) {
  const { toast } = useToast();

  const moveTasksToCurrentWeek = useCallback(async () => {
    if (!autoMoveEnabled) return;
    
    // Encontrar coluna "Semana Atual"
    const currentWeekColumn = columns.find(col => 
      col.name.toLowerCase().includes("semana atual") || 
      col.name.toLowerCase() === "esta semana"
    );
    
    if (!currentWeekColumn) return;
    
    // Identificar IDs das colunas a excluir
    const excludedColumnIds = new Set(
      columns
        .filter(col => 
          excludeColumnNames.some(name => 
            col.name.toLowerCase().includes(name.toLowerCase())
          )
        )
        .map(col => col.id)
    );
    
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Segunda-feira
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Domingo
    
    // Filtrar tarefas que devem ser movidas (de TODAS as colunas, exceto excluídas)
    const tasksToMove = tasks.filter(task => {
      // Já está na coluna "Semana Atual"?
      if (task.column_id === currentWeekColumn.id) return false;
      
      // Está em coluna excluída (Recorrente)?
      if (excludedColumnIds.has(task.column_id)) return false;
      
      // Está concluída?
      if (task.is_completed) return false;
      
      // Tem due_date dentro da semana atual?
      if (!task.due_date) return false;
      
      const dueDate = new Date(task.due_date);
      return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
    });
    
    if (tasksToMove.length === 0) return;
    
    // Log para debug
    if (import.meta.env.DEV) {
      console.log(`[WeeklyAutomation] Movendo ${tasksToMove.length} tarefas para Semana Atual`);
      console.log(`[WeeklyAutomation] Colunas excluídas:`, excludeColumnNames);
    }
    
    // Batch update
    const taskIds = tasksToMove.map(t => t.id);
    const { error } = await supabase
      .from("tasks")
      .update({ column_id: currentWeekColumn.id })
      .in("id", taskIds);
    
    if (error) {
      if (import.meta.env.DEV) console.error("Erro ao mover tarefas:", error);
      return;
    }
    
    // Disparar evento para refresh
    window.dispatchEvent(new CustomEvent('task-updated'));
    
    toast({
      title: "Automação Semana Atual",
      description: `${tasksToMove.length} tarefa(s) movida(s) para "Semana Atual"`
    });
  }, [tasks, columns, autoMoveEnabled, excludeColumnNames, toast]);

  // Executar automação ao carregar
  useEffect(() => {
    if (tasks.length > 0 && columns.length > 0 && autoMoveEnabled) {
      const timeout = setTimeout(() => {
        moveTasksToCurrentWeek();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [tasks.length, columns.length, autoMoveEnabled]);

  return { moveTasksToCurrentWeek };
}
