import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { categorySchema } from "@/lib/validations";
import { z } from "zod";

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
  const { user } = useAuth();

  useEffect(() => {
    fetchCategories();
    const cleanup = subscribeToCategories();
    return cleanup;
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at");

    if (error) {
      toast({ title: "Erro ao carregar categorias", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Initialize default categories if none exist
    if (!data || data.length === 0) {
      if (!user) {
        setLoading(false);
        return;
      }

      const defaultCategories = [
        { name: "Diário", user_id: user.id },
        { name: "Projetos", user_id: user.id },
      ];

      const { error: insertError } = await supabase
        .from("categories")
        .insert(defaultCategories);

      if (!insertError) {
        fetchCategories(); // Refetch after seeding
      }
      return;
    }

    // Ensure "Diário" exists
    const hasDiario = data.some(c => c.name === "Diário");
    if (!hasDiario && user) {
      await supabase.from("categories").insert([{ name: "Diário", user_id: user.id }]);
      fetchCategories();
      return;
    }

    setCategories(data || []);
    setLoading(false);
  };

  const subscribeToCategories = () => {
    const channel = supabase
      .channel("categories-subscription")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addCategory = async (name: string) => {
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado",
        variant: "destructive",
      });
      return;
    }

    try {
      const validated = categorySchema.parse({ name, user_id: user.id });

      const { error } = await supabase
        .from("categories")
        .insert([validated as any]);

      if (error) {
        toast({ title: "Erro ao criar categoria", variant: "destructive" });
      }
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: e.errors[0].message,
          variant: "destructive",
        });
      }
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
