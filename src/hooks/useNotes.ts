import { useState, useEffect, useRef, useCallback } from "react";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { offlineSync } from "@/utils/offlineSync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { toast as sonnerToast } from "sonner";

export interface Note {
  id: string;
  title: string;
  content: string | null;
  notebook_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  color: string | null;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();
  
  // Ref para debounce do realtime
  const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref para a nota sendo editada atualmente (para merge inteligente)
  const editingNoteIdRef = useRef<string | null>(null);
  
  // Ref para detectar alterações remotas durante edição
  const pendingRemoteUpdateRef = useRef<string | null>(null);

  const fetchNotes = useCallback(async () => {
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
  }, [user, toast]);

  useEffect(() => {
    fetchNotes();

    const channel = supabase
      .channel("notes_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        (payload) => {
          const changedNoteId = (payload.new as Note)?.id || (payload.old as { id: string })?.id;
          
          // Se a nota alterada é a que está sendo editada, mostrar toast de merge
          if (editingNoteIdRef.current && changedNoteId === editingNoteIdRef.current) {
            pendingRemoteUpdateRef.current = changedNoteId;
            sonnerToast("Alteração remota detectada", {
              description: "Outra sessão modificou esta nota. Deseja recarregar?",
              action: {
                label: "Recarregar",
                onClick: () => {
                  fetchNotes();
                  pendingRemoteUpdateRef.current = null;
                },
              },
              duration: 10000,
            });
            return;
          }
          
          // Para outras notas, atualizar normalmente com debounce
          if (fetchDebounceRef.current) {
            clearTimeout(fetchDebounceRef.current);
          }
          fetchDebounceRef.current = setTimeout(() => {
            fetchNotes();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotes]);

  const addNote = async (title: string, notebookId: string | null = null) => {
    if (!user) return null;

    try {
      if (!isOnline) {
        offlineSync.queueOperation({
          type: 'note',
          action: 'create',
          data: { title, content: "", notebook_id: notebookId, user_id: user.id }
        });
        toast({ title: "Nota salva offline" });
        return null;
      }

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

      if (error) {
        offlineSync.queueOperation({
          type: 'note',
          action: 'create',
          data: { title, content: "", notebook_id: notebookId, user_id: user.id }
        });
        throw error;
      }

      // Atualização otimista
      if (data) {
        setNotes((prev) => [data, ...prev]);
      }

      toast({ title: "Nota criada com sucesso!" });
      return data;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error adding note:", error);
      }
      toast({
        title: "Erro ao criar nota - salvo offline",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateNote = async (
    id: string,
    updates: Partial<Omit<Note, "id" | "user_id" | "created_at">>
  ) => {
    // Optimistic update
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, ...updates, updated_at: new Date().toISOString() } : note
      )
    );

    try {
      if (!isOnline) {
        offlineSync.queueOperation({
          type: 'note',
          action: 'update',
          data: { id, ...updates }
        });
        return;
      }

      const { error } = await supabase
        .from("notes")
        .update(updates)
        .eq("id", id);

      if (error) {
        offlineSync.queueOperation({
          type: 'note',
          action: 'update',
          data: { id, ...updates }
        });
        throw error;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error updating note:", error);
      }
      toast({
        title: "Erro ao atualizar nota - salvo offline",
        variant: "destructive",
      });
      // Revert on error
      await fetchNotes();
    }
  };

  const deleteNote = async (id: string) => {
    // Optimistic update
    const noteToDelete = notes.find((n) => n.id === id);
    setNotes((prev) => prev.filter((note) => note.id !== id));

    try {
      if (!isOnline) {
        offlineSync.queueOperation({
          type: 'note',
          action: 'delete',
          data: { id }
        });
        toast({ title: "Exclusão salva offline" });
        return;
      }

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
      offlineSync.queueOperation({
        type: 'note',
        action: 'delete',
        data: { id }
      });
      toast({
        title: "Erro ao excluir nota - salvo offline",
        variant: "destructive",
      });
      // Revert on error
      if (noteToDelete) {
        setNotes((prev) => [noteToDelete, ...prev]);
      }
    }
  };

  const moveNoteToNotebook = async (noteId: string, notebookId: string | null) => {
    // Optimistic update
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, notebook_id: notebookId } : note
      )
    );

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
      // Revert on error
      await fetchNotes();
    }
  };

  const togglePin = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const newPinnedState = !note.is_pinned;
    
    // Optimistic update
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, is_pinned: newPinnedState } : n
      )
    );

    try {
      const { error } = await supabase
        .from("notes")
        .update({ is_pinned: newPinnedState })
        .eq("id", noteId);

      if (error) throw error;

      toast({
        title: newPinnedState ? "Nota fixada" : "Nota desfixada",
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error toggling pin:", error);
      }
      toast({
        title: "Erro ao fixar nota",
        variant: "destructive",
      });
      // Revert on error
      await fetchNotes();
    }
  };

  const setEditingNoteId = (noteId: string | null) => {
    editingNoteIdRef.current = noteId;
  };

  const hasPendingRemoteUpdate = () => {
    return pendingRemoteUpdateRef.current !== null;
  };

  const clearPendingRemoteUpdate = () => {
    pendingRemoteUpdateRef.current = null;
  };

  return {
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
    moveNoteToNotebook,
    fetchNotes,
    setEditingNoteId,
    hasPendingRemoteUpdate,
    clearPendingRemoteUpdate,
    togglePin,
  };
}
