import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface ApiKey {
  id: string;
  user_id: string;
  source: string;
  name: string;
  key_value: string;
  created_at: string;
  updated_at: string;
}

interface ApiKeyInsert {
  source: string;
  name: string;
  key_value: string;
}

interface ApiKeyUpdate {
  source?: string;
  name?: string;
  key_value?: string;
}

export function useApiKeys() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApiKeys = useCallback(async () => {
    if (!user?.id) {
      setApiKeys([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", user.id)
        .order("source", { ascending: true });

      if (error) throw error;

      setApiKeys(data || []);
    } catch (error) {
      logger.error("[useApiKeys] Error fetching API keys:", error);
      toast.error("Erro ao carregar API Keys");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const addApiKey = useCallback(
    async (data: ApiKeyInsert): Promise<ApiKey | null> => {
      if (!user?.id) {
        toast.error("Você precisa estar logado");
        return null;
      }

      if (!data.source.trim() || !data.name.trim() || !data.key_value.trim()) {
        toast.error("Preencha todos os campos");
        return null;
      }

      try {
        const { data: newKey, error } = await supabase
          .from("api_keys")
          .insert({
            user_id: user.id,
            source: data.source.trim(),
            name: data.name.trim(),
            key_value: data.key_value.trim(),
          })
          .select()
          .single();

        if (error) throw error;

        setApiKeys((prev) => [...prev, newKey].sort((a, b) => a.source.localeCompare(b.source)));
        toast.success("API Key adicionada!");
        return newKey;
      } catch (error) {
        logger.error("[useApiKeys] Error adding API key:", error);
        toast.error("Erro ao adicionar API Key");
        return null;
      }
    },
    [user?.id]
  );

  const updateApiKey = useCallback(
    async (id: string, data: ApiKeyUpdate): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const updateData: Record<string, string> = {};
        if (data.source !== undefined) updateData.source = data.source.trim();
        if (data.name !== undefined) updateData.name = data.name.trim();
        if (data.key_value !== undefined) updateData.key_value = data.key_value.trim();

        const { error } = await supabase
          .from("api_keys")
          .update(updateData)
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        setApiKeys((prev) =>
          prev.map((key) =>
            key.id === id ? { ...key, ...updateData, updated_at: new Date().toISOString() } : key
          )
        );

        toast.success("API Key atualizada!");
        return true;
      } catch (error) {
        logger.error("[useApiKeys] Error updating API key:", error);
        toast.error("Erro ao atualizar API Key");
        return false;
      }
    },
    [user?.id]
  );

  const deleteApiKey = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const { error } = await supabase
          .from("api_keys")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        setApiKeys((prev) => prev.filter((key) => key.id !== id));
        toast.success("API Key excluída!");
        return true;
      } catch (error) {
        logger.error("[useApiKeys] Error deleting API key:", error);
        toast.error("Erro ao excluir API Key");
        return false;
      }
    },
    [user?.id]
  );

  return {
    apiKeys,
    loading,
    addApiKey,
    updateApiKey,
    deleteApiKey,
    refetch: fetchApiKeys,
  };
}
