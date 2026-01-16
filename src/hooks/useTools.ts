import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/ui/useToast";
import { logger } from "@/lib/logger";

export interface Tool {
  id: string;
  name: string;
  site_url: string | null;
  api_key: string | null;
  description: string | null;
  icon: string | null;
  is_favorite: boolean | null;
  monthly_cost: number | null;
  user_id: string;
  created_at: string | null;
  updated_at: string | null;
  function_ids: string[];
}

interface ToolInsert {
  name: string;
  site_url?: string | null;
  api_key?: string | null;
  description?: string | null;
  icon?: string | null;
  is_favorite?: boolean;
  monthly_cost?: number | null;
  function_ids?: string[];
}

interface ToolUpdate {
  name?: string;
  site_url?: string | null;
  api_key?: string | null;
  description?: string | null;
  icon?: string | null;
  is_favorite?: boolean;
  monthly_cost?: number | null;
  function_ids?: string[];
}

export const useTools = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFunctionIds, setSelectedFunctionIds] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTools = useCallback(async () => {
    if (!user) {
      setTools([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch tools
      const { data: toolsData, error: toolsError } = await supabase
        .from("tools")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (toolsError) throw toolsError;

      // Fetch all assignments for user's tools
      const toolIds = toolsData?.map((t) => t.id) || [];
      
      let assignmentsMap: Record<string, string[]> = {};
      
      if (toolIds.length > 0) {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("tool_function_assignments")
          .select("tool_id, function_id")
          .in("tool_id", toolIds);

        if (assignmentsError) throw assignmentsError;

        // Group by tool_id
        assignmentsMap = (assignmentsData || []).reduce((acc, assignment) => {
          if (!acc[assignment.tool_id]) {
            acc[assignment.tool_id] = [];
          }
          acc[assignment.tool_id].push(assignment.function_id);
          return acc;
        }, {} as Record<string, string[]>);
      }

      // Combine tools with their function_ids
      const toolsWithFunctions: Tool[] = (toolsData || []).map((tool) => ({
        ...tool,
        function_ids: assignmentsMap[tool.id] || [],
      }));

      setTools(toolsWithFunctions);
    } catch (error) {
      logger.error("Error fetching tools:", error);
      toast({
        title: "Erro ao carregar ferramentas",
        description: "Não foi possível carregar suas ferramentas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const addTool = async (toolData: ToolInsert): Promise<Tool | null> => {
    if (!user) return null;

    const trimmedName = toolData.name.trim();
    if (!trimmedName) {
      toast({
        title: "Nome inválido",
        description: "O nome da ferramenta não pode estar vazio.",
        variant: "destructive",
      });
      return null;
    }

    if (trimmedName.length > 100) {
      toast({
        title: "Nome muito longo",
        description: "O nome da ferramenta deve ter no máximo 100 caracteres.",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Insert tool
      const { data: toolResult, error: toolError } = await supabase
        .from("tools")
        .insert({
          user_id: user.id,
          name: trimmedName,
          site_url: toolData.site_url?.trim() || null,
          api_key: toolData.api_key || null,
          description: toolData.description?.trim() || null,
          icon: toolData.icon || "wrench",
          is_favorite: toolData.is_favorite || false,
          monthly_cost: toolData.monthly_cost ?? null,
        })
        .select()
        .single();

      if (toolError) throw toolError;

      // Insert function assignments if any
      const functionIds = toolData.function_ids || [];
      if (functionIds.length > 0) {
        const { error: assignError } = await supabase
          .from("tool_function_assignments")
          .insert(
            functionIds.map((functionId) => ({
              tool_id: toolResult.id,
              function_id: functionId,
            }))
          );

        if (assignError) {
          logger.error("Error assigning functions:", assignError);
        }
      }

      const newTool: Tool = {
        ...toolResult,
        function_ids: functionIds,
      };

      setTools((prev) => [...prev, newTool].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: "Ferramenta adicionada",
        description: `"${trimmedName}" foi adicionada com sucesso.`,
      });

      return newTool;
    } catch (error) {
      logger.error("Error adding tool:", error);
      toast({
        title: "Erro ao adicionar ferramenta",
        description: "Não foi possível adicionar a ferramenta. Tente novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTool = async (id: string, updates: ToolUpdate): Promise<boolean> => {
    if (!user) return false;

    try {
      // Prepare tool updates (exclude function_ids)
      const { function_ids, ...toolUpdates } = updates;

      // Update tool if there are tool-level updates
      if (Object.keys(toolUpdates).length > 0) {
        const { error: updateError } = await supabase
          .from("tools")
          .update({
            ...toolUpdates,
            name: toolUpdates.name?.trim(),
            site_url: toolUpdates.site_url?.trim() || null,
            description: toolUpdates.description?.trim() || null,
            monthly_cost: toolUpdates.monthly_cost ?? undefined,
          })
          .eq("id", id)
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      }

      // Update function assignments if provided
      if (function_ids !== undefined) {
        // Delete existing assignments
        await supabase
          .from("tool_function_assignments")
          .delete()
          .eq("tool_id", id);

        // Insert new assignments
        if (function_ids.length > 0) {
          const { error: assignError } = await supabase
            .from("tool_function_assignments")
            .insert(
              function_ids.map((functionId) => ({
                tool_id: id,
                function_id: functionId,
              }))
            );

          if (assignError) throw assignError;
        }
      }

      // Update local state
      setTools((prev) =>
        prev.map((tool) => {
          if (tool.id !== id) return tool;
          return {
            ...tool,
            ...toolUpdates,
            function_ids: function_ids ?? tool.function_ids,
          };
        })
      );

      toast({
        title: "Ferramenta atualizada",
        description: "As alterações foram salvas com sucesso.",
      });

      return true;
    } catch (error) {
      logger.error("Error updating tool:", error);
      toast({
        title: "Erro ao atualizar ferramenta",
        description: "Não foi possível atualizar a ferramenta. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteTool = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("tools")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setTools((prev) => prev.filter((t) => t.id !== id));
      
      toast({
        title: "Ferramenta excluída",
        description: "A ferramenta foi removida com sucesso.",
      });

      return true;
    } catch (error) {
      logger.error("Error deleting tool:", error);
      toast({
        title: "Erro ao excluir ferramenta",
        description: "Não foi possível excluir a ferramenta. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleFavorite = async (id: string): Promise<boolean> => {
    const tool = tools.find((t) => t.id === id);
    if (!tool) return false;

    return updateTool(id, { is_favorite: !tool.is_favorite });
  };

  // Filtered tools based on search and selected functions
  const filteredTools = useMemo(() => {
    let result = [...tools];

    // Filter by search query (name or description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (tool) =>
          tool.name.toLowerCase().includes(query) ||
          tool.description?.toLowerCase().includes(query) ||
          tool.site_url?.toLowerCase().includes(query)
      );
    }

    // Filter by selected function IDs
    if (selectedFunctionIds.length > 0) {
      result = result.filter((tool) =>
        selectedFunctionIds.some((fId) => tool.function_ids.includes(fId))
      );
    }

    return result;
  }, [tools, searchQuery, selectedFunctionIds]);

  // Favorites first, then alphabetically
  const sortedTools = useMemo(() => {
    return [...filteredTools].sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredTools]);

  return {
    tools: sortedTools,
    allTools: tools,
    loading,
    searchQuery,
    setSearchQuery,
    selectedFunctionIds,
    setSelectedFunctionIds,
    addTool,
    updateTool,
    deleteTool,
    toggleFavorite,
    refetch: fetchTools,
  };
};
