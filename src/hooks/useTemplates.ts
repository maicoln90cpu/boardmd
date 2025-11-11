import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  is_public: boolean;
  created_by: string | null;
  config: {
    categories: Array<{ name: string; color?: string }>;
    columns: Array<{ name: string; position: number }>;
    tasks: Array<{
      title: string;
      description?: string;
      priority?: string;
      column: string;
    }>;
  };
  usage_count: number;
  created_at: string;
}

export function useTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["project-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_templates")
        .select("*")
        .order("usage_count", { ascending: false });

      if (error) throw error;
      return data as ProjectTemplate[];
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async ({ 
      templateId, 
      mode 
    }: { 
      templateId: string; 
      mode: "add" | "replace" 
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const template = templates?.find((t) => t.id === templateId);
      if (!template) throw new Error("Template not found");

      // Se modo for "replace", deletar colunas não-originais existentes
      if (mode === "replace") {
        // Buscar colunas atuais do usuário
        const { data: existingColumns, error: fetchError } = await supabase
          .from("columns")
          .select("id, position")
          .eq("user_id", user.id)
          .order("position");

        if (fetchError) throw fetchError;

        // Deletar colunas além das 3 primeiras (originais)
        if (existingColumns && existingColumns.length > 3) {
          const columnsToDelete = existingColumns.slice(3).map((c) => c.id);
          
          // Verificar se há tarefas nessas colunas
          const { count, error: countError } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .in("column_id", columnsToDelete);

          if (countError) throw countError;

          if (count && count > 0) {
            // Mover tarefas para a primeira coluna (A Fazer)
            const firstColumnId = existingColumns[0].id;
            await supabase
              .from("tasks")
              .update({ column_id: firstColumnId })
              .in("column_id", columnsToDelete);
          }

          // Deletar as colunas
          const { error: deleteError } = await supabase
            .from("columns")
            .delete()
            .in("id", columnsToDelete);

          if (deleteError) throw deleteError;
        }
      }

      // 1. Criar categorias
      const categoryMap = new Map<string, string>();
      for (const cat of template.config.categories) {
        const { data: category, error: catError } = await supabase
          .from("categories")
          .insert({ name: cat.name, user_id: user.id })
          .select()
          .single();

        if (catError) throw catError;
        categoryMap.set(cat.name, category.id);
      }

      // 2. Criar colunas
      const columnMap = new Map<string, string>();
      
      // Buscar a maior posição atual
      const { data: maxPosData } = await supabase
        .from("columns")
        .select("position")
        .eq("user_id", user.id)
        .order("position", { ascending: false })
        .limit(1);

      const startPosition = maxPosData && maxPosData.length > 0 ? maxPosData[0].position + 1 : 0;

      for (const col of template.config.columns) {
        const { data: column, error: colError } = await supabase
          .from("columns")
          .insert({
            name: col.name,
            position: startPosition + col.position,
            user_id: user.id,
          })
          .select()
          .single();

        if (colError) throw colError;
        columnMap.set(col.name, column.id);
      }

      // 3. Criar tarefas
      const categoryId = Array.from(categoryMap.values())[0];
      for (const task of template.config.tasks) {
        const columnId = columnMap.get(task.column);
        if (!columnId) continue;

        const { error: taskError } = await supabase.from("tasks").insert({
          title: task.title,
          description: task.description || null,
          priority: task.priority || "medium",
          column_id: columnId,
          category_id: categoryId,
          user_id: user.id,
          position: 0,
        });

        if (taskError) throw taskError;
      }

      // 4. Incrementar contador de uso
      await supabase
        .from("project_templates")
        .update({ usage_count: template.usage_count + 1 })
        .eq("id", templateId);

      return { template, mode };
    },
    onSuccess: ({ template, mode }) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["columns"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      const modeText = mode === "replace" ? "substituindo as colunas existentes" : "adicionando às colunas atuais";
      toast({
        title: "✅ Template Aplicado!",
        description: `"${template.name}" foi configurado com sucesso ${modeText}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao aplicar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    templates,
    isLoading,
    applyTemplate: applyTemplateMutation.mutate,
    isApplying: applyTemplateMutation.isPending,
  };
}
