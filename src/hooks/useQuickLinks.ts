import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  position: number;
  folder: string | null;
  click_count: number;
  user_id: string;
  created_at: string;
}

export function useQuickLinks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["quick_links", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_links")
        .select("*")
        .order("position");

      if (error) throw error;
      return (data || []) as QuickLink[];
    },
    enabled: !!user?.id,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["quick_links"] });
  }, [queryClient]);

  const addLink = async (link: { title: string; url: string; icon: string; folder?: string | null }) => {
    if (!user) return;

    const { error } = await supabase.from("quick_links").insert({
      title: link.title,
      url: link.url,
      icon: link.icon,
      folder: link.folder || null,
      position: links.length,
      user_id: user.id,
    });

    if (error) {
      toast.error("Erro ao adicionar link");
    } else {
      toast.success("Link adicionado");
      invalidate();
    }
  };

  const updateLink = async (id: string, updates: Partial<QuickLink>) => {
    const { error } = await supabase
      .from("quick_links")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar link");
    } else {
      invalidate();
    }
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase
      .from("quick_links")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover link");
    } else {
      toast.success("Link removido");
      invalidate();
    }
  };

  const reorderLinks = async (reorderedLinks: QuickLink[]) => {
    queryClient.setQueryData(["quick_links", user?.id], reorderedLinks);

    const updates = reorderedLinks.map((link, index) =>
      supabase.from("quick_links").update({ position: index }).eq("id", link.id)
    );

    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      toast.error("Erro ao reordenar links");
      invalidate();
    }
  };

  const trackClick = async (id: string) => {
    const link = links.find(l => l.id === id);
    if (!link) return;
    
    // Optimistic update
    queryClient.setQueryData(["quick_links", user?.id], (old: QuickLink[] | undefined) =>
      (old || []).map(l => l.id === id ? { ...l, click_count: l.click_count + 1 } : l)
    );

    await supabase
      .from("quick_links")
      .update({ click_count: link.click_count + 1 })
      .eq("id", id);
  };

  const folders = [...new Set(links.map(l => l.folder).filter(Boolean))] as string[];

  return { links, isLoading, addLink, updateLink, deleteLink, reorderLinks, trackClick, folders, refetch: invalidate };
}
