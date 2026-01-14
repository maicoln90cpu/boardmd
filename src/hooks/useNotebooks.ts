import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/ui/useToast";
import { logger } from "@/lib/logger";

export interface NotebookTag {
  id: string;
  name: string;
  color: string;
}

export interface Notebook {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags?: NotebookTag[];
}

export function useNotebooks() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Ref para debounce do realtime
  const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotebooks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notebooks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Cast tags de Json para NotebookTag[]
      const notebooksWithTags: Notebook[] = (data || []).map((n) => ({
        ...n,
        tags: (n.tags as unknown as NotebookTag[]) || [],
      }));
      setNotebooks(notebooksWithTags);
    } catch (error) {
      logger.error("Error fetching notebooks:", error);
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

    // Listener para evento customizado
    const handleNotebookUpdated = () => {
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
      fetchDebounceRef.current = setTimeout(() => {
        fetchNotebooks();
      }, 300);
    };

    window.addEventListener('notebook-updated', handleNotebookUpdated);

    const channel = supabase
      .channel("notebooks_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notebooks" },
        () => {
          // Debounce de 300ms para evitar fetches consecutivos
          if (fetchDebounceRef.current) {
            clearTimeout(fetchDebounceRef.current);
          }
          fetchDebounceRef.current = setTimeout(() => {
            fetchNotebooks();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
      window.removeEventListener('notebook-updated', handleNotebookUpdated);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addNotebook = async (name: string) => {
    if (!user) return;

    // Update otimista: criar notebook temporário
    const tempId = `temp-${Date.now()}`;
    const tempNotebook: Notebook = {
      id: tempId,
      name,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setNotebooks((prev) => [tempNotebook, ...prev]);

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

      // Substituir notebook temporário pelo real com cast de tags
      const notebookWithTags: Notebook = {
        ...data,
        tags: (data.tags as unknown as NotebookTag[]) || [],
      };
      setNotebooks((prev) =>
        prev.map((n) => (n.id === tempId ? notebookWithTags : n))
      );

      // Disparar evento customizado para forçar refresh
      window.dispatchEvent(new CustomEvent('notebook-updated'));

      toast({ title: "Caderno criado com sucesso!" });
    } catch (error) {
      logger.error("Error adding notebook:", error);
      // Remover notebook temporário em caso de erro
      setNotebooks((prev) => prev.filter((n) => n.id !== tempId));
      toast({
        title: "Erro ao criar caderno",
        variant: "destructive",
      });
    }
  };

  const updateNotebook = async (id: string, name: string) => {
    // Optimistic update
    setNotebooks((prev) =>
      prev.map((notebook) =>
        notebook.id === id ? { ...notebook, name, updated_at: new Date().toISOString() } : notebook
      )
    );

    try {
      const { error } = await supabase
        .from("notebooks")
        .update({ name })
        .eq("id", id);

      if (error) throw error;

      // Disparar evento customizado para forçar refresh
      window.dispatchEvent(new CustomEvent('notebook-updated'));

      toast({ title: "Caderno atualizado!" });
    } catch (error) {
      logger.error("Error updating notebook:", error);
      toast({
        title: "Erro ao atualizar caderno",
        variant: "destructive",
      });
      // Revert on error
      await fetchNotebooks();
    }
  };

  const deleteNotebook = async (id: string) => {
    // Optimistic update
    const notebookToDelete = notebooks.find((n) => n.id === id);
    setNotebooks((prev) => prev.filter((notebook) => notebook.id !== id));

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

      // Disparar evento customizado para forçar refresh
      window.dispatchEvent(new CustomEvent('notebook-updated'));

      toast({ title: "Caderno movido para lixeira" });
    } catch (error) {
      logger.error("Error deleting notebook:", error);
      toast({
        title: "Erro ao excluir caderno",
        variant: "destructive",
      });
      // Revert on error
      if (notebookToDelete) {
        setNotebooks((prev) => [notebookToDelete, ...prev]);
      }
    }
  };

  const addTagToNotebook = async (notebookId: string, tag: NotebookTag) => {
    const notebook = notebooks.find((n) => n.id === notebookId);
    if (!notebook) return;

    const currentTags = notebook.tags || [];
    // Verificar se a tag já existe
    if (currentTags.some((t) => t.id === tag.id)) return;

    const updatedTags = [...currentTags, tag];

    // Optimistic update
    setNotebooks((prev) =>
      prev.map((n) => (n.id === notebookId ? { ...n, tags: updatedTags } : n))
    );

    try {
      const { error } = await supabase
        .from("notebooks")
        .update({ tags: JSON.parse(JSON.stringify(updatedTags)) })
        .eq("id", notebookId);

      if (error) throw error;
      window.dispatchEvent(new CustomEvent('notebook-updated'));
    } catch (error) {
      logger.error("Error adding tag:", error);
      toast({
        title: "Erro ao adicionar tag",
        variant: "destructive",
      });
      // Revert
      setNotebooks((prev) =>
        prev.map((n) => (n.id === notebookId ? { ...n, tags: currentTags } : n))
      );
    }
  };

  const removeTagFromNotebook = async (notebookId: string, tagId: string) => {
    const notebook = notebooks.find((n) => n.id === notebookId);
    if (!notebook) return;

    const currentTags = notebook.tags || [];
    const updatedTags = currentTags.filter((t) => t.id !== tagId);

    // Optimistic update
    setNotebooks((prev) =>
      prev.map((n) => (n.id === notebookId ? { ...n, tags: updatedTags } : n))
    );

    try {
      const { error } = await supabase
        .from("notebooks")
        .update({ tags: JSON.parse(JSON.stringify(updatedTags)) })
        .eq("id", notebookId);

      if (error) throw error;
      window.dispatchEvent(new CustomEvent('notebook-updated'));
    } catch (error) {
      logger.error("Error removing tag:", error);
      toast({
        title: "Erro ao remover tag",
        variant: "destructive",
      });
      // Revert
      setNotebooks((prev) =>
        prev.map((n) => (n.id === notebookId ? { ...n, tags: currentTags } : n))
      );
    }
  };

  const updateNotebookTags = async (notebookId: string, tags: NotebookTag[]) => {
    const notebook = notebooks.find((n) => n.id === notebookId);
    if (!notebook) return;

    const currentTags = notebook.tags || [];

    // Optimistic update
    setNotebooks((prev) =>
      prev.map((n) => (n.id === notebookId ? { ...n, tags } : n))
    );

    try {
      const { error } = await supabase
        .from("notebooks")
        .update({ tags: JSON.parse(JSON.stringify(tags)) })
        .eq("id", notebookId);

      if (error) throw error;
      window.dispatchEvent(new CustomEvent('notebook-updated'));
    } catch (error) {
      logger.error("Error updating tags:", error);
      toast({
        title: "Erro ao atualizar tags",
        variant: "destructive",
      });
      // Revert
      setNotebooks((prev) =>
        prev.map((n) => (n.id === notebookId ? { ...n, tags: currentTags } : n))
      );
    }
  };

  // Obter todas as tags únicas de todos os notebooks
  const getAllTags = (): NotebookTag[] => {
    const tagMap = new Map<string, NotebookTag>();
    notebooks.forEach((notebook) => {
      (notebook.tags || []).forEach((tag) => {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag);
        }
      });
    });
    return Array.from(tagMap.values());
  };

  return {
    notebooks,
    loading,
    addNotebook,
    updateNotebook,
    deleteNotebook,
    fetchNotebooks,
    addTagToNotebook,
    removeTagFromNotebook,
    updateNotebookTags,
    getAllTags,
  };
}
