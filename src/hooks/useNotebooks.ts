import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Notebook {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function useNotebooks() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotebooks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notebooks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotebooks(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching notebooks:", error);
      }
      toast({
        title: "Erro ao carregar cadernos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotebooks();

    const channel = supabase
      .channel("notebooks_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notebooks" },
        () => {
          fetchNotebooks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addNotebook = async (name: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notebooks")
        .insert({
          name,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualização otimista
      if (data) {
        setNotebooks((prev) => [data, ...prev]);
      }

      toast({ title: "Caderno criado com sucesso!" });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error adding notebook:", error);
      }
      toast({
        title: "Erro ao criar caderno",
        variant: "destructive",
      });
    }
  };

  const updateNotebook = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from("notebooks")
        .update({ name })
        .eq("id", id);

      if (error) throw error;

      await fetchNotebooks();
      toast({ title: "Caderno atualizado!" });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error updating notebook:", error);
      }
      toast({
        title: "Erro ao atualizar caderno",
        variant: "destructive",
      });
    }
  };

  const deleteNotebook = async (id: string) => {
    try {
      // Buscar notebook e suas notas
      const { data: notebook } = await supabase
        .from("notebooks")
        .select("*")
        .eq("id", id)
        .single();

      const { data: notes } = await supabase
        .from("notes")
        .select("*")
        .eq("notebook_id", id);

      // Adicionar à lixeira
      const { error: trashError } = await supabase.from("trash").insert({
        item_type: "notebook",
        item_id: id,
        item_data: { notebook, notes },
        user_id: user?.id,
      });

      if (trashError) throw trashError;

      // Deletar notebook (notas serão mantidas com notebook_id = null devido ao ON DELETE SET NULL)
      const { error } = await supabase.from("notebooks").delete().eq("id", id);

      if (error) throw error;

      await fetchNotebooks();
      toast({ title: "Caderno movido para lixeira" });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error deleting notebook:", error);
      }
      toast({
        title: "Erro ao excluir caderno",
        variant: "destructive",
      });
    }
  };

  return {
    notebooks,
    loading,
    addNotebook,
    updateNotebook,
    deleteNotebook,
    fetchNotebooks,
  };
}
