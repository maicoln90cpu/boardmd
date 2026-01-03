import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface PomodoroTemplate {
  id: string;
  user_id: string;
  name: string;
  work_duration: number;
  short_break: number;
  long_break: number;
  sessions_until_long: number;
  created_at: string;
  updated_at: string;
}

export function usePomodoroTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<PomodoroTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch templates
  useEffect(() => {
    if (!user) {
      setTemplates([]);
      setIsLoading(false);
      return;
    }

    const fetchTemplates = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("pomodoro_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Error fetching templates:", error);
        toast.error("Erro ao carregar templates");
      } else {
        setTemplates((data as PomodoroTemplate[]) || []);
      }
      setIsLoading(false);
    };

    fetchTemplates();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("pomodoro_templates_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pomodoro_templates",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addTemplate = async (template: Omit<PomodoroTemplate, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!user) {
      toast.error("Faça login para criar templates");
      return;
    }

    const { data, error } = await supabase
      .from("pomodoro_templates")
      .insert({
        user_id: user.id,
        name: template.name,
        work_duration: template.work_duration,
        short_break: template.short_break,
        long_break: template.long_break,
        sessions_until_long: template.sessions_until_long,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating template:", error);
      toast.error("Erro ao criar template");
    } else {
      setTemplates((prev) => [data as PomodoroTemplate, ...prev]);
      toast.success("Template criado com sucesso!");
    }
  };

  const updateTemplate = async (id: string, updates: Partial<PomodoroTemplate>) => {
    const { error } = await supabase
      .from("pomodoro_templates")
      .update({
        name: updates.name,
        work_duration: updates.work_duration,
        short_break: updates.short_break,
        long_break: updates.long_break,
        sessions_until_long: updates.sessions_until_long,
      })
      .eq("id", id);

    if (error) {
      logger.error("Error updating template:", error);
      toast.error("Erro ao atualizar template");
    } else {
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      toast.success("Template atualizado!");
    }
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from("pomodoro_templates")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("Error deleting template:", error);
      toast.error("Erro ao excluir template");
    } else {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template excluído!");
    }
  };

  return {
    templates,
    isLoading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
