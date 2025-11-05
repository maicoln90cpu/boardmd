import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Column {
  id: string;
  name: string;
  position: number;
  user_id: string;
  created_at: string;
}

export function useColumns() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchColumns();
    subscribeToColumns();
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
    const defaultColumns = [
      { name: "A Fazer", position: 0 },
      { name: "Em Andamento", position: 1 },
      { name: "Concluído", position: 2 },
    ];

    const { error } = await supabase.from("columns").insert(defaultColumns);

    if (!error) {
      fetchColumns();
    }
  };

  const subscribeToColumns = () => {
    const channel = supabase
      .channel("columns")
      .on("postgres_changes", { event: "*", schema: "public", table: "columns" }, () => {
        fetchColumns();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addColumn = async (name: string) => {
    const maxPosition = Math.max(...columns.map((c) => c.position), -1);

    const { error } = await supabase
      .from("columns")
      .insert({ name, position: maxPosition + 1 });

    if (error) {
      toast({ title: "Erro ao criar coluna", variant: "destructive" });
    }
  };

  return { columns, loading, addColumn };
}
