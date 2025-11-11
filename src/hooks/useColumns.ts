import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { columnSchema } from "@/lib/validations";
import { z } from "zod";
import { useLocalStorage } from "./useLocalStorage";

export interface Column {
  id: string;
  name: string;
  position: number;
  user_id: string;
  created_at: string;
  color: string | null;
}

export function useColumns() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const [hiddenColumns, setHiddenColumns] = useLocalStorage<string[]>("kanban-hidden-columns", []);

  useEffect(() => {
    fetchColumns();
    const cleanup = subscribeToColumns();
    return cleanup;
  }, []);

  const fetchColumns = async () => {
    const { data, error } = await supabase
      .from("columns")
      .select("*")
      .order("position");

    if (error) {
      toast({ title: "Erro ao carregar colunas", variant: "destructive" });
      return;
    }

    if (data && data.length === 0) {
      await initializeColumns();
    } else {
      setColumns(data || []);
    }
    setLoading(false);
  };

  const initializeColumns = async () => {
    if (!user) {
      return;
    }

    const defaultColumns = [
      { name: "A Fazer", position: 0, user_id: user.id },
      { name: "Em Andamento", position: 1, user_id: user.id },
      { name: "Concluído", position: 2, user_id: user.id },
    ];

    const { error } = await supabase.from("columns").insert(defaultColumns);

    if (!error) {
      fetchColumns();
    }
  };

  const subscribeToColumns = () => {
    const channel = supabase
      .channel("columns-subscription")
      .on("postgres_changes", { event: "*", schema: "public", table: "columns" }, () => {
        fetchColumns();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addColumn = async (name: string) => {
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado",
        variant: "destructive",
      });
      return;
    }

    try {
      const maxPosition = Math.max(...columns.map((c) => c.position), -1);
      const validated = columnSchema.parse({ 
        name, 
        position: maxPosition + 1,
        user_id: user.id 
      });

      const { error } = await supabase
        .from("columns")
        .insert([validated as any]);

      if (error) {
        toast({ title: "Erro ao criar coluna", variant: "destructive" });
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

  const updateColumnColor = async (columnId: string, color: string | null) => {
    try {
      const { error } = await supabase
        .from("columns")
        .update({ color })
        .eq("id", columnId);

      if (error) throw error;

      toast({ title: "Cor atualizada com sucesso" });
    } catch (error) {
      toast({
        title: "Erro ao atualizar cor",
        variant: "destructive",
      });
    }
  };

  const deleteColumn = async (columnId: string) => {
    try {
      // Verificar se há tarefas nesta coluna
      const { count, error: countError } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("column_id", columnId);

      if (countError) throw countError;

      if (count && count > 0) {
        toast({
          title: "Não é possível deletar",
          description: `Esta coluna tem ${count} tarefa(s). Mova-as antes de deletar.`,
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase
        .from("columns")
        .delete()
        .eq("id", columnId);

      if (error) throw error;

      toast({ title: "Coluna deletada com sucesso" });
      return true;
    } catch (error) {
      toast({
        title: "Erro ao deletar coluna",
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleColumnVisibility = (columnId: string) => {
    setHiddenColumns((prev) => {
      if (prev.includes(columnId)) {
        return prev.filter((id) => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  const getVisibleColumns = () => {
    return columns.filter((col) => !hiddenColumns.includes(col.id));
  };

  const resetToDefaultView = () => {
    // Mostrar apenas as 3 primeiras colunas (as originais)
    const defaultColumns = columns.slice(0, 3).map((c) => c.id);
    const columnsToHide = columns.slice(3).map((c) => c.id);
    setHiddenColumns(columnsToHide);
    
    toast({ title: "Visualização resetada para padrão (3 colunas)" });
  };

  return { 
    columns, 
    loading, 
    addColumn, 
    updateColumnColor, 
    deleteColumn,
    hiddenColumns,
    toggleColumnVisibility,
    getVisibleColumns,
    resetToDefaultView
  };
}
