import { useState, useEffect, useMemo, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { SearchFilters } from "@/components/SearchFilters";
import { DashboardStats } from "@/components/DashboardStats";
import { GlobalSearch } from "@/components/GlobalSearch";
import { FavoritesSection } from "@/components/FavoritesSection";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { ColumnManager } from "@/components/kanban/ColumnManager";
import { useCategories } from "@/hooks/useCategories";
import { useColumns } from "@/hooks/useColumns";
import { useTasks, Task } from "@/hooks/useTasks";
import { useDueDateAlerts } from "@/hooks/useDueDateAlerts";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { RotateCcw, BarChart3, FileText, Columns3, Star, Check, Square, Equal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActivityHistory } from "@/components/ActivityHistory";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { KanbanLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";
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
  const [viewMode, setViewMode] = useState<"daily" | "all">("daily");
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"by_category" | "all_tasks">("by_category");

  // CORREÇÃO: Usar useSettings em vez de useLocalStorage para configurações
  const { settings, updateSettings, saveSettings } = useSettings();
  
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
  const [sortOption, setSortOption] = useLocalStorage<string>("filter-sort", "manual");

  // Filtros do Kanban Diário (separados dos filtros de Projetos)
  const [dailyPriorityFilter, setDailyPriorityFilter] = useLocalStorage<string>("daily-priority-filter", "all");
  const [dailyTagFilter, setDailyTagFilter] = useLocalStorage<string>("daily-tag-filter", "all");
  const [dailySearchTerm, setDailySearchTerm] = useLocalStorage<string>("daily-search", "");

  // Estado para filtro de categoria no mobile (Kanban Projetos)
  const [selectedCategoryFilterMobile, setSelectedCategoryFilterMobile] = useState<string>("all");

  // Funções para atualizar settings localmente (com sync para DB)
  const setSimplifiedMode = async (value: boolean) => {
    updateSettings({ kanban: { ...settings.kanban, simplifiedMode: value } });
    await saveSettings();
  };
  const setDailySortOption = async (value: "time" | "name" | "priority") => {
    updateSettings({ kanban: { ...settings.kanban, dailySortOption: value } });
    await saveSettings();
  };
  const setDailySortOrder = async (value: "asc" | "desc") => {
    updateSettings({ kanban: { ...settings.kanban, dailySortOrder: value } });
    await saveSettings();
  };
  const setDensityMode = async (value: "comfortable" | "compact" | "ultra-compact") => {
    updateSettings({ defaultDensity: value });
    await saveSettings();
  };
  const setShowFavoritesPanel = async (value: boolean) => {
    updateSettings({ kanban: { ...settings.kanban, showFavoritesPanel: value } });
    await saveSettings();
  };
  const setHideBadgesMobile = async (value: boolean) => {
    updateSettings({ mobile: { ...settings.mobile, hideBadges: value } });
    await saveSettings();
  };
  const setDailyGridColumnsMobile = async (value: 1 | 2) => {
    updateSettings({ mobile: { ...settings.mobile, dailyGridColumns: value } });
    await saveSettings();
  };
  const setProjectsGridColumnsMobile = async (value: 1 | 2) => {
    updateSettings({ mobile: { ...settings.mobile, projectsGridColumns: value } });
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
      // TODO: Implementar abertura de modal de nova tarefa
      toast({
        title: "Atalho Ctrl+N",
        description: "Modal de nova tarefa será implementado"
      });
    }
  });

  // Ler view da URL na inicialização
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "all" || view === "daily") {
      setViewMode(view);
    }
  }, []);
  
  // OTIMIZAÇÃO: Consolidar em uma única instância de useTasks
  // Busca todas as tarefas uma vez e usa filtros locais para diferentes views
  const {
    tasks: allTasks,
    resetAllTasksToFirstColumn: resetDailyTasks,
    updateTask: updateDailyTask
  } = useTasks("all");

  // Hook de notificações de prazo - monitora TODAS as tarefas
  useDueDateAlerts(allTasks);

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

      // Filtro de categoria (apenas no modo "all")
      if (viewMode === "all" && categoryFilter.length > 0 && !categoryFilter.includes(task.category_id)) {
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

      // Inicializar filtro de categorias com todas (exceto Diário)
      if (categoryFilter.length === 0) {
        const allCategoryIds = categories.filter(c => c.name !== "Diário").map(c => c.id);
        setCategoryFilter(allCategoryIds);
      }
    }
  }, [categories, selectedCategory, categoryFilter.length]);

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
    allTasks
      .filter(task => task.category_id === dailyCategory)
      .forEach(task => {
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
        const data = JSON.parse(text);

        // Import categories (skip "Diário" to avoid duplicates)
        if (data.categories && Array.isArray(data.categories)) {
          for (const cat of data.categories) {
            if (cat.name !== "Diário") {
              await addCategory(cat.name);
            }
          }
        }
        addActivity("import", `Arquivo ${file.name} importado`);
        toast({
          title: "Importação bem-sucedida",
          description: "Dados importados com sucesso"
        });
      } catch (error) {
        // Only log errors in development
        if (import.meta.env.DEV) {
          console.error("Import error:", error);
        }
        toast({
          title: "Erro na importação",
          description: "Arquivo inválido",
          variant: "destructive"
        });
      }
    };
    input.click();
  };
  const handleClearFilters = () => {
    setSearchTerm("");
    setPriorityFilter("all");
    setTagFilter("all");
    setCategoryFilter([]);
    setSortOption("manual");
    setDisplayMode("by_category");
  };
  const handleResetRecurrentTasks = async () => {
    const recurrentColumn = columns.find(
      (col) => col.name.toLowerCase() === "recorrente"
    );

    if (!recurrentColumn) {
      toast({
        title: "Coluna não encontrada",
        description: "Coluna 'Recorrente' não existe",
        variant: "destructive"
      });
      return;
    }

    // CORREÇÃO: Query direta ao Supabase para buscar TODAS as tarefas
    // na coluna Recorrente, independente da categoria (allTasks exclui Diário)
    const { data: recurrentTasks, error: fetchError } = await supabase
      .from("tasks")
      .select("id, title, is_completed, recurrence_rule, tags")
      .eq("column_id", recurrentColumn.id)
      .not("recurrence_rule", "is", null);

    if (fetchError) {
      console.error("[DEBUG RESET] Erro ao buscar tarefas:", fetchError);
      toast({
        title: "Erro ao buscar tarefas",
        description: fetchError.message,
        variant: "destructive"
      });
      return;
    }

    // Filtrar espelhos
    const tasksToReset = recurrentTasks?.filter(
      task => !task.tags?.includes("espelho-diário")
    ) || [];

    console.log("[DEBUG RESET] Tarefas recorrentes encontradas:", tasksToReset.length);
    
    if (tasksToReset.length === 0) {
      toast({
        title: "Nenhuma tarefa",
        description: "Não há tarefas recorrentes para resetar"
      });
      return;
    }

    // Limpar checkboxes do localStorage
    tasksToReset.forEach(task => {
      localStorage.removeItem(`task-completed-${task.id}`);
    });

    // Update direto no Supabase
    const taskIds = tasksToReset.map(t => t.id);
    
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: false })
      .in("id", taskIds);

    if (error) {
      console.error("[DEBUG RESET] Erro ao atualizar:", error);
      toast({
        title: "❌ Erro ao desmarcar tarefas",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    // Disparar evento para forçar refetch
    window.dispatchEvent(new CustomEvent('task-updated'));

    addActivity("recurrent_reset", "Tarefas recorrentes resetadas");
    toast({
      title: "Tarefas resetadas",
      description: `${tasksToReset.length} tarefa(s) recorrente(s) resetada(s)`
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
  const handleReorderDailyTasks = async (reorderedTasks: Array<{
    id: string;
    position: number;
  }>) => {
    if (!updateDailyTask) return;
    try {
      // Update all tasks with new positions
      await Promise.all(reorderedTasks.map(({
        id,
        position
      }) => updateDailyTask(id, {
        position
      })));

      // Força refresh do board
      setDailyBoardKey(k => k + 1);
      addActivity("ai_organize", "Tarefas organizadas com IA");
    } catch (error) {
      console.error("Error reordering tasks:", error);
      toast({
        title: "Erro ao reordenar tarefas",
        variant: "destructive"
      });
    }
  };

  // Função para equalizar largura das colunas
  const handleEqualizeColumns = () => {
    const categoryKey = viewMode === "daily" ? dailyCategory : "all";
    const equalSize = 100 / visibleColumns.length;
    localStorage.setItem(
      `kanban-column-sizes-${categoryKey}`,
      JSON.stringify(visibleColumns.map(() => equalSize))
    );
    // Forçar re-render do KanbanBoard correto
    if (viewMode === "daily") {
      setDailyBoardKey(k => k + 1);
    } else {
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
  return <div className="min-h-screen bg-background pb-[140px] md:pb-0">
      <Sidebar onExport={handleExport} onImport={handleImport} onThemeToggle={toggleTheme} onViewChange={setViewMode} viewMode={viewMode} />

      <main className="md:ml-64 h-screen">
        {/* Kanban Diário - modo daily sem divisor */}
        {viewMode === "daily" && dailyCategory && visibleColumns.length > 0 && <div className="h-full flex flex-col overflow-hidden">
            {/* Cabeçalho Kanban Diário */}
            <div className="sticky top-0 z-10 bg-background border-b">
              <div className="px-6 py-3 border-b flex-wrap gap-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-center">📅 Kanban Diário</h2>
                <div className="gap-2 flex-wrap items-center justify-center flex flex-row">
                  <Button variant="outline" size="sm" onClick={() => setShowColumnManager(true)} className="flex items-center gap-2">
                    <Columns3 className="h-4 w-4" />
                    Colunas
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleEqualizeColumns} title="Equalizar largura das colunas" className="h-9 w-9">
                    <Equal className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Templates
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleResetRecurrentTasks} className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Resetar Recorrentes
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleResetDaily} className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Resetar Tudo
                  </Button>
                </div>
              </div>

              {isMobile && <div className="px-3 py-2 border-b flex items-center gap-2">
                  <Select value={dailyGridColumnsMobile.toString()} onValueChange={v => setDailyGridColumnsMobile(Number(v) as 1 | 2)}>
                    <SelectTrigger className="flex-1 h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Coluna</SelectItem>
                      <SelectItem value="2">2 Colunas</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant={hideBadgesMobile ? "secondary" : "outline"} size="sm" onClick={() => setHideBadgesMobile(!hideBadgesMobile)} className="flex-1 h-10 text-sm gap-1">
                    {hideBadgesMobile ? <Check className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    <span className="text-xs truncate">{hideBadgesMobile ? "Mostrar" : "Ocultar"}</span>
                  </Button>
                </div>}
              
              {/* Filtros do Kanban Diário (ordenação/densidade definidos em Setup) */}
              <div className="px-6 py-2 border-b bg-card flex flex-wrap items-center gap-2">
                {/* Filtros contextuais: Prioridade e Tag */}
                <Select value={dailyPriorityFilter} onValueChange={setDailyPriorityFilter}>
                  <SelectTrigger className="w-[110px] h-9">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="high">🔴 Alta</SelectItem>
                    <SelectItem value="medium">🟡 Média</SelectItem>
                    <SelectItem value="low">🟢 Baixa</SelectItem>
                  </SelectContent>
                </Select>

                {dailyAvailableTags.length > 0 && (
                  <Select value={dailyTagFilter} onValueChange={setDailyTagFilter}>
                    <SelectTrigger className="w-[110px] h-9">
                      <SelectValue placeholder="Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {dailyAvailableTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {(dailyPriorityFilter !== "all" || dailyTagFilter !== "all") && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setDailyPriorityFilter("all");
                      setDailyTagFilter("all");
                    }}
                    className="h-9"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* Layout Kanban + Favoritos */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Kanban Board - ocupa tudo quando Favoritos oculto */}
              <div className={cn("overflow-y-auto", showFavoritesPanel ? "flex-1" : "w-full")}>
                <KanbanBoard 
                  key={dailyBoardKey} 
                  columns={visibleColumns} 
                  categoryId={dailyCategory} 
                  compact 
                  isDailyKanban 
                  sortOption={dailySortOrder === "asc" ? `${dailySortOption === "time" ? "date" : dailySortOption}_asc` : `${dailySortOption === "time" ? "date" : dailySortOption}_desc`} 
                  densityMode={densityMode} 
                  hideBadges={hideBadgesMobile} 
                  gridColumns={dailyGridColumnsMobile}
                  priorityFilter={dailyPriorityFilter}
                  tagFilter={dailyTagFilter}
                />
              </div>

              {/* Favoritos - só renderiza se showFavoritesPanel = true */}
              {showFavoritesPanel && <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l overflow-y-auto">
                  <FavoritesSection columns={columns} categories={categories} />
                </div>}
            </div>
          </div>}
        
        {/* Todos os Projetos - modo all */}
        {viewMode === "all" && visibleColumns.length > 0 && <>
            <div className="border-b bg-background">
              {/* DESKTOP: Layout original em 1 linha */}
              {!isMobile && <div className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">📊 Todos os Projetos</h2>
                    {simplifiedMode && <Badge variant="secondary" className="text-xs">Modo Simplificado</Badge>}
                    {/* Item 2: Badges com contadores */}
                    {taskCounters && <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          Total: {taskCounters.total}
                        </Badge>
                        {taskCounters.recorrente && <Badge variant="secondary" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                            🔄 Recorrente: {taskCounters.recorrente}
                          </Badge>}
                        {taskCounters.afazer && <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            📋 A Fazer: {taskCounters.afazer}
                          </Badge>}
                        {taskCounters.emprogresso && <Badge variant="secondary" className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                            🚀 Em Progresso: {taskCounters.emprogresso}
                          </Badge>}
                        {taskCounters.futuro && <Badge variant="secondary" className="text-xs bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                            📅 Futuro: {taskCounters.futuro}
                          </Badge>}
                      </div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <GlobalSearch tasks={filteredTasks} onSelectTask={handleTaskSelect} categories={categories} />
                    <Button variant="outline" size="sm" onClick={() => setShowColumnManager(true)}>
                      <Columns3 className="h-4 w-4 mr-2" />
                      Colunas
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleEqualizeColumns} title="Equalizar largura das colunas" className="h-9 w-9">
                      <Equal className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowStats(true)}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Estatísticas
                    </Button>
                  </div>
                </div>}

              {/* MOBILE: Layout em 3 linhas */}
              {isMobile && <>
                  {/* LINHA 1: Logo + Buscar */}
                  <div className="px-3 py-2 border-b flex items-center gap-2">
                    <h2 className="text-base font-semibold flex-shrink-0">📊 Todos</h2>
                    <div className="flex-1 min-w-0">
                      <GlobalSearch tasks={filteredTasks} onSelectTask={handleTaskSelect} categories={categories} />
                    </div>
                  </div>

                  {/* LINHA 2: Botão Colunas + Botão Estatísticas */}
                  <div className="px-3 py-2 border-b flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowColumnManager(true)} className="flex-1 h-10">
                      <Columns3 className="h-4 w-4 mr-2" />
                      Colunas
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowStats(true)} className="flex-1 h-10">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Estatísticas
                    </Button>
                  </div>

                  {/* LINHA 3: Filtro colunas + Toggle badges */}
                  <div className="px-3 py-2 border-b flex items-center gap-2">
                    <Select value={projectsGridColumnsMobile.toString()} onValueChange={v => setProjectsGridColumnsMobile(Number(v) as 1 | 2)}>
                      <SelectTrigger className="flex-1 h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Coluna</SelectItem>
                        <SelectItem value="2">2 Colunas</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant={hideBadgesMobile ? "secondary" : "outline"} size="sm" onClick={() => setHideBadgesMobile(!hideBadgesMobile)} className="flex-1 h-10 text-sm gap-1">
                      {hideBadgesMobile ? <Check className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      <span className="text-xs truncate">{hideBadgesMobile ? "Mostrar" : "Ocultar"}</span>
                    </Button>
                  </div>
                </>}
            </div>
            
            <SearchFilters searchTerm={searchTerm} onSearchChange={setSearchTerm} priorityFilter={priorityFilter} onPriorityChange={setPriorityFilter} tagFilter={tagFilter} onTagChange={setTagFilter} categoryFilter={categoryFilter} onCategoryChange={setCategoryFilter} availableTags={availableTags} categories={categories.filter(c => c.name !== "Diário")} tasks={tasks} onClearFilters={handleClearFilters} sortOption={sortOption} onSortChange={setSortOption} viewMode={viewMode} displayMode={displayMode} onDisplayModeChange={(value: string) => setDisplayMode(value as "by_category" | "all_tasks")} searchInputRef={searchInputRef} densityMode={densityMode} onDensityChange={setDensityMode} simplifiedMode={simplifiedMode} onSimplifiedModeChange={setSimplifiedMode} />

            {/* Renderizar baseado no displayMode */}
            {displayMode === "all_tasks" ? <div className="mb-8" key={`all-tasks-${projectsBoardKey}`}>
                <div className="px-6 py-3 bg-muted/50">
                  <h3 className="text-lg font-semibold">📋 Todas as Tarefas</h3>
                </div>
                <KanbanBoard key={`all-board-${projectsBoardKey}`} columns={visibleColumns} categoryId="all" searchTerm={searchTerm} priorityFilter={priorityFilter} tagFilter={tagFilter} sortOption={sortOption} viewMode={viewMode} showCategoryBadge densityMode={densityMode} hideBadges={hideBadgesMobile} gridColumns={projectsGridColumnsMobile} />
              </div> : (/* Renderizar Kanbans por categoria */
        categories.filter(cat => cat.name !== "Diário").filter(cat => categoryFilter.length === 0 || categoryFilter.includes(cat.id)).map(category => <div key={`${category.id}-${projectsBoardKey}`} className="mb-8">
                    <div className="px-6 py-3 bg-muted/50">
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                    </div>
                    <KanbanBoard key={`board-${category.id}-${projectsBoardKey}`} columns={visibleColumns} categoryId={category.id} searchTerm={searchTerm} priorityFilter={priorityFilter} tagFilter={tagFilter} sortOption={sortOption} viewMode={viewMode} densityMode={densityMode} hideBadges={hideBadgesMobile} gridColumns={projectsGridColumnsMobile} />
                  </div>))}
          </>}
      </main>

      {/* Dialog de Estatísticas */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>📊 Estatísticas do Projeto</DialogTitle>
          </DialogHeader>
          <DashboardStats tasks={filteredTasks} />
        </DialogContent>
      </Dialog>

      {/* Dialog de Templates */}
      <TemplateSelector open={showTemplates} onOpenChange={setShowTemplates} />

      {/* Dialog de Gerenciamento de Colunas */}
      <ColumnManager open={showColumnManager} onOpenChange={setShowColumnManager} columns={columns} hiddenColumns={hiddenColumns} onToggleVisibility={toggleColumnVisibility} onDeleteColumn={deleteColumn} onResetToDefault={resetToDefaultView} onRenameColumn={renameColumn} onAddColumn={addColumn} onReorderColumns={reorderColumns} onToggleKanbanVisibility={toggleColumnKanbanVisibility} />

      {/* Dialog de Histórico */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📋 Histórico de Atividades</DialogTitle>
          </DialogHeader>
          <ActivityHistory taskId={selectedTaskForHistory} />
        </DialogContent>
      </Dialog>
    </div>;
}
export default Index;