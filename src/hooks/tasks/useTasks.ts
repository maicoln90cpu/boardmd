import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { taskSchema } from "@/lib/validations";
import { z } from "zod";
import { offlineSync } from "@/lib/sync/offlineSync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// Helper to dispatch saving state events
const dispatchSavingEvent = (taskId: string, isSaving: boolean) => {
  window.dispatchEvent(new CustomEvent('task-saving', { detail: { taskId, isSaving } }));
};

// Interface para recurrence_rule compatível com Json do Supabase
export interface TaskRecurrenceRule {
  frequency?: 'daily' | 'weekly' | 'monthly';
  interval?: number;
  weekday?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  due_date: string | null;
  tags: string[] | null;
  column_id: string;
  category_id: string;
  position: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  is_completed: boolean;
  subtasks: Array<{ id: string; title: string; completed: boolean }> | null;
  recurrence_rule: TaskRecurrenceRule | null;
  mirror_task_id: string | null;
  linked_note_id: string | null;
}

export function useTasks(categoryId: string | null | "all") {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    if (categoryId) {
      fetchTasks();
      const cleanup = subscribeToTasks();
      
      // Listener para updates otimistas
      const handleTaskUpdate = (event: CustomEvent) => {
        fetchTasks();
      };
      
      window.addEventListener('task-updated', handleTaskUpdate as EventListener);
      
      return () => {
        cleanup();
        window.removeEventListener('task-updated', handleTaskUpdate as EventListener);
      };
    } else {
      setTasks([]);
      setLoading(false);
    }
  }, [categoryId]);

  const fetchTasks = async () => {
    let query = supabase
      .from("tasks")
      .select("*, categories(name), mirror_task_id");
    
    if (categoryId && categoryId !== "all") {
      query = query.eq("category_id", categoryId);
    }

    // Se for "all", excluir categoria "Diário"
    if (categoryId === "all") {
      const { data: categories } = await supabase
        .from("categories")
        .select("id")
        .neq("name", "Diário");
      
      if (categories && categories.length > 0) {
        const categoryIds = categories.map(c => c.id);
        query = query.in("category_id", categoryIds);
      }
    }
    
    const { data, error } = await query.order("position");

    if (error) {
      toast({ title: "Erro ao carregar tarefas", variant: "destructive" });
      return;
    }

    setTasks((data || []) as unknown as Task[]);
    setLoading(false);
  };

  const subscribeToTasks = () => {
    // OTIMIZAÇÃO: Uma única subscription com event: "*" e update incremental
    const channel = supabase
      .channel(`tasks-${categoryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        (payload) => {
          // Update incremental baseado no tipo de evento
          if (payload.eventType === "INSERT") {
            const newTask = payload.new as Task;
            // Verificar se a tarefa pertence à categoria correta
            if (categoryId === "all" || newTask.category_id === categoryId) {
              setTasks((prev) => {
                // Evitar duplicatas
                if (prev.some(t => t.id === newTask.id)) return prev;
                return [...prev, newTask];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedTask = payload.new as Task;
            setTasks((prev) =>
              prev.map((t) =>
                t.id === updatedTask.id ? { ...t, ...updatedTask } : t
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id;
            setTasks((prev) => prev.filter((t) => t.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addTask = async (task: Partial<Task>) => {
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para criar tarefas",
        variant: "destructive",
      });
      return;
    }

    try {
      const maxPosition = Math.max(
        ...tasks
          .filter((t) => t.column_id === task.column_id)
          .map((t) => t.position),
        -1
      );

      const taskData = {
        ...task,
        position: maxPosition + 1,
        user_id: user.id,
      };

      const validated = taskSchema.parse(taskData);

      // ATUALIZAÇÃO OTIMISTA: Criar tarefa temporária
      const tempId = `temp-${Date.now()}`;
      const tempTask: Task = {
        id: tempId,
        title: task.title || '',
        description: task.description || null,
        priority: task.priority || 'medium',
        due_date: task.due_date || null,
        tags: task.tags || null,
        column_id: task.column_id || '',
        category_id: task.category_id || '',
        position: maxPosition + 1,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_favorite: false,
        is_completed: false,
        subtasks: task.subtasks || null,
        recurrence_rule: task.recurrence_rule || null,
        mirror_task_id: task.mirror_task_id || null,
        linked_note_id: task.linked_note_id || null,
      };
      
      setTasks(prev => [...prev, tempTask]);
      dispatchSavingEvent(tempId, true);

      if (!isOnline) {
        dispatchSavingEvent(tempId, false);
        offlineSync.queueOperation({
          type: 'task',
          action: 'create',
          data: validated
        });
        toast({ title: "Tarefa salva offline. Será sincronizada ao reconectar." });
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert([validated as any])
        .select()
        .single();

      if (error) {
        // ROLLBACK: Remover tarefa temporária
        dispatchSavingEvent(tempId, false);
        setTasks(prev => prev.filter(t => t.id !== tempId));
        offlineSync.queueOperation({
          type: 'task',
          action: 'create',
          data: validated
        });
        toast({
          title: "Erro ao criar tarefa",
          description: "Salvo offline para sincronização posterior",
          variant: "destructive",
        });
        return;
      }

      // Substituir temp pelo real
      if (data) {
        dispatchSavingEvent(tempId, false);
        setTasks(prev => prev.map(t => 
          t.id === tempId ? { ...data as unknown as Task } : t
        ));

        // Registrar no histórico
        await supabase.from("task_history").insert([{
          task_id: data.id,
          user_id: user.id,
          action: "created",
          changes: { title: task.title }
        }]);
      }

      toast({ title: "Tarefa criada com sucesso" });
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: e.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user) return;

    try {
      const validated = taskSchema.partial().parse(updates);

      // ATUALIZAÇÃO OTIMISTA
      const previousTasks = [...tasks];
      setTasks(prev => prev.map(t => 
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      ));
      dispatchSavingEvent(id, true);

      if (!isOnline) {
        dispatchSavingEvent(id, false);
        offlineSync.queueOperation({
          type: 'task',
          action: 'update',
          data: { id, ...validated }
        });
        toast({ title: "Atualização salva offline" });
        return;
      }

      const { error } = await supabase
        .from("tasks")
        .update({
          ...validated,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      dispatchSavingEvent(id, false);

      if (error) {
        // ROLLBACK
        setTasks(previousTasks);
        offlineSync.queueOperation({
          type: 'task',
          action: 'update',
          data: { id, ...validated }
        });
        toast({
          title: "Erro ao atualizar tarefa",
          description: "Salvo offline para sincronização",
          variant: "destructive",
        });
        return;
      }

      // Registrar no histórico
      const action = updates.column_id ? "moved" : "updated";
      await supabase.from("task_history").insert([{
        task_id: id,
        user_id: user.id,
        action,
        changes: JSON.parse(JSON.stringify(updates))
      }]);

      toast({ title: "Tarefa atualizada com sucesso" });
    } catch (e) {
      if (e instanceof z.ZodError) {
        // ROLLBACK em caso de erro de validação
        toast({
          title: "Erro de validação",
          description: e.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;

    // ATUALIZAÇÃO OTIMISTA
    const previousTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== id));
    dispatchSavingEvent(id, true);

    if (!isOnline) {
      dispatchSavingEvent(id, false);
      offlineSync.queueOperation({
        type: 'task',
        action: 'delete',
        data: { id }
      });
      toast({ title: "Exclusão salva offline" });
      return;
    }

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    dispatchSavingEvent(id, false);

    if (error) {
      // ROLLBACK
      setTasks(previousTasks);
      offlineSync.queueOperation({
        type: 'task',
        action: 'delete',
        data: { id }
      });
      toast({ title: "Erro ao deletar. Salvo offline", variant: "destructive" });
    } else {
      // Registrar no histórico
      await supabase.from("task_history").insert([{
        task_id: id,
        user_id: user.id,
        action: "deleted",
        changes: {}
      }]);

      toast({ title: "Tarefa deletada com sucesso" });
    }
  };

  const resetAllTasksToFirstColumn = async (firstColumnId: string, excludeColumns: string[] = []) => {
    const tasksToReset = tasks.filter(t => 
      t.column_id !== firstColumnId && 
      !excludeColumns.includes(t.column_id)
    );
    
    if (tasksToReset.length === 0) {
      toast({ title: "Nenhuma tarefa para resetar", variant: "default" });
      return;
    }

    // Data atual (meia-noite)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Limpar checkboxes do localStorage para tarefas recorrentes
    tasksToReset.forEach(task => {
      if (task.recurrence_rule) {
        localStorage.removeItem(`task-completed-${task.id}`);
      }
    });

    // OTIMIZAÇÃO: Batch update com .in() para todas as propriedades
    const taskIds = tasksToReset.map(t => t.id);
    
    // Atualizar todas as tarefas de uma vez (coluna, data e status)
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ 
        column_id: firstColumnId,
        due_date: todayISO,
        is_completed: false
      })
      .in("id", taskIds);
    
    if (updateError) {
      if (import.meta.env.DEV) console.error("Erro ao resetar tarefas:", updateError);
      toast({ title: "Erro ao resetar tarefas", variant: "destructive" });
      return;
    }
    
    // OTIMIZAÇÃO: Atualizar posições em batch usando Promise.all com chunks
    // Em vez de N queries sequenciais, fazemos em paralelo
    const BATCH_SIZE = 10;
    const positionUpdates = tasksToReset.map((task, index) => ({
      id: task.id,
      position: index
    }));
    
    // Processar em chunks para não sobrecarregar
    for (let i = 0; i < positionUpdates.length; i += BATCH_SIZE) {
      const chunk = positionUpdates.slice(i, i + BATCH_SIZE);
      await Promise.all(
        chunk.map(({ id, position }) =>
          supabase.from("tasks").update({ position }).eq("id", id)
        )
      );
    }
    
    // Update otimista local
    setTasks(prev => 
      prev.map(t => {
        if (taskIds.includes(t.id)) {
          const newPosition = positionUpdates.find(p => p.id === t.id)?.position ?? t.position;
          return {
            ...t,
            column_id: firstColumnId,
            due_date: todayISO,
            is_completed: false,
            position: newPosition
          };
        }
        return t;
      })
    );
    
    toast({ title: `${tasksToReset.length} tarefa(s) resetada(s)!` });
  };

  const toggleFavorite = async (taskId: string) => {
    if (!user) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // ATUALIZAÇÃO OTIMISTA
    const previousValue = task.is_favorite;
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, is_favorite: !t.is_favorite } : t
    ));
    dispatchSavingEvent(taskId, true);

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_favorite: !previousValue })
        .eq("id", taskId);

      dispatchSavingEvent(taskId, false);

      if (error) throw error;

      toast({
        title: previousValue ? "Removido dos favoritos" : "Adicionado aos favoritos",
      });
    } catch (error) {
      // ROLLBACK
      dispatchSavingEvent(taskId, false);
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, is_favorite: previousValue } : t
      ));
      if (import.meta.env.DEV) {
        console.error("Error toggling favorite:", error);
      }
      toast({
        title: "Erro ao atualizar favorito",
        variant: "destructive",
      });
    }
  };

  const duplicateTask = async (taskId: string) => {
    if (!user) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      // Criar cópia da tarefa sem id, created_at e updated_at
      const { id, created_at, updated_at, ...taskData } = task;
      
      const duplicatedTask = {
        ...taskData,
        title: `${task.title} (cópia)`,
        position: task.position + 1,
        user_id: user.id,
      };

      const validated = taskSchema.parse(duplicatedTask);

      // ATUALIZAÇÃO OTIMISTA: Criar tarefa temporária
      const tempId = `temp-dup-${Date.now()}`;
      const tempTask: Task = {
        id: tempId,
        ...duplicatedTask,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Task;
      
      setTasks(prev => [...prev, tempTask]);
      dispatchSavingEvent(tempId, true);

      const { data, error } = await supabase
        .from("tasks")
        .insert([validated as any])
        .select()
        .single();

      if (error) {
        // ROLLBACK
        dispatchSavingEvent(tempId, false);
        setTasks(prev => prev.filter(t => t.id !== tempId));
        toast({
          title: "Erro ao duplicar tarefa",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Substituir temp pelo real
      if (data) {
        dispatchSavingEvent(tempId, false);
        setTasks(prev => prev.map(t => 
          t.id === tempId ? { ...data as unknown as Task } : t
        ));

        // Registrar no histórico
        await supabase.from("task_history").insert([{
          task_id: data.id,
          user_id: user.id,
          action: "created",
          changes: { title: duplicatedTask.title, duplicated_from: taskId }
        }]);
      }

      toast({ title: "Tarefa duplicada com sucesso" });
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: e.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  return { tasks, loading, addTask, updateTask, deleteTask, resetAllTasksToFirstColumn, fetchTasks, toggleFavorite, duplicateTask };
}
