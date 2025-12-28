import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TaskModal } from "@/components/TaskModal";
import { DailyReviewModal } from "@/components/DailyReviewModal";
import { ImportPreviewModal, ImportOptions } from "@/components/ImportPreviewModal";
import { ActivityHistory } from "@/components/ActivityHistory";
import { DailyKanbanView } from "@/components/kanban/DailyKanbanView";
import { ProjectsKanbanView } from "@/components/kanban/ProjectsKanbanView";
import { useCategories } from "@/hooks/useCategories";
import { useColumns } from "@/hooks/useColumns";
import { useTasks, Task } from "@/hooks/useTasks";
import { useDueDateAlerts } from "@/hooks/useDueDateAlerts";
import { useNotes } from "@/hooks/useNotes";
import { useNotebooks } from "@/hooks/useNotebooks";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSettings } from "@/hooks/useSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { KanbanLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { calculateNextRecurrenceDate } from "@/lib/recurrenceUtils";
import { validateImportFile, prepareMergeData, ValidationResult, MergeResult } from "@/lib/importValidation";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

function Index() {
  const isMobile = useIsMobile();
  const {
    categories,
    loading: loadingCategories,
    addCategory
  } = useCategories();
  const {
    columns,
    loading: loadingColumns,
    hiddenColumns,
    toggleColumnVisibility,
    getVisibleColumns,
    resetToDefaultView,
    deleteColumn,
    renameColumn,
    reorderColumns,
    addColumn,
    toggleColumnKanbanVisibility
  } = useColumns();
  const { notes } = useNotes();
  const { notebooks } = useNotebooks();
  const {
    toggleTheme
  } = useTheme();
  const {
    toast
  } = useToast();
  const {
    addActivity
  } = useActivityLog();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [dailyCategory, setDailyCategory] = useState<string>("");
  const [dailyBoardKey, setDailyBoardKey] = useState(0);
  const [projectsBoardKey, setProjectsBoardKey] = useState(0); // Nova key para Projetos
  const [viewMode, setViewMode] = useState<"daily" | "all">("daily"); // Será ajustado pelo useEffect
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"by_category" | "all_tasks">("all_tasks");

  // Estado para modal de nova tarefa via atalho
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);

  // Estado para Daily Review Modal
  const [showDailyReview, setShowDailyReview] = useState(false);
  const [dailyReviewChecked, setDailyReviewChecked] = useState(false);

  // Estados para importação com preview
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importValidation, setImportValidation] = useState<ValidationResult | null>(null);
  const [importMerge, setImportMerge] = useState<MergeResult | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [importFileData, setImportFileData] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  // CORREÇÃO: Usar useSettings em vez de useLocalStorage para configurações
  const {
    settings,
    updateSettings,
    saveSettings
  } = useSettings();

  // Valores derivados das configurações (somente leitura aqui - editar em Config)
  const simplifiedMode = settings.kanban.simplifiedMode;
  const dailySortOption = settings.kanban.dailySortOption;
  const dailySortOrder = settings.kanban.dailySortOrder;
  const densityMode = settings.defaultDensity;
  const showFavoritesPanel = settings.kanban.showFavoritesPanel;
  const hideBadgesMobile = settings.mobile.hideBadges;
  const dailyGridColumnsMobile = settings.mobile.dailyGridColumns;
  const projectsGridColumnsMobile = settings.mobile.projectsGridColumns;

  // Filtros (persistidos no localStorage - são filtros temporários, não configs)
  const [searchTerm, setSearchTerm] = useLocalStorage<string>("filter-search", "");
  const [priorityFilter, setPriorityFilter] = useLocalStorage<string>("filter-priority", "all");
  const [tagFilter, setTagFilter] = useLocalStorage<string>("filter-tag", "all");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [categoryFilterInitialized, setCategoryFilterInitialized] = useState(false);
  
  // CORREÇÃO: Usar settings.kanban.projectsSortOption em vez de localStorage
  const projectsSortOption = settings.kanban.projectsSortOption;
  const projectsSortOrder = settings.kanban.projectsSortOrder;

  // Filtros do Kanban Diário (separados dos filtros de Projetos)
  const [dailyPriorityFilter, setDailyPriorityFilter] = useLocalStorage<string>("daily-priority-filter", "all");
  const [dailyTagFilter, setDailyTagFilter] = useLocalStorage<string>("daily-tag-filter", "all");
  const [dailySearchTerm, setDailySearchTerm] = useLocalStorage<string>("daily-search", "");
  
  // Filtros de data persistidos via settings (banco de dados)
  const dailyDueDateFilter = settings.kanban.dailyDueDateFilter;
  const projectsDueDateFilter = settings.kanban.projectsDueDateFilter;

  // Estado para filtro de categoria no mobile (Kanban Projetos)
  const [selectedCategoryFilterMobile, setSelectedCategoryFilterMobile] = useState<string>("all");

  // Funções para atualizar settings localmente (com sync para DB)
  const setSimplifiedMode = async (value: boolean) => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        simplifiedMode: value
      }
    });
    await saveSettings();
  };
  const setDailySortOption = async (value: "time" | "name" | "priority") => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        dailySortOption: value
      }
    });
    await saveSettings();
  };
  const setDailySortOrder = async (value: "asc" | "desc") => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        dailySortOrder: value
      }
    });
    await saveSettings();
  };
  const setDensityMode = async (value: "comfortable" | "compact" | "ultra-compact") => {
    updateSettings({
      defaultDensity: value
    });
    await saveSettings();
  };
  const setShowFavoritesPanel = async (value: boolean) => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        showFavoritesPanel: value
      }
    });
    await saveSettings();
  };
  const setHideBadgesMobile = async (value: boolean) => {
    updateSettings({
      mobile: {
        ...settings.mobile,
        hideBadges: value
      }
    });
    await saveSettings();
  };
  const setDailyGridColumnsMobile = async (value: 1 | 2) => {
    updateSettings({
      mobile: {
        ...settings.mobile,
        dailyGridColumns: value
      }
    });
    await saveSettings();
  };
  const setProjectsGridColumnsMobile = async (value: 1 | 2) => {
    updateSettings({
      mobile: {
        ...settings.mobile,
        projectsGridColumns: value
      }
    });
    await saveSettings();
  };
  
  // Funções para atualizar filtros de data (persistidos no banco)
  const setDailyDueDateFilter = async (value: string) => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        dailyDueDateFilter: value
      }
    });
    await saveSettings();
  };
  const setProjectsDueDateFilter = async (value: string) => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        projectsDueDateFilter: value
      }
    });
    await saveSettings();
  };

  // Atalhos de teclado globais
  useKeyboardShortcuts({
    onSearch: () => {
      if (viewMode === "all") {
        searchInputRef.current?.focus();
      }
    },
    onNewTask: () => {
      setShowQuickTaskModal(true);
    }
  });

  // Ler view da URL na inicialização OU usar defaultView das configurações
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "all" || view === "daily") {
      setViewMode(view);
    } else if (settings.kanban.defaultView) {
      // Sem view na URL, usar configuração padrão
      setViewMode(settings.kanban.defaultView === "projects" ? "all" : "daily");
    }
  }, [settings.kanban.defaultView]);

  // OTIMIZAÇÃO: Consolidar em uma única instância de useTasks
  // Busca todas as tarefas uma vez e usa filtros locais para diferentes views
  const {
    tasks: allTasks,
    resetAllTasksToFirstColumn: resetDailyTasks,
    updateTask: updateDailyTask,
    addTask
  } = useTasks("all");

  // Hook de notificações de prazo - monitora TODAS as tarefas
  useDueDateAlerts(allTasks);

  // ==========================================
  // AUTOMAÇÃO: Mover tarefas para "Semana Atual"
  // ==========================================
  const moveTasksToCurrentWeek = useCallback(async () => {
    if (!settings.kanban.autoMoveToCurrentWeek) return;
    
    // Encontrar coluna "Semana Atual"
    const currentWeekColumn = columns.find(col => 
      col.name.toLowerCase().includes("semana atual") || 
      col.name.toLowerCase() === "esta semana"
    );
    
    if (!currentWeekColumn) return;
    
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Segunda-feira
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Domingo
    
    // Filtrar tarefas que devem ser movidas
    const tasksToMove = allTasks.filter(task => {
      // Já está na coluna "Semana Atual"?
      if (task.column_id === currentWeekColumn.id) return false;
      
      // Está concluída?
      if (task.is_completed) return false;
      
      // Tem due_date dentro da semana atual?
      if (!task.due_date) return false;
      
      const dueDate = new Date(task.due_date);
      return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
    });
    
    if (tasksToMove.length === 0) return;
    
    // OTIMIZAÇÃO: Batch update com .in() em vez de loop individual
    const taskIds = tasksToMove.map(t => t.id);
    const { error } = await supabase
      .from("tasks")
      .update({ column_id: currentWeekColumn.id })
      .in("id", taskIds);
    
    if (error) {
      if (import.meta.env.DEV) console.error("Erro ao mover tarefas:", error);
      return;
    }
    
    // Disparar evento para refresh
    window.dispatchEvent(new CustomEvent('task-updated'));
    
    toast({
      title: "Automação Semana Atual",
      description: `${tasksToMove.length} tarefa(s) movida(s) para "Semana Atual"`
    });
  }, [allTasks, columns, settings.kanban.autoMoveToCurrentWeek, toast]);

  // Executar automação ao carregar a página
  useEffect(() => {
    if (allTasks.length > 0 && columns.length > 0 && settings.kanban.autoMoveToCurrentWeek) {
      // Delay pequeno para garantir que tudo carregou
      const timeout = setTimeout(() => {
        moveTasksToCurrentWeek();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [allTasks.length, columns.length, settings.kanban.autoMoveToCurrentWeek]);

  // ==========================================
  // DAILY REVIEW: Popup matinal
  // ==========================================
  useEffect(() => {
    if (dailyReviewChecked) return;
    if (!settings.productivity.dailyReviewEnabled) {
      setDailyReviewChecked(true);
      return;
    }
    
    const lastShown = settings.productivity.dailyReviewLastShown;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Verificar se já foi mostrado hoje
    if (lastShown === today) {
      setDailyReviewChecked(true);
      return;
    }
    
    // Aguardar tarefas carregarem e mostrar modal
    if (allTasks.length > 0) {
      setShowDailyReview(true);
      setDailyReviewChecked(true);
      
      // Atualizar última exibição
      updateSettings({
        productivity: {
          ...settings.productivity,
          dailyReviewLastShown: today
        }
      });
      saveSettings();
    }
  }, [allTasks.length, settings.productivity.dailyReviewEnabled, settings.productivity.dailyReviewLastShown, dailyReviewChecked]);

  // Filtrar tasks baseado no viewMode
  const tasks = useMemo(() => {
    if (viewMode === "daily" && dailyCategory) {
      return allTasks.filter(task => task.category_id === dailyCategory);
    }
    return allTasks;
  }, [allTasks, viewMode, dailyCategory]);

  // Filtrar tasks baseado no viewMode e filtros
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const dailyCat = categories.find(c => c.name === "Diário");

      // No modo "all", excluir tarefas do Diário
      if (viewMode === "all" && task.category_id === dailyCat?.id) {
        return false;
      }

      // Filtro de categoria (apenas no modo "all" e após inicialização)
      if (viewMode === "all" && categoryFilterInitialized && categoryFilter.length > 0 && !categoryFilter.includes(task.category_id)) {
        return false;
      }

      // Filtro mobile de categoria
      if (isMobile && viewMode === "all" && selectedCategoryFilterMobile !== "all") {
        if (task.category_id !== selectedCategoryFilterMobile) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, viewMode, categoryFilter, categories, isMobile, selectedCategoryFilterMobile]);
  useEffect(() => {
    if (categories.length > 0) {
      // Encontrar categoria "Diário"
      const daily = categories.find(c => c.name === "Diário");
      if (daily) {
        setDailyCategory(daily.id);
      }

      // Selecionar primeira categoria que não seja "Diário"
      if (!selectedCategory) {
        const firstNonDaily = categories.find(c => c.name !== "Diário");
        if (firstNonDaily) {
          setSelectedCategory(firstNonDaily.id);
        }
      }

      // Inicializar filtro de categorias com todas (exceto Diário) - apenas na primeira vez
      if (!categoryFilterInitialized) {
        const allCategoryIds = categories.filter(c => c.name !== "Diário").map(c => c.id);
        setCategoryFilter(allCategoryIds);
        setCategoryFilterInitialized(true);
      }
    }
  }, [categories, selectedCategory, categoryFilterInitialized]);

  // Tags disponíveis (usar filteredTasks)
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    filteredTasks.forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [filteredTasks]);

  // Tags disponíveis no Kanban Diário
  const dailyAvailableTags = useMemo(() => {
    if (!dailyCategory) return [];
    const tags = new Set<string>();
    allTasks.filter(task => task.category_id === dailyCategory).forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [allTasks, dailyCategory]);
  const handleExport = () => {
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
  };
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        
        // Validar arquivo e preparar preview
        const validation = validateImportFile(text, categories, allTasks);
        setImportValidation(validation);
        setImportFileName(file.name);
        setImportFileData(text);
        
        if (validation.isValid && validation.data) {
          const merge = prepareMergeData(validation.data, categories, allTasks);
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
  };

  // Função para confirmar importação após preview
  const handleConfirmImport = async (options: ImportOptions) => {
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
      setImportFileData("");
      
      // Forçar refresh do board
      window.dispatchEvent(new CustomEvent('task-updated'));
      setDailyBoardKey(k => k + 1);
      setProjectsBoardKey(k => k + 1);
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
  };
  const handleClearFilters = () => {
    setSearchTerm("");
    setPriorityFilter("all");
    setTagFilter("all");
    setCategoryFilter([]);
    setDisplayMode("by_category");
  };
  // handleResetRecurrentTasks usa função utilitária importada - só processa tarefas riscadas
  const handleResetRecurrentTasks = async () => {
    const recurrentColumn = columns.find(col => col.name.toLowerCase() === "recorrente");
    if (!recurrentColumn) {
      toast({
        title: "Coluna não encontrada",
        description: "Coluna 'Recorrente' não existe",
        variant: "destructive"
      });
      return;
    }

    // Query direta ao Supabase para buscar TODAS as tarefas na coluna Recorrente
    const {
      data: recurrentTasks,
      error: fetchError
    } = await supabase.from("tasks").select("id, title, is_completed, recurrence_rule, tags, due_date").eq("column_id", recurrentColumn.id).not("recurrence_rule", "is", null);
    if (fetchError) {
      console.error("[DEBUG RESET] Erro ao buscar tarefas:", fetchError);
      toast({
        title: "Erro ao buscar tarefas",
        description: fetchError.message,
        variant: "destructive"
      });
      return;
    }

    // Filtrar: só tarefas riscadas (is_completed = true) e sem tag de espelho
    const tasksToReset = recurrentTasks?.filter(task => !task.tags?.includes("espelho-diário") && task.is_completed === true) || [];
    if (import.meta.env.DEV) console.log("[DEBUG RESET] Tarefas recorrentes RISCADAS encontradas:", tasksToReset.length);
    if (tasksToReset.length === 0) {
      toast({
        title: "Nenhuma tarefa",
        description: "Não há tarefas recorrentes riscadas para resetar"
      });
      return;
    }

    // Limpar checkboxes do localStorage
    tasksToReset.forEach(task => {
      localStorage.removeItem(`task-completed-${task.id}`);
    });

    // OTIMIZAÇÃO: Preparar batch updates por data de próxima recorrência
    const updatesByNextDate: Record<string, string[]> = {};
    tasksToReset.forEach(task => {
      const nextDueDate = calculateNextRecurrenceDate(task.due_date, task.recurrence_rule as any);
      const dateKey = nextDueDate || 'null';
      if (!updatesByNextDate[dateKey]) {
        updatesByNextDate[dateKey] = [];
      }
      updatesByNextDate[dateKey].push(task.id);
    });

    // Batch update para cada grupo de data
    let successCount = 0;
    for (const [dateKey, taskIds] of Object.entries(updatesByNextDate)) {
      const nextDueDate = dateKey === 'null' ? null : dateKey;
      const { error } = await supabase
        .from("tasks")
        .update({
          is_completed: false,
          due_date: nextDueDate
        })
        .in("id", taskIds);
      
      if (error) {
        if (import.meta.env.DEV) console.error("[RESET] Erro batch update:", error);
      } else {
        successCount += taskIds.length;
      }
    }

    // Sincronização bidirecional - batch para mirrors
    const allTaskIds = tasksToReset.map(t => t.id);
    const { data: tasksWithMirrors } = await supabase
      .from("tasks")
      .select("id, mirror_task_id")
      .in("id", allTaskIds)
      .not("mirror_task_id", "is", null);
    
    if (tasksWithMirrors && tasksWithMirrors.length > 0) {
      const mirrorIds = tasksWithMirrors.map(t => t.mirror_task_id).filter(Boolean) as string[];
      await supabase
        .from("tasks")
        .update({ is_completed: false })
        .in("id", mirrorIds);
    }

    // Buscar reverse mirrors em batch
    const { data: reverseMirrors } = await supabase
      .from("tasks")
      .select("id")
      .in("mirror_task_id", allTaskIds);
    
    if (reverseMirrors && reverseMirrors.length > 0) {
      await supabase
        .from("tasks")
        .update({ is_completed: false })
        .in("id", reverseMirrors.map(t => t.id));
    }

    // Disparar evento para forçar refetch
    window.dispatchEvent(new CustomEvent('task-updated'));
    addActivity("recurrent_reset", "Tarefas recorrentes resetadas");
    toast({
      title: "Tarefas resetadas",
      description: `${successCount} tarefa(s) recorrente(s) resetada(s) com próxima data calculada`
    });
    setDailyBoardKey(k => k + 1);
  };
  const handleResetDaily = async () => {
    if (!columns.length) return;

    // Identificar coluna "Recorrente" (se existir)
    const recurrentColumn = columns.find(col => col.name.toLowerCase() === "recorrente");

    // Identificar coluna "A Fazer" (destino padrão)
    const targetColumn = columns.find(col => col.name === "A Fazer") || columns[0]; // Fallback para primeira coluna

    const excludeIds = recurrentColumn ? [recurrentColumn.id] : [];
    await resetDailyTasks(targetColumn.id, excludeIds);
    addActivity("daily_reset", "Kanban Diário resetado");
    toast({
      title: "Kanban resetado",
      description: "Todas as tarefas (exceto recorrentes) foram movidas"
    });
    setDailyBoardKey(k => k + 1);
  };
  const handleTaskSelect = (task: Task) => {
    setSelectedTaskForHistory(task.id);
    setShowHistory(true);
  };
  const handleReorderDailyTasks = useCallback(async (reorderedTasks: Array<{
    id: string;
    position: number;
  }>) => {
    if (!updateDailyTask) return;
    try {
      // OTIMIZAÇÃO: Batch update de posições
      for (const { id, position } of reorderedTasks) {
        await supabase
          .from("tasks")
          .update({ position, updated_at: new Date().toISOString() })
          .eq("id", id);
      }

      // Força refresh do board
      window.dispatchEvent(new CustomEvent('task-updated'));
      setDailyBoardKey(k => k + 1);
      addActivity("ai_organize", "Tarefas organizadas com IA");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error reordering tasks:", error);
      toast({
        title: "Erro ao reordenar tarefas",
        variant: "destructive"
      });
    }
  }, [updateDailyTask, addActivity, toast]);

  // Função para equalizar largura das colunas
  const handleEqualizeColumns = () => {
    const equalSize = 100 / visibleColumns.length;
    const equalSizes = visibleColumns.map(() => equalSize);
    if (viewMode === "daily") {
      // Modo Diário: apenas uma categoria
      localStorage.setItem(`kanban-column-sizes-${dailyCategory}`, JSON.stringify(equalSizes));
      setDailyBoardKey(k => k + 1);
    } else {
      // Modo Projetos: atualizar TODAS as categorias visíveis + "all"
      // Atualizar key "all" para modo all_tasks
      localStorage.setItem(`kanban-column-sizes-all`, JSON.stringify(equalSizes));

      // Atualizar cada categoria individual para modo by_category
      const nonDailyCategories = categories.filter(c => c.name !== "Diário");
      nonDailyCategories.forEach(cat => {
        localStorage.setItem(`kanban-column-sizes-${cat.id}`, JSON.stringify(equalSizes));
      });

      // Disparar evento storage para forçar re-leitura
      window.dispatchEvent(new Event('storage'));
      setProjectsBoardKey(k => k + 1);
    }
  };

  // Calcular colunas visíveis considerando modo simplificado
  const visibleColumns = useMemo(() => {
    const kanbanType = viewMode === "daily" ? 'daily' : 'projects';
    const baseColumns = getVisibleColumns(kanbanType);
    if (simplifiedMode && viewMode === "all") {
      // Modo simplificado: mostrar apenas as primeiras 3 colunas por position
      const simplifiedCols = baseColumns.sort((a, b) => a.position - b.position).slice(0, 3);

      // Se não houver pelo menos 3 colunas, mostrar todas disponíveis
      if (simplifiedCols.length < 3) {
        return baseColumns;
      }
      return simplifiedCols;
    }
    return baseColumns;
  }, [getVisibleColumns, simplifiedMode, viewMode]);

  // Item 2: Calcular contadores de tarefas por tipo de coluna
  const taskCounters = useMemo(() => {
    if (viewMode !== "all") return null;
    const counters: {
      total: number;
      recorrente?: number;
      afazer?: number;
      emprogresso?: number;
      futuro?: number;
    } = {
      total: 0
    };
    filteredTasks.forEach(task => {
      counters.total++;
      const column = visibleColumns.find(col => col.id === task.column_id);
      if (column) {
        const columnName = column.name.toLowerCase();

        // Identificar tipo de coluna
        if (columnName.includes("recorrente")) {
          counters.recorrente = (counters.recorrente || 0) + 1;
        } else if (columnName.includes("fazer") || columnName.includes("pendente") || columnName.includes("backlog")) {
          counters.afazer = (counters.afazer || 0) + 1;
        } else if (columnName.includes("progresso") || columnName.includes("andamento") || columnName.includes("doing")) {
          counters.emprogresso = (counters.emprogresso || 0) + 1;
        } else if (columnName.includes("futuro") || columnName.includes("próximo") || columnName.includes("planejado")) {
          counters.futuro = (counters.futuro || 0) + 1;
        }
      }
    });
    return counters;
  }, [filteredTasks, visibleColumns, viewMode]);
  // OTIMIZAÇÃO FASE 3: Skeleton loading em vez de texto
  if (loadingCategories || loadingColumns) {
    return <KanbanLoadingSkeleton />;
  }
  return (
    <div className="min-h-screen bg-background pb-[140px] md:pb-0 flex">
      <Sidebar 
        onExport={handleExport} 
        onImport={handleImport} 
        onThemeToggle={toggleTheme} 
        onViewChange={setViewMode} 
        viewMode={viewMode} 
      />

      <main className="flex-1 overflow-auto">
        {/* Kanban Diário - modo daily */}
        {viewMode === "daily" && dailyCategory && visibleColumns.length > 0 && (
          <DailyKanbanView
            columns={visibleColumns}
            allColumns={columns}
            categories={categories}
            dailyCategory={dailyCategory}
            availableTags={dailyAvailableTags}
            boardKey={dailyBoardKey}
            densityMode={densityMode}
            hideBadges={hideBadgesMobile}
            gridColumns={dailyGridColumnsMobile}
            showFavoritesPanel={showFavoritesPanel}
            sortOption={dailySortOption}
            sortOrder={dailySortOrder}
            searchTerm={dailySearchTerm}
            priorityFilter={dailyPriorityFilter}
            tagFilter={dailyTagFilter}
            dueDateFilter={dailyDueDateFilter}
            onSearchChange={setDailySearchTerm}
            onPriorityChange={setDailyPriorityFilter}
            onTagChange={setDailyTagFilter}
            onDueDateChange={setDailyDueDateFilter}
            onClearFilters={() => {
              setDailyPriorityFilter("all");
              setDailyTagFilter("all");
              setDailySearchTerm("");
              setDailyDueDateFilter("all");
            }}
            onResetRecurrentTasks={handleResetRecurrentTasks}
            onEqualizeColumns={handleEqualizeColumns}
            hiddenColumns={hiddenColumns}
            onToggleColumnVisibility={toggleColumnVisibility}
            onDeleteColumn={deleteColumn}
            onResetToDefault={resetToDefaultView}
            onRenameColumn={renameColumn}
            onAddColumn={addColumn}
            onReorderColumns={reorderColumns}
            onToggleKanbanVisibility={toggleColumnKanbanVisibility}
            showTemplates={showTemplates}
            onShowTemplatesChange={setShowTemplates}
            showColumnManager={showColumnManager}
            onShowColumnManagerChange={setShowColumnManager}
          />
        )}
        
        {/* Todos os Projetos - modo all */}
        {viewMode === "all" && visibleColumns.length > 0 && (
          <ProjectsKanbanView
            columns={visibleColumns}
            allColumns={columns}
            categories={categories}
            tasks={tasks}
            filteredTasks={filteredTasks}
            notes={notes}
            notebooks={notebooks}
            availableTags={availableTags}
            taskCounters={taskCounters}
            boardKey={projectsBoardKey}
            isMobile={isMobile}
            simplifiedMode={simplifiedMode}
            densityMode={densityMode}
            hideBadges={hideBadgesMobile}
            gridColumns={projectsGridColumnsMobile}
            displayMode={displayMode}
            sortOption={projectsSortOption}
            searchTerm={searchTerm}
            priorityFilter={priorityFilter}
            tagFilter={tagFilter}
            dueDateFilter={projectsDueDateFilter}
            categoryFilter={categoryFilter}
            categoryFilterInitialized={categoryFilterInitialized}
            onSearchChange={setSearchTerm}
            onPriorityChange={setPriorityFilter}
            onTagChange={setTagFilter}
            onDueDateChange={setProjectsDueDateFilter}
            onCategoryChange={setCategoryFilter}
            onDisplayModeChange={(value) => setDisplayMode(value as "by_category" | "all_tasks")}
            onClearFilters={() => {
              handleClearFilters();
              setProjectsDueDateFilter("all");
            }}
            onTaskSelect={handleTaskSelect}
            onEqualizeColumns={handleEqualizeColumns}
            hiddenColumns={hiddenColumns}
            onToggleColumnVisibility={toggleColumnVisibility}
            onDeleteColumn={deleteColumn}
            onResetToDefault={resetToDefaultView}
            onRenameColumn={renameColumn}
            onAddColumn={addColumn}
            onReorderColumns={reorderColumns}
            onToggleKanbanVisibility={toggleColumnKanbanVisibility}
            showStats={showStats}
            onShowStatsChange={setShowStats}
            showColumnManager={showColumnManager}
            onShowColumnManagerChange={setShowColumnManager}
          />
        )}
      </main>

      {/* Dialog de Histórico */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📋 Histórico de Atividades</DialogTitle>
          </DialogHeader>
          <ActivityHistory taskId={selectedTaskForHistory} />
        </DialogContent>
      </Dialog>

      {/* Modal de Preview de Importação */}
      <ImportPreviewModal
        open={showImportPreview}
        onOpenChange={setShowImportPreview}
        validationResult={importValidation}
        mergeResult={importMerge}
        fileName={importFileName}
        onConfirmImport={handleConfirmImport}
        isImporting={isImporting}
      />

      {/* Modal de Nova Tarefa via Ctrl+N */}
      <TaskModal
        open={showQuickTaskModal}
        onOpenChange={setShowQuickTaskModal}
        onSave={async (taskData) => {
          if (!taskData.column_id || !taskData.category_id) {
            toast({
              title: "Erro",
              description: "Selecione uma categoria e coluna",
              variant: "destructive"
            });
            return;
          }
          await addTask(taskData);
          toast({
            title: "Tarefa criada",
            description: "Sua tarefa foi adicionada com sucesso"
          });
        }}
        columnId={columns[0]?.id || ""}
        categoryId={viewMode === "daily" ? dailyCategory : (categories.find(c => c.name !== "Diário")?.id || "")}
        isDailyKanban={viewMode === "daily"}
        columns={columns}
      />

      {/* Daily Review Modal */}
      <DailyReviewModal
        open={showDailyReview}
        onOpenChange={setShowDailyReview}
        tasks={allTasks}
      />
    </div>
  );
}
export default Index;