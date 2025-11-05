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

export function useTasks(categoryId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (categoryId) {
      fetchTasks();
      const cleanup = subscribeToTasks();
      return cleanup;
    }
  }, [categoryId]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("category_id", categoryId)
      .order("position");

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
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        fetchTasks();
      })
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
        category_id: categoryId,
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

  return { tasks, loading, addTask, updateTask, deleteTask };
}
