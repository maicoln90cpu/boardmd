import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    const { data, error } = await supabase
      .from("quick_links")
      .select("*")
      .order("position");

    if (!error && data) {
      setLinks(data as QuickLink[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const addLink = async (link: { title: string; url: string; icon: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
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
      fetchLinks();
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
      fetchLinks();
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
      fetchLinks();
    }
  };

  return { links, isLoading, addLink, updateLink, deleteLink, refetch: fetchLinks };
}
