import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";

export interface TrashItem {
  id: string;
  item_type: "note" | "notebook";
  item_id: string;
  item_data: any;
  deleted_at: string;
  user_id: string;
}

export function useTrash() {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTrash = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("trash")
        .select("*")
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      setTrashItems((data || []) as TrashItem[]);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching trash:", error);
      }
      toast({
        title: "Erro ao carregar lixeira",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, [user]);

  const restoreItem = async (item: TrashItem) => {
    try {
      if (item.item_type === "notebook") {
        // Restaurar caderno
        const { error: notebookError } = await supabase
          .from("notebooks")
          .insert(item.item_data.notebook);

        if (notebookError) throw notebookError;

        // Restaurar notas do caderno
        if (item.item_data.notes && item.item_data.notes.length > 0) {
          const { error: notesError } = await supabase
            .from("notes")
            .insert(item.item_data.notes);

          if (notesError) throw notesError;
        }
      } else {
        // Restaurar nota
        const { error } = await supabase.from("notes").insert(item.item_data);

        if (error) throw error;
      }

      // Remover da lixeira
      const { error: deleteError } = await supabase
        .from("trash")
        .delete()
        .eq("id", item.id);

      if (deleteError) throw deleteError;

      toast({ title: "Item restaurado com sucesso!" });
      fetchTrash();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error restoring item:", error);
      }
      toast({
        title: "Erro ao restaurar item",
        variant: "destructive",
      });
    }
  };

  const permanentlyDelete = async (itemId: string) => {
    try {
      const { error } = await supabase.from("trash").delete().eq("id", itemId);

      if (error) throw error;

      toast({ title: "Item excluído permanentemente" });
      fetchTrash();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error permanently deleting item:", error);
      }
      toast({
        title: "Erro ao excluir item",
        variant: "destructive",
      });
    }
  };

  const emptyTrash = async () => {
    try {
      const { error } = await supabase
        .from("trash")
        .delete()
        .eq("user_id", user?.id || "");

      if (error) throw error;

      toast({ title: "Lixeira esvaziada!" });
      fetchTrash();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error emptying trash:", error);
      }
      toast({
        title: "Erro ao esvaziar lixeira",
        variant: "destructive",
      });
    }
  };

  return {
    trashItems,
    loading,
    restoreItem,
    permanentlyDelete,
    emptyTrash,
    fetchTrash,
  };
}
