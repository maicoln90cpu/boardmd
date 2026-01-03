import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/ui/useToast";

export interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

// Predefined vibrant colors for tags
export const TAG_PRESET_COLORS = [
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

export const useTags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTags = useCallback(async () => {
    if (!user) {
      setTags([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const addTag = async (name: string, color: string): Promise<Tag | null> => {
    if (!user) return null;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: "Nome inválido",
        description: "O nome da tag não pode estar vazio.",
        variant: "destructive",
      });
      return null;
    }

    // Check if tag already exists
    const existingTag = tags.find(
      (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingTag) {
      toast({
        title: "Tag já existe",
        description: `A tag "${trimmedName}" já foi criada.`,
        variant: "destructive",
      });
      return existingTag;
    }

    try {
      const { data, error } = await supabase
        .from("tags")
        .insert({
          user_id: user.id,
          name: trimmedName,
          color,
        })
        .select()
        .single();

      if (error) throw error;

      setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: "Tag criada",
        description: `A tag "${trimmedName}" foi criada com sucesso.`,
      });
      return data;
    } catch (error) {
      console.error("Error adding tag:", error);
      toast({
        title: "Erro ao criar tag",
        description: "Não foi possível criar a tag. Tente novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTag = async (id: string, updates: Partial<Pick<Tag, "name" | "color">>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("tags")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setTags((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    } catch (error) {
      console.error("Error updating tag:", error);
      toast({
        title: "Erro ao atualizar tag",
        description: "Não foi possível atualizar a tag. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const deleteTag = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setTags((prev) => prev.filter((t) => t.id !== id));
      toast({
        title: "Tag excluída",
        description: "A tag foi removida com sucesso.",
      });
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast({
        title: "Erro ao excluir tag",
        description: "Não foi possível excluir a tag. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getTagByName = (name: string): Tag | undefined => {
    return tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
  };

  const getTagColor = (tagName: string): string => {
    const tag = getTagByName(tagName);
    return tag?.color || "#6B7280"; // Default gray
  };

  return {
    tags,
    loading,
    addTag,
    updateTag,
    deleteTag,
    getTagByName,
    getTagColor,
    refetch: fetchTags,
  };
};
