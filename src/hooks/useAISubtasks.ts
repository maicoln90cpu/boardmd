import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/useToast";
import { logger } from "@/lib/logger";
import type { SubtaskData } from "@/types";

export function useAISubtasks() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  const generateSubtasks = useCallback(async (
    taskTitle: string,
    taskDescription?: string
  ): Promise<string[]> => {
    if (!taskTitle.trim()) {
      return [];
    }

    setIsLoading(true);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke("ai-subtasks", {
        body: {
          title: taskTitle,
          description: taskDescription || "",
        },
      });

      if (error) throw error;

      const subtaskSuggestions = data?.subtasks || [];
      setSuggestions(subtaskSuggestions);
      return subtaskSuggestions;
    } catch (error) {
      logger.error("Error generating subtasks:", error);
      toast({
        title: "Erro ao gerar subtarefas",
        description: "Não foi possível gerar sugestões de subtarefas.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Convert suggestions to subtask format
  const suggestionsToSubtasks = useCallback((selectedSuggestions: string[]): SubtaskData[] => {
    return selectedSuggestions.map((title) => ({
      id: crypto.randomUUID(),
      title,
      completed: false,
    }));
  }, []);

  return {
    isLoading,
    suggestions,
    generateSubtasks,
    clearSuggestions,
    suggestionsToSubtasks,
  };
}
