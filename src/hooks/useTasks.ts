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
      subscribeToTasks();
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
      .channel("tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addTask = async (task: Partial<Task>) => {
    const { error } = await supabase
      .from("tasks")
      .insert({
        title: task.title || "",
        description: task.description,
        priority: task.priority,
        due_date: task.due_date,
        tags: task.tags,
        column_id: task.column_id || "",
        category_id: categoryId,
        position: task.position || 0,
      });

    if (error) {
      toast({ title: "Erro ao criar tarefa", variant: "destructive" });
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { error } = await supabase.from("tasks").update(updates).eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
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
