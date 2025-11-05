import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Note {
  id: string;
  title: string;
  content: string | null;
  notebook_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching notes:", error);
      }
      toast({
        title: "Erro ao carregar notas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();

    const channel = supabase
      .channel("notes_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addNote = async (title: string, notebookId: string | null = null) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("notes")
        .insert({
          title,
          content: "",
          notebook_id: notebookId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Nota criada com sucesso!" });
      return data;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error adding note:", error);
      }
      toast({
        title: "Erro ao criar nota",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateNote = async (
    id: string,
    updates: Partial<Omit<Note, "id" | "user_id" | "created_at">>
  ) => {
    try {
      const { error } = await supabase
        .from("notes")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error updating note:", error);
      }
      toast({
        title: "Erro ao atualizar nota",
        variant: "destructive",
      });
    }
  };

  const deleteNote = async (id: string) => {
    try {
      // Buscar nota
      const { data: note } = await supabase
        .from("notes")
        .select("*")
        .eq("id", id)
        .single();

      // Adicionar à lixeira
      const { error: trashError } = await supabase.from("trash").insert({
        item_type: "note",
        item_id: id,
        item_data: note,
        user_id: user?.id,
      });

      if (trashError) throw trashError;

      // Deletar nota
      const { error } = await supabase.from("notes").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Nota movida para lixeira" });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error deleting note:", error);
      }
      toast({
        title: "Erro ao excluir nota",
        variant: "destructive",
      });
    }
  };

  const moveNoteToNotebook = async (noteId: string, notebookId: string | null) => {
    try {
      const { error } = await supabase
        .from("notes")
        .update({ notebook_id: notebookId })
        .eq("id", noteId);

      if (error) throw error;

      toast({
        title: notebookId ? "Nota movida para caderno" : "Nota removida do caderno",
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error moving note:", error);
      }
      toast({
        title: "Erro ao mover nota",
        variant: "destructive",
      });
    }
  };

  return {
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
    moveNoteToNotebook,
    fetchNotes,
  };
}
