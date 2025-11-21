import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { categorySchema } from "@/lib/validations";
import { z } from "zod";
import { offlineSync } from "@/utils/offlineSync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export interface Category {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  position: number;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    fetchCategories();
    const cleanup = subscribeToCategories();
    return cleanup;
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("position");

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

      // Get the highest position to append at the end
      const maxPosition = categories.length > 0 
        ? Math.max(...categories.map(c => c.position || 0))
        : -1;

      const categoryData = { ...validated, position: maxPosition + 1 };

      if (!isOnline) {
        offlineSync.queueOperation({
          type: 'category',
          action: 'create',
          data: categoryData
        });
        toast({ title: "Categoria salva offline" });
        return;
      }

      const { error } = await supabase
        .from("categories")
        .insert([categoryData as any]);

      if (error) {
        offlineSync.queueOperation({
          type: 'category',
          action: 'create',
          data: categoryData
        });
        toast({ title: "Erro - salvo offline", variant: "destructive" });
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
    if (!isOnline) {
      offlineSync.queueOperation({
        type: 'category',
        action: 'delete',
        data: { id }
      });
      toast({ title: "Exclusão salva offline" });
      return;
    }

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      offlineSync.queueOperation({
        type: 'category',
        action: 'delete',
        data: { id }
      });
      toast({ title: "Erro - salvo offline", variant: "destructive" });
    }
  };

  const reorderCategories = async (reorderedCategories: Category[]) => {
    try {
      // Update all positions in a single transaction
      const updates = reorderedCategories.map((category, index) => ({
        id: category.id,
        position: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("categories")
          .update({ position: update.position })
          .eq("id", update.id);

        if (error) throw error;
      }

      setCategories(reorderedCategories);
    } catch (error) {
      toast({ title: "Erro ao reordenar categorias", variant: "destructive" });
    }
  };

  return { categories, loading, addCategory, deleteCategory, reorderCategories };
}
