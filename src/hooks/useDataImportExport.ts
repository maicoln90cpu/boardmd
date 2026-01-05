import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/useToast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { validateImportFile, prepareMergeData, ValidationResult, MergeResult } from "@/lib/importValidation";
import { Task } from "@/hooks/tasks/useTasks";

interface Category {
  id: string;
  name: string;
}

interface Column {
  id: string;
  name: string;
  position: number;
}

export interface ImportOptions {
  importCategories: boolean;
  importTasks: boolean;
  selectedCategories: string[];
  selectedTasks: string[];
}

interface UseDataImportExportProps {
  categories: Category[];
  tasks: Task[];
  columns: Column[];
  addCategory: (name: string) => Promise<string | null>;
  onBoardRefresh: () => void;
}

export function useDataImportExport({
  categories,
  tasks,
  columns,
  addCategory,
  onBoardRefresh
}: UseDataImportExportProps) {
  const { toast } = useToast();
  const { addActivity } = useActivityLog();

  // Estados para importação com preview
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importValidation, setImportValidation] = useState<ValidationResult | null>(null);
  const [importMerge, setImportMerge] = useState<MergeResult | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = useCallback(() => {
    const data = {
      categories,
      tasks,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kanban-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addActivity("export", "Dados exportados com sucesso");
    toast({
      title: "Exportação concluída",
      description: "Arquivo JSON baixado com sucesso"
    });
  }, [categories, tasks, addActivity, toast]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        
        // Validar arquivo e preparar preview
        const validation = validateImportFile(text, categories, tasks);
        setImportValidation(validation);
        setImportFileName(file.name);
        
        if (validation.isValid && validation.data) {
          const merge = prepareMergeData(validation.data, categories, tasks);
          setImportMerge(merge);
        } else {
          setImportMerge(null);
        }
        
        // Abrir modal de preview
        setShowImportPreview(true);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Import error:", error);
        }
        toast({
          title: "Erro na importação",
          description: "Não foi possível ler o arquivo",
          variant: "destructive"
        });
      }
    };
    input.click();
  }, [categories, tasks, toast]);

  const handleConfirmImport = useCallback(async (options: ImportOptions) => {
    if (!importValidation?.data || !importMerge) return;
    
    setIsImporting(true);
    
    try {
      let categoriesAdded = 0;
      let tasksAdded = 0;
      
      // Mapear categorias antigas para novas (para tarefas)
      const categoryMapping: Record<string, string> = {};
      
      // Importar categorias selecionadas
      if (options.importCategories) {
        for (const cat of importMerge.categoriesToAdd) {
          if (options.selectedCategories.includes(cat.name)) {
            const newCatId = await addCategory(cat.name);
            if (newCatId && cat.id) {
              categoryMapping[cat.id] = newCatId;
            }
            categoriesAdded++;
          }
        }
      }
      
      // Importar tarefas selecionadas
      if (options.importTasks && importMerge.tasksToAdd.length > 0) {
        // Buscar primeira coluna disponível
        const defaultColumn = columns[0];
        
        for (const task of importMerge.tasksToAdd) {
          if (options.selectedTasks.includes(task.title)) {
            // Mapear category_id se necessário
            let targetCategoryId = task.category_id;
            if (categoryMapping[task.category_id]) {
              targetCategoryId = categoryMapping[task.category_id];
            } else {
              // Verificar se a categoria existe
              const existingCat = categories.find(c => c.id === task.category_id);
              if (!existingCat) {
                // Usar primeira categoria não-diária
                const fallbackCat = categories.find(c => c.name !== "Diário");
                if (fallbackCat) {
                  targetCategoryId = fallbackCat.id;
                }
              }
            }
            
            // Verificar se a coluna existe
            let targetColumnId = task.column_id;
            const existingCol = columns.find(c => c.id === task.column_id);
            if (!existingCol && defaultColumn) {
              targetColumnId = defaultColumn.id;
            }
            
            // Criar tarefa via Supabase
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
              const taskData = {
                title: task.title,
                description: task.description || null,
                priority: task.priority || 'medium',
                due_date: task.due_date || null,
                column_id: targetColumnId,
                category_id: targetCategoryId,
                user_id: userData.user.id,
                tags: task.tags || [],
                subtasks: task.subtasks ? JSON.parse(JSON.stringify(task.subtasks)) : [],
                recurrence_rule: task.recurrence_rule ? JSON.parse(JSON.stringify(task.recurrence_rule)) : null,
                is_completed: task.is_completed || false,
                is_favorite: task.is_favorite || false,
                position: task.position || 0
              };
              await supabase.from("tasks").insert([taskData as any]);
              tasksAdded++;
            }
          }
        }
      }
      
      addActivity("import", `Arquivo ${importFileName} importado: ${categoriesAdded} categorias, ${tasksAdded} tarefas`);
      toast({
        title: "Importação concluída",
        description: `${categoriesAdded} categoria(s) e ${tasksAdded} tarefa(s) importada(s) com sucesso`
      });
      
      // Fechar modal e limpar estados
      setShowImportPreview(false);
      setImportValidation(null);
      setImportMerge(null);
      setImportFileName("");
      
      // Forçar refresh do board
      window.dispatchEvent(new CustomEvent('task-updated'));
      onBoardRefresh();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Import confirm error:", error);
      }
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao importar os dados",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  }, [importValidation, importMerge, columns, categories, addCategory, addActivity, importFileName, toast, onBoardRefresh]);

  const closeImportPreview = useCallback(() => {
    setShowImportPreview(false);
    setImportValidation(null);
    setImportMerge(null);
    setImportFileName("");
  }, []);

  return {
    // Export
    handleExport,
    
    // Import
    handleImport,
    handleConfirmImport,
    closeImportPreview,
    
    // Import state
    showImportPreview,
    setShowImportPreview,
    importValidation,
    importMerge,
    importFileName,
    isImporting
  };
}
