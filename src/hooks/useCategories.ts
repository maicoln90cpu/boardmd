import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Category {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
    subscribeToCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at");

    if (error) {
      toast({ title: "Erro ao carregar categorias", variant: "destructive" });
      return;
    }

    setCategories(data || []);
    setLoading(false);
  };

  const subscribeToCategories = () => {
    const channel = supabase
      .channel("categories")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addCategory = async (name: string) => {
    const { error } = await supabase
      .from("categories")
      .insert({ name });

    if (error) {
      toast({ title: "Erro ao criar categoria", variant: "destructive" });
    }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao deletar categoria", variant: "destructive" });
    }
  };

  return { categories, loading, addCategory, deleteCategory };
}
