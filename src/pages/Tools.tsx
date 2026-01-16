import { useState, useMemo } from "react";
import { Plus, Wrench, Sparkles, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ToolsList } from "@/components/tools/ToolsList";
import { ToolsSearch } from "@/components/tools/ToolsSearch";
import { ToolModal } from "@/components/tools/ToolModal";
import { ToolSuggestionsModal } from "@/components/tools/ToolSuggestionsModal";
import { FunctionManagerModal } from "@/components/tools/FunctionManagerModal";
import { ToolsCostSummary } from "@/components/tools/ToolsCostSummary";
import { useTools, Tool } from "@/hooks/useTools";
import { useToolFunctions } from "@/hooks/useToolFunctions";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ToolWithFunctions {
  id: string;
  name: string;
  site_url: string | null;
  api_key: string | null;
  description: string | null;
  icon: string | null;
  is_favorite: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  functions?: { id: string; name: string; color: string }[];
  function_ids?: string[];
}

export default function Tools() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFunctionIds, setSelectedFunctionIds] = useState<string[]>([]);
  const [toolToDelete, setToolToDelete] = useState<ToolWithFunctions | null>(null);
  const [toolToEdit, setToolToEdit] = useState<Tool | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isFunctionManagerOpen, setIsFunctionManagerOpen] = useState(false);

  const { tools, loading, addTool, updateTool, deleteTool, toggleFavorite } = useTools();
  const { functions } = useToolFunctions();
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Filter tools based on search and selected functions
  const filteredTools = useMemo(() => {
    let result = tools;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(tool => 
        tool.name.toLowerCase().includes(query) ||
        tool.description?.toLowerCase().includes(query) ||
        tool.site_url?.toLowerCase().includes(query)
      );
    }

    // Filter by selected functions
    if (selectedFunctionIds.length > 0) {
      result = result.filter(tool =>
        tool.function_ids?.some(id => selectedFunctionIds.includes(id))
      );
    }

    return result;
  }, [tools, searchQuery, selectedFunctionIds]);

  const handleToggleFunction = (functionId: string) => {
    setSelectedFunctionIds(prev => 
      prev.includes(functionId)
        ? prev.filter(id => id !== functionId)
        : [...prev, functionId]
    );
  };

  const handleEdit = (tool: ToolWithFunctions) => {
    // Find full tool data from tools array
    const fullTool = tools.find(t => t.id === tool.id);
    if (fullTool) {
      setToolToEdit(fullTool);
      setIsModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!toolToDelete) return;
    
    try {
      await deleteTool(toolToDelete.id);
      toast.success("Ferramenta excluída com sucesso");
      setToolToDelete(null);
    } catch {
      toast.error("Erro ao excluir ferramenta");
    }
  };

  const handleToggleFavorite = async (toolId: string) => {
    try {
      await toggleFavorite(toolId);
    } catch {
      toast.error("Erro ao atualizar favorito");
    }
  };

  const handleAddTool = () => {
    setToolToEdit(null);
    setIsModalOpen(true);
  };

  const handleSaveTool = async (data: {
    name: string;
    site_url?: string | null;
    api_key?: string | null;
    description?: string | null;
    icon?: string | null;
    monthly_cost?: number | null;
    function_ids?: string[];
  }): Promise<boolean> => {
    try {
      if (toolToEdit) {
        // Update existing tool
        const success = await updateTool(toolToEdit.id, data);
        if (success) {
          toast.success("Ferramenta atualizada com sucesso");
        }
        return success;
      } else {
        // Create new tool
        const result = await addTool(data);
        return !!result;
      }
    } catch {
      toast.error("Erro ao salvar ferramenta");
      return false;
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={toggleTheme}
        onViewChange={(mode) => navigate(`/?view=${mode}`)}
        viewMode="all"
      />
      <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Ferramentas</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie suas ferramentas e APIs digitais
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setIsFunctionManagerOpen(true)}
                title="Gerenciar Funções"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setIsSuggestionsOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sugestões IA</span>
              </Button>
              <Button onClick={handleAddTool}>
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <ToolsSearch 
              value={searchQuery} 
              onChange={setSearchQuery}
              placeholder="Buscar por nome, descrição ou função..."
            />
          </div>

          {/* Function Filters */}
          {functions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {functions.map((func) => {
                const isSelected = selectedFunctionIds.includes(func.id);
                return (
                  <Badge
                    key={func.id}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer transition-all"
                    style={isSelected ? { 
                      backgroundColor: func.color || '#3B82F6',
                      borderColor: func.color || '#3B82F6'
                    } : {
                      borderColor: func.color || '#3B82F6',
                      color: func.color || '#3B82F6'
                    }}
                    onClick={() => handleToggleFunction(func.id)}
                  >
                    {func.name}
                  </Badge>
                );
              })}
              {selectedFunctionIds.length > 0 && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setSelectedFunctionIds([])}
                >
                  Limpar filtros
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Cost Summary */}
        <ToolsCostSummary tools={tools} />
        <ToolsList
          tools={filteredTools.map(t => ({
            ...t,
            functions: t.function_ids?.map(id => {
              const func = functions.find(f => f.id === id);
              return func ? { id: func.id, name: func.name, color: func.color || '#3B82F6' } : null;
            }).filter(Boolean) as { id: string; name: string; color: string }[]
          }))}
          isLoading={loading}
          onEdit={handleEdit}
          onDelete={setToolToDelete}
          onToggleFavorite={handleToggleFavorite}
          onAdd={handleAddTool}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!toolToDelete} onOpenChange={() => setToolToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ferramenta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{toolToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tool Modal */}
      <ToolModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        tool={toolToEdit}
        onSave={handleSaveTool}
      />

      {/* Tool Suggestions Modal */}
      <ToolSuggestionsModal
        open={isSuggestionsOpen}
        onOpenChange={setIsSuggestionsOpen}
        onAddTool={handleSaveTool}
      />

      {/* Function Manager Modal */}
      <FunctionManagerModal
        open={isFunctionManagerOpen}
        onOpenChange={setIsFunctionManagerOpen}
      />
      </div>
    </div>
  );
}
