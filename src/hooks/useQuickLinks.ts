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

  const addLink = async (link: { title: string; url: string; icon: string }) => {
    if (!user) return;

    const { error } = await supabase.from("quick_links").insert({
      title: link.title,
      url: link.url,
      icon: link.icon,
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

  return { links, isLoading, addLink, updateLink, deleteLink, refetch: invalidate };
}
