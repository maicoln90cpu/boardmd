import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

export function useTasks(categoryId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (categoryId) {
      fetchTasks();
      const cleanup = subscribeToTasks();
      return cleanup;
    } else {
      setTasks([]);
      setLoading(false);
    }
  }, [categoryId]);

  const fetchTasks = async () => {
    let query = supabase
      .from("tasks")
      .select("*");
    
    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }
    
    const { data, error } = await query.order("position");

    if (error) {
      toast({ title: "Erro ao carregar tarefas", variant: "destructive" });
      return;
    }

    setTasks(data || []);
    setLoading(false);
  };

  const subscribeToTasks = () => {
    const channel = supabase
      .channel(`tasks-${categoryId}`)
      .on(
        "postgres_changes", 
        { 
          event: "*", 
          schema: "public", 
          table: "tasks",
          ...(categoryId ? { filter: `category_id=eq.${categoryId}` } : {})
        }, 
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addTask = async (task: Partial<Task>) => {
    if (!task.title?.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }

    if (!task.column_id) {
      toast({ title: "Coluna é obrigatória", variant: "destructive" });
      return;
    }
    
    if (!task.category_id) {
      toast({ title: "Categoria é obrigatória", variant: "destructive" });
      return;
    }

    // Calculate position at end of column
    const columnTasks = tasks.filter((t) => t.column_id === task.column_id);
    const position = task.position ?? columnTasks.length;

    const { error } = await supabase
      .from("tasks")
      .insert({
        title: task.title.trim(),
        description: task.description || null,
        priority: task.priority || "medium",
        due_date: task.due_date || null,
        tags: task.tags || null,
        column_id: task.column_id,
        category_id: task.category_id,
        position,
      });

    if (error) {
      console.error("Error creating task:", error);
      toast({ 
        title: "Erro ao criar tarefa", 
        description: error.message,
        variant: "destructive" 
      });
    } else {
      toast({ title: "Tarefa criada com sucesso" });
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { error } = await supabase
      .from("tasks")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating task:", error);
      toast({ 
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao deletar tarefa", variant: "destructive" });
    }
  };

  const resetAllTasksToFirstColumn = async (firstColumnId: string) => {
    const tasksToReset = tasks.filter(t => t.column_id !== firstColumnId);
    
    if (tasksToReset.length === 0) {
      toast({ title: "Nenhuma tarefa para resetar", variant: "default" });
      return;
    }

    const updates = tasksToReset.map((task, index) => 
      supabase
        .from("tasks")
        .update({ 
          column_id: firstColumnId,
          position: index 
        })
        .eq("id", task.id)
    );
    
    await Promise.all(updates);
    toast({ title: `${tasksToReset.length} tarefa(s) resetada(s)!` });
    fetchTasks();
  };

  return { tasks, loading, addTask, updateTask, deleteTask, resetAllTasksToFirstColumn };
}
