import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { taskSchema } from "@/lib/validations";
import { z } from "zod";
import { offlineSync } from "@/utils/offlineSync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

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
  recurrence_rule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
  } | null;
  mirror_task_id: string | null;
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
    // Para categoryId="all", precisamos monitorar todas as categorias exceto "Diário"
    // Não podemos usar filtro direto na subscription, então monitoramos tudo
    const channel = supabase
      .channel(`tasks-${categoryId}`)
      .on(
        "postgres_changes", 
        { 
          event: "*", 
          schema: "public", 
          table: "tasks"
        }, 
        () => {
          // Sempre refetch para aplicar filtros localmente
          fetchTasks();
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

      if (!isOnline) {
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

      // Registrar no histórico
      if (data) {
        await supabase.from("task_history").insert([{
          task_id: data.id,
          user_id: user.id,
          action: "created",
          changes: { title: task.title }
        }]);
      }

      toast({ title: "Tarefa criada com sucesso" });
      await fetchTasks();
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

      if (!isOnline) {
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

      if (error) {
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
        changes: updates
      }]);

      toast({ title: "Tarefa atualizada com sucesso" });
      await fetchTasks();
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

  const deleteTask = async (id: string) => {
    if (!user) return;

    if (!isOnline) {
      offlineSync.queueOperation({
        type: 'task',
        action: 'delete',
        data: { id }
      });
      toast({ title: "Exclusão salva offline" });
      return;
    }

    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      offlineSync.queueOperation({
        type: 'task',
        action: 'delete',
        data: { id }
      });
      toast({ title: "Erro ao deletar. Salvo offline", variant: "destructive" });
    } else {
      // Registrar no histórico antes de deletar
      await supabase.from("task_history").insert([{
        task_id: id,
        user_id: user.id,
        action: "deleted",
        changes: {}
      }]);

      toast({ title: "Tarefa deletada com sucesso" });
      await fetchTasks();
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

    const updates = tasksToReset.map((task, index) => 
      supabase
        .from("tasks")
        .update({ 
          column_id: firstColumnId,
          position: index,
          due_date: todayISO
        })
        .eq("id", task.id)
    );
    
    await Promise.all(updates);
    toast({ title: `${tasksToReset.length} tarefa(s) resetada(s)!` });
    fetchTasks();
  };

  const toggleFavorite = async (taskId: string) => {
    if (!user) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_favorite: !task.is_favorite })
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: task.is_favorite ? "Removido dos favoritos" : "Adicionado aos favoritos",
      });
      await fetchTasks();
    } catch (error) {
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

      const { data, error } = await supabase
        .from("tasks")
        .insert([validated as any])
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro ao duplicar tarefa",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Registrar no histórico
      if (data) {
        await supabase.from("task_history").insert([{
          task_id: data.id,
          user_id: user.id,
          action: "created",
          changes: { title: duplicatedTask.title, duplicated_from: taskId }
        }]);
      }

      toast({ title: "Tarefa duplicada com sucesso" });
      await fetchTasks();
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
