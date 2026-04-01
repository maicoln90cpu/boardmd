import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 10; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

export function useSharedNotes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const shareNote = useCallback(async (noteId: string): Promise<string | null> => {
    if (!user) return null;
    setLoading(true);
    try {
      // Check if already shared
      const { data: existing } = await supabase
        .from("shared_notes")
        .select("public_slug")
        .eq("note_id", noteId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const url = `${window.location.origin}/shared/${existing.public_slug}`;
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado para a área de transferência!");
        return url;
      }

      const slug = generateSlug();
      const { error } = await supabase
        .from("shared_notes")
        .insert({ note_id: noteId, user_id: user.id, public_slug: slug });

      if (error) throw error;

      const url = `${window.location.origin}/shared/${slug}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link público gerado e copiado!");
      return url;
    } catch (error) {
      toast.error("Erro ao compartilhar nota");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const unshareNote = useCallback(async (noteId: string) => {
    if (!user) return;
    try {
      await supabase
        .from("shared_notes")
        .delete()
        .eq("note_id", noteId)
        .eq("user_id", user.id);
      toast.success("Link público removido");
    } catch {
      toast.error("Erro ao remover compartilhamento");
    }
  }, [user]);

  const getShareStatus = useCallback(async (noteId: string): Promise<string | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from("shared_notes")
      .select("public_slug")
      .eq("note_id", noteId)
      .eq("user_id", user.id)
      .maybeSingle();
    return data?.public_slug || null;
  }, [user]);

  return { shareNote, unshareNote, getShareStatus, loading };
}
