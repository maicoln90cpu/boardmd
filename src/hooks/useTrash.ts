import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/ui/useToast";
import { TrashItem, TrashNoteData, TrashNotebookData } from "@/types";
import { logger } from "@/lib/logger";

// Re-exportar tipo para compatibilidade
export type { TrashItem };

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

      // Mapear dados para o tipo TrashItem
      const mappedItems: TrashItem[] = (data || []).map((item) => ({
        id: item.id,
        item_type: item.item_type as "note" | "notebook",
        item_id: item.item_id,
        item_data: item.item_data as unknown as TrashNoteData | TrashNotebookData,
        deleted_at: item.deleted_at,
        user_id: item.user_id,
      }));

      setTrashItems(mappedItems);
    } catch (error) {
      logger.error("Error fetching trash:", error);
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
        const notebookData = item.item_data as TrashNotebookData;
        const { error: notebookError } = await supabase
          .from("notebooks")
          .insert(notebookData.notebook);

        if (notebookError) throw notebookError;

        // Restaurar notas do caderno
        if (notebookData.notes && notebookData.notes.length > 0) {
          const { error: notesError } = await supabase
            .from("notes")
            .insert(notebookData.notes);

          if (notesError) throw notesError;
        }
      } else {
        // Restaurar nota
        const noteData = item.item_data as TrashNoteData;
        const { error } = await supabase.from("notes").insert(noteData);

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
      logger.error("Error restoring item:", error);
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
      logger.error("Error permanently deleting item:", error);
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
      logger.error("Error emptying trash:", error);
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
