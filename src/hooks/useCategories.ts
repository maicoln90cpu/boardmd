import { useEffect, useState, useCallback } from "react";
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
  parent_id: string | null;
  depth: number;
  children?: Category[];
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
      .order("depth")
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
        { name: "Diário", user_id: user.id, depth: 0 },
        { name: "Projetos", user_id: user.id, depth: 0 },
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
      await supabase.from("categories").insert([{ name: "Diário", user_id: user.id, depth: 0 }]);
      fetchCategories();
      return;
    }

    // Build hierarchical structure
    const flatCategories = (data || []).map(c => ({
      ...c,
      parent_id: c.parent_id || null,
      depth: c.depth || 0,
      children: [] as Category[]
    }));

    setCategories(flatCategories);
    setLoading(false);
  };

  // Get categories in tree structure
  const getCategoryTree = useCallback((): Category[] => {
    const categoryMap = new Map<string, Category>();
    const roots: Category[] = [];

    // First pass: create map
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree
    categories.forEach(cat => {
      const category = categoryMap.get(cat.id)!;
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        categoryMap.get(cat.parent_id)!.children!.push(category);
      } else {
        roots.push(category);
      }
    });

    return roots;
  }, [categories]);

  // Get flat list with proper ordering for display (parent followed by children)
  const getFlatHierarchy = useCallback((): Category[] => {
    const result: Category[] = [];
    
    const addWithChildren = (cats: Category[], depth: number) => {
      const sorted = [...cats].sort((a, b) => a.position - b.position);
      for (const cat of sorted) {
        result.push({ ...cat, depth });
        const children = categories.filter(c => c.parent_id === cat.id);
        if (children.length > 0) {
          addWithChildren(children, depth + 1);
        }
      }
    };

    const rootCats = categories.filter(c => !c.parent_id);
    addWithChildren(rootCats, 0);
    
    return result;
  }, [categories]);

  // Get subcategories of a parent
  const getSubcategories = useCallback((parentId: string): Category[] => {
    return categories.filter(c => c.parent_id === parentId);
  }, [categories]);

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

  const addCategory = async (name: string, parentId?: string): Promise<string | null> => {
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado",
        variant: "destructive",
      });
      return null;
    }

    try {
      const validated = categorySchema.parse({ name, user_id: user.id });

      // Calculate depth based on parent
      let depth = 0;
      if (parentId) {
        const parent = categories.find(c => c.id === parentId);
        depth = (parent?.depth || 0) + 1;
      }

      // Get the highest position among siblings
      const siblings = categories.filter(c => c.parent_id === (parentId || null));
      const maxPosition = siblings.length > 0 
        ? Math.max(...siblings.map(c => c.position || 0))
        : -1;

      const categoryData = { 
        ...validated, 
        position: maxPosition + 1,
        parent_id: parentId || null,
        depth
      };

      if (!isOnline) {
        offlineSync.queueOperation({
          type: 'category',
          action: 'create',
          data: categoryData
        });
        toast({ title: "Categoria salva offline" });
        return null;
      }

      const { data, error } = await supabase
        .from("categories")
        .insert([categoryData as any])
        .select('id')
        .single();

      if (error) {
        offlineSync.queueOperation({
          type: 'category',
          action: 'create',
          data: categoryData
        });
        toast({ title: "Erro - salvo offline", variant: "destructive" });
        return null;
      }

      return data?.id || null;
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: e.errors[0].message,
          variant: "destructive",
        });
      }
      return null;
    }
  };

  const deleteCategory = async (id: string) => {
    // Check if category has children
    const children = categories.filter(c => c.parent_id === id);
    if (children.length > 0) {
      toast({ 
        title: "Não é possível excluir", 
        description: "Exclua primeiro as subcategorias",
        variant: "destructive" 
      });
      return;
    }

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

  const updateCategory = async (id: string, updates: Partial<Pick<Category, 'name' | 'parent_id'>>) => {
    // Calculate new depth if parent is changing
    let depth: number | undefined;
    if (updates.parent_id !== undefined) {
      if (updates.parent_id) {
        const parent = categories.find(c => c.id === updates.parent_id);
        depth = (parent?.depth || 0) + 1;
      } else {
        depth = 0;
      }
    }

    const updateData = depth !== undefined ? { ...updates, depth } : updates;

    const { error } = await supabase
      .from("categories")
      .update(updateData)
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar categoria", variant: "destructive" });
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

  return { 
    categories, 
    loading, 
    addCategory, 
    deleteCategory, 
    updateCategory,
    reorderCategories,
    getCategoryTree,
    getFlatHierarchy,
    getSubcategories
  };
}
