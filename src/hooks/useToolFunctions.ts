import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/ui/useToast";
import { logger } from "@/lib/logger";

export interface ToolFunction {
  id: string;
  name: string;
  color: string | null;
  user_id: string;
  created_at: string | null;
}

// Cores predefinidas para funções
export const FUNCTION_PRESET_COLORS = [
  { name: "Azul", value: "#3B82F6" },
  { name: "Verde", value: "#22C55E" },
  { name: "Amarelo", value: "#EAB308" },
  { name: "Laranja", value: "#F97316" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Roxo", value: "#8B5CF6" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Ciano", value: "#06B6D4" },
  { name: "Cinza", value: "#6B7280" },
  { name: "Índigo", value: "#6366F1" },
];

export const useToolFunctions = () => {
  const [functions, setFunctions] = useState<ToolFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFunctions = useCallback(async () => {
    if (!user) {
      setFunctions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("tool_functions")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setFunctions(data || []);
    } catch (error) {
      logger.error("Error fetching tool functions:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFunctions();
  }, [fetchFunctions]);

  const addFunction = async (name: string, color: string): Promise<ToolFunction | null> => {
    if (!user) return null;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: "Nome inválido",
        description: "O nome da função não pode estar vazio.",
        variant: "destructive",
      });
      return null;
    }

    if (trimmedName.length > 50) {
      toast({
        title: "Nome muito longo",
        description: "O nome da função deve ter no máximo 50 caracteres.",
        variant: "destructive",
      });
      return null;
    }

    // Check if function already exists
    const existingFunction = functions.find(
      (f) => f.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingFunction) {
      toast({
        title: "Função já existe",
        description: `A função "${trimmedName}" já foi criada.`,
        variant: "destructive",
      });
      return existingFunction;
    }

    try {
      const { data, error } = await supabase
        .from("tool_functions")
        .insert({
          user_id: user.id,
          name: trimmedName,
          color,
        })
        .select()
        .single();

      if (error) throw error;

      setFunctions((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: "Função criada",
        description: `A função "${trimmedName}" foi criada com sucesso.`,
      });
      return data;
    } catch (error) {
      logger.error("Error adding tool function:", error);
      toast({
        title: "Erro ao criar função",
        description: "Não foi possível criar a função. Tente novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateFunction = async (id: string, updates: Partial<Pick<ToolFunction, "name" | "color">>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("tool_functions")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setFunctions((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    } catch (error) {
      logger.error("Error updating tool function:", error);
      toast({
        title: "Erro ao atualizar função",
        description: "Não foi possível atualizar a função. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const deleteFunction = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("tool_functions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setFunctions((prev) => prev.filter((f) => f.id !== id));
      toast({
        title: "Função excluída",
        description: "A função foi removida com sucesso.",
      });
    } catch (error) {
      logger.error("Error deleting tool function:", error);
      toast({
        title: "Erro ao excluir função",
        description: "Não foi possível excluir a função. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getFunctionByName = (name: string): ToolFunction | undefined => {
    return functions.find((f) => f.name.toLowerCase() === name.toLowerCase());
  };

  const getFunctionById = (id: string): ToolFunction | undefined => {
    return functions.find((f) => f.id === id);
  };

  const getFunctionColor = (functionId: string): string => {
    const func = getFunctionById(functionId);
    return func?.color || "#6B7280"; // Default gray
  };

  return {
    functions,
    loading,
    addFunction,
    updateFunction,
    deleteFunction,
    getFunctionByName,
    getFunctionById,
    getFunctionColor,
    refetch: fetchFunctions,
  };
};
