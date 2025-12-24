import { useState, useEffect, useMemo, useDeferredValue, memo, useCallback } from "react";
import { Column, useColumns } from "@/hooks/useColumns";
import { startOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isBefore, isAfter, isEqual } from "date-fns";
import { Task, useTasks } from "@/hooks/useTasks";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw, CheckSquare } from "lucide-react";
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, closestCorners, pointerWithin, rectIntersection } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DroppableColumn } from "./kanban/DroppableColumn";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ColumnColorPicker, getColumnTopBarClass, getColumnBackgroundClass } from "./kanban/ColumnColorPicker";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { MobileKanbanView } from "./kanban/MobileKanbanView";
import { useSettings } from "@/hooks/useSettings";
import { calculateNextRecurrenceDate } from "@/lib/recurrenceUtils";
import { supabase } from "@/integrations/supabase/client";
import { useTags } from "@/hooks/useTags";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStats } from "@/hooks/useUserStats";
import { useUndo } from "@/hooks/useUndoStack";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkActionsBar } from "./kanban/BulkActionsBar";
import { useToast } from "@/hooks/use-toast";

interface KanbanBoardProps {
  columns: Column[];
  categoryId: string;
  compact?: boolean;
  searchTerm?: string;
  priorityFilter?: string;
  tagFilter?: string;
  dueDateFilter?: string;
  isDailyKanban?: boolean;
  sortOption?: string;
  showCategoryBadge?: boolean;
  allowCrossCategoryDrag?: boolean;
  viewMode?: string;
  densityMode?: "comfortable" | "compact" | "ultra-compact";
  hideBadges?: boolean;
  gridColumns?: 1 | 2;
  // Filtro de categorias para modo "all"
  categoryFilter?: string[];
  categoryFilterInitialized?: boolean;
}

export function KanbanBoard({ 
  columns, 
  categoryId, 
  compact: compactProp = false,
  searchTerm = "",
  priorityFilter = "all",
  tagFilter = "all",
  dueDateFilter = "all",
  isDailyKanban = false,
  sortOption = "manual",
  showCategoryBadge = false,
  allowCrossCategoryDrag = false,
  viewMode = "daily",
  densityMode = "comfortable",
  hideBadges = false,
  gridColumns = 2,
  categoryFilter = [],
  categoryFilterInitialized = false
}: KanbanBoardProps) {
  const { tasks: rawTasks, addTask, updateTask, deleteTask, toggleFavorite, duplicateTask } = useTasks(categoryId);
  const { columns: allColumns, updateColumnColor } = useColumns();
  
  // FILTRO DE CATEGORIAS: Quando categoryId === "all", aplicar filtro local
  const tasks = useMemo(() => {
    if (categoryId !== "all") return rawTasks;
    
    // Se filtro não inicializado, mostrar todas
    if (!categoryFilterInitialized) return rawTasks;
    
    // Se nenhuma categoria selecionada, não mostrar nada
    if (categoryFilter.length === 0) return [];
    
    // Filtrar por categorias selecionadas
    return rawTasks.filter(task => categoryFilter.includes(task.category_id));
  }, [rawTasks, categoryId, categoryFilter, categoryFilterInitialized]);
  
  // Buscar completedColumnId do array COMPLETO de colunas (mesmo que oculta)
  const completedColumnId = allColumns.find(c => c.name.toLowerCase() === "concluído")?.id;
  const { settings } = useSettings();
  const { getTagColor } = useTags();
  const { addTaskCompletion } = useUserStats();
  const { pushAction } = useUndo();
  const { toast } = useToast();
  const { 
    isSelectionMode, 
    isSelected, 
    toggleSelection, 
    enterSelectionMode, 
    exitSelectionMode,
    selectedCount 
  } = useBulkSelection();
  const isMobile = useBreakpoint() === 'mobile';
  
  // Modo compacto automático em mobile ou quando forçado via prop
  const compact = isMobile || compactProp;
  
  // Salvar tamanhos das colunas no localStorage
  const [columnSizes, setColumnSizes] = useLocalStorage<number[]>(
    `kanban-column-sizes-${categoryId}`,
    columns.map(() => 100 / columns.length)
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null); // Track which column we're hovering over
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // BATCH FETCH: Mapa de categorias originais para tarefas espelhadas (performance)
  const [originalCategoriesMap, setOriginalCategoriesMap] = useState<Record<string, string>>({});
  
  // Buscar categorias originais de todas as tarefas espelhadas de uma vez
  // A referência está INVERTIDA - tarefas em Projetos apontam para as do Diário
  // Então precisamos buscar tarefas que apontam PARA as tarefas do diário (not FROM)
  useEffect(() => {
    if (!isDailyKanban) return;
    
    // Coletar IDs das tarefas recorrentes no diário (que podem ter espelhos em projetos)
    const dailyRecurrentIds = tasks
      .filter(t => t.recurrence_rule)
      .map(t => t.id);
    
    // Também coletar mirror_task_ids das tarefas que JÁ têm referência (caso contrário)
    const mirrorIds = tasks
      .filter(t => t.mirror_task_id)
      .map(t => t.mirror_task_id!);
    
    // Estratégia 1: Buscar tarefas que TÊM mirror_task_id (para tarefas que vieram da prop)
    const fetchFromMirrorIds = mirrorIds.length > 0 ? supabase
      .from("tasks")
      .select("id, categories:categories(name)")
      .in("id", mirrorIds) : Promise.resolve({ data: [] });
    
    // Estratégia 2: Buscar tarefas em PROJETOS que apontam para tarefas do diário
    // (quando a tarefa no diário não tem mirror_task_id mas a de projetos aponta para ela)
    const fetchFromProjectMirrors = dailyRecurrentIds.length > 0 ? supabase
      .from("tasks")
      .select("id, mirror_task_id, categories:categories(name)")
      .in("mirror_task_id", dailyRecurrentIds) : Promise.resolve({ data: [] });
    
    Promise.all([fetchFromMirrorIds, fetchFromProjectMirrors]).then(([result1, result2]) => {
      const map: Record<string, string> = {};
      
      // Mapear resultados da estratégia 1 (mirror_task_id -> categoria)
      if (result1.data) {
        result1.data.forEach((task: any) => {
          if (task.categories?.name) {
            map[task.id] = task.categories.name;
          }
        });
      }
      
      // Mapear resultados da estratégia 2 (tarefa diário -> categoria do projeto)
      // Aqui o mirror_task_id é o ID da tarefa no DIÁRIO, e queremos a categoria desta tarefa de PROJETOS
      if (result2.data) {
        result2.data.forEach((task: any) => {
          if (task.categories?.name && task.mirror_task_id) {
            // Chave: ID da tarefa no diário, Valor: categoria da tarefa em projetos
            map[task.mirror_task_id] = task.categories.name;
          }
        });
      }
      
      setOriginalCategoriesMap(map);
    });
  }, [isDailyKanban, tasks]);

  // OTIMIZAÇÃO: Sensores configurados para fluidez máxima (delay reduzido)
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 3, // Resposta mais rápida
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 50, // Praticamente instantâneo
      tolerance: 3,
    },
  });
  
  const sensors = useSensors(pointerSensor, touchSensor);
  
  // OTIMIZAÇÃO: useDeferredValue para overId evitar re-renders excessivos
  const deferredOverId = useDeferredValue(overId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      import("@/hooks/use-toast").then(({ toast }) => {
        toast({
          title: "Movimento cancelado",
          description: "Solte a tarefa sobre uma coluna válida",
          duration: 2000,
        });
      });
      return;
    }

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    
    if (!task) {
      setActiveId(null);
      return;
    }

    // Determinar coluna de destino - verificar se é droppable column ou sortable item
    let newColumnId: string;
    const overId = over.id as string;
    
    // Se o over.id começar com "column-", é uma zona droppable explícita
    if (overId.startsWith("column-")) {
      newColumnId = overId.replace("column-", "");
    } else {
      // Verificar se é um id de coluna diretamente
      const isColumn = columns.some(c => c.id === overId);
      if (isColumn) {
        newColumnId = overId;
      } else {
        // É uma tarefa, pegar coluna do sortable context
        const containerId = over.data?.current?.sortable?.containerId;
        if (containerId) {
          newColumnId = containerId as string;
        } else {
          // Fallback: encontrar a tarefa e usar sua coluna
          const overTask = tasks.find(t => t.id === overId);
          newColumnId = overTask?.column_id || task.column_id;
        }
      }
    }

    // Bloquear movimento de tarefas recorrentes para fora da coluna Recorrente
    const sourceColumn = columns.find(col => col.id === task.column_id);
    
    if (task.recurrence_rule && 
        sourceColumn?.name.toLowerCase() === "recorrente" &&
        task.column_id !== newColumnId) {
      import("@/hooks/use-toast").then(({ toast }) => {
        toast({
          title: "Tarefa recorrente bloqueada",
          description: "Desative a recorrência antes de mover esta tarefa",
          variant: "destructive",
        });
      });
      setActiveId(null);
      return;
    }

    // Only update if changed column
    if (task.column_id !== newColumnId) {
      // Calculate new position (append to end of destination column)
      const destinationTasks = tasks.filter((t) => t.column_id === newColumnId);
      const newPosition = destinationTasks.length;
      
      // Se permitir drag entre categorias, manter category_id da tarefa
      // Senão, usar o categoryId atual
      const updates: Partial<Task> = {
        column_id: newColumnId,
        position: newPosition
      };

      // Não alterar categoria se allowCrossCategoryDrag estiver ativo
      if (!allowCrossCategoryDrag && categoryId !== "all") {
        updates.category_id = categoryId;
      }

      // Auto-completar ao mover para coluna "Concluído"
      const destinationColumn = columns.find(col => col.id === newColumnId);
      if (destinationColumn?.name.toLowerCase() === "concluído") {
        updates.is_completed = true;
        // GAMIFICAÇÃO: Adicionar pontos ao mover para Concluído
        addTaskCompletion();
      }
      // Auto-desmarcar ao sair de "Concluído"
      else if (sourceColumn?.name.toLowerCase() === "concluído") {
        updates.is_completed = false;
      }
      
      updateTask(taskId, updates);
    }

    setActiveId(null);
  };

  const handleAddTask = (columnId: string) => {
    setSelectedTask(null);
    setSelectedColumn(columnId);
    setModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setSelectedColumn(task.column_id);
    setModalOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (selectedTask) {
      await updateTask(selectedTask.id, taskData);
    } else {
      // CORREÇÃO: Quando categoryId === "all", usar category_id do taskData (selecionado no modal)
      const finalCategoryId = categoryId === "all" ? taskData.category_id : categoryId;
      
      if (!finalCategoryId || finalCategoryId === "all") {
        // Se ainda não tem categoria válida, mostrar erro
        const { toast } = await import("@/hooks/use-toast");
        toast({
          title: "Categoria obrigatória",
          description: "Por favor, selecione uma categoria para a tarefa.",
          variant: "destructive",
        });
        return;
      }
      
      await addTask({ ...taskData, column_id: selectedColumn, category_id: finalCategoryId });
    }
  };

  const handleDeleteClick = (id: string) => {
    setTaskToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      // Buscar dados completos da tarefa para restauração
      const taskData = tasks.find(t => t.id === taskToDelete);
      if (taskData) {
        // Registrar ação de undo ANTES de deletar
        pushAction({
          type: "DELETE_TASK",
          description: `Tarefa "${taskData.title}" excluída`,
          payload: {
            taskId: taskToDelete,
            fullData: {
              id: taskData.id,
              title: taskData.title,
              description: taskData.description,
              category_id: taskData.category_id,
              column_id: taskData.column_id,
              position: taskData.position,
              priority: taskData.priority,
              due_date: taskData.due_date,
              is_completed: taskData.is_completed,
              is_favorite: taskData.is_favorite,
              tags: taskData.tags,
              subtasks: taskData.subtasks,
              recurrence_rule: taskData.recurrence_rule,
              mirror_task_id: taskData.mirror_task_id,
              user_id: taskData.user_id,
            },
          },
        });
      }
      deleteTask(taskToDelete);
      setTaskToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleMoveTask = (taskId: string, direction: "left" | "right") => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentColumnIndex = columns.findIndex(c => c.id === task.column_id);
    const targetIndex = direction === "left" ? currentColumnIndex - 1 : currentColumnIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < columns.length) {
      const targetColumn = columns[targetIndex];
      const sourceColumn = columns[currentColumnIndex];
      const destinationTasks = tasks.filter(t => t.column_id === targetColumn.id);
      
      // Registrar ação de undo ANTES de mover
      pushAction({
        type: "MOVE_TASK",
        description: `Tarefa movida para "${targetColumn.name}"`,
        payload: {
          taskId,
          previousColumnId: task.column_id,
          previousPosition: task.position,
        },
      });
      
      const updates: Partial<Task> = {
        column_id: targetColumn.id,
        position: destinationTasks.length
      };
      
      // Auto-completar ao mover para coluna "Concluído"
      if (targetColumn.name.toLowerCase() === "concluído") {
        updates.is_completed = true;
      }
      // Auto-desmarcar ao sair de "Concluído"
      else if (sourceColumn?.name.toLowerCase() === "concluído") {
        updates.is_completed = false;
      }
      
      updateTask(taskId, updates);
    }
  };

  // handleUncheckRecurrentTasks: usa função utilitária importada - só processa tarefas RISCADAS
  const handleUncheckRecurrentTasks = async (columnId: string) => {
    const columnTasks = getTasksForColumn(columnId);
    
    // NOVA REGRA: Só resetar tarefas que estão concluídas (riscadas)
    const completedTasks = columnTasks.filter(task => task.is_completed === true);
    
    if (completedTasks.length === 0) {
      import("@/hooks/use-toast").then(({ toast }) => {
        toast({
          title: "Nenhuma tarefa riscada",
          description: "Não há tarefas concluídas para resetar nesta coluna",
        });
      });
      return;
    }
    
    // Processar apenas tarefas riscadas
    for (const task of completedTasks) {
      localStorage.removeItem(`task-completed-${task.id}`);
      
      // Calcular próxima data baseada na regra de recorrência
      const nextDueDate = calculateNextRecurrenceDate(task.due_date, task.recurrence_rule);
      
      await updateTask(task.id, {
        due_date: nextDueDate,
        is_completed: false
      });
      
      // BUG 1 FIX: Sincronização bidirecional - atualizar tarefa espelhada (projetos)
      if (task.mirror_task_id) {
        await supabase.from("tasks").update({
          due_date: nextDueDate,
          is_completed: false
        }).eq("id", task.mirror_task_id);
      }
      
      // Buscar tarefas que apontam para ESTA tarefa como espelho (link reverso)
      const { data: reverseMirrors } = await supabase
        .from("tasks")
        .select("id")
        .eq("mirror_task_id", task.id);
        
      if (reverseMirrors && reverseMirrors.length > 0) {
        await supabase.from("tasks").update({
          due_date: nextDueDate,
          is_completed: false
        }).in("id", reverseMirrors.map(t => t.id));
      }
    }
    
    window.dispatchEvent(new CustomEvent('tasks-unchecked'));
    
    // Toast de sucesso
    import("@/hooks/use-toast").then(({ toast }) => {
      toast({
        title: "✅ Tarefas resetadas",
        description: `${completedTasks.length} tarefa(s) riscada(s) resetada(s) com próxima data calculada`,
      });
    });
  };

  // BULK ACTIONS: Funções para ações em massa
  const handleBulkDelete = async (taskIds: string[]) => {
    for (const taskId of taskIds) {
      const taskData = tasks.find(t => t.id === taskId);
      if (taskData) {
        pushAction({
          type: "DELETE_TASK",
          description: `${taskIds.length} tarefa(s) excluída(s)`,
          payload: {
            taskId,
            fullData: {
              id: taskData.id,
              title: taskData.title,
              description: taskData.description,
              category_id: taskData.category_id,
              column_id: taskData.column_id,
              position: taskData.position,
              priority: taskData.priority,
              due_date: taskData.due_date,
              is_completed: taskData.is_completed,
              is_favorite: taskData.is_favorite,
              tags: taskData.tags,
              subtasks: taskData.subtasks,
              recurrence_rule: taskData.recurrence_rule,
              mirror_task_id: taskData.mirror_task_id,
              user_id: taskData.user_id,
            },
          },
        });
      }
      await deleteTask(taskId);
    }
    toast({
      title: "Tarefas excluídas",
      description: `${taskIds.length} tarefa(s) excluída(s) com sucesso`,
    });
  };

  const handleBulkComplete = async (taskIds: string[], completed: boolean) => {
    for (const taskId of taskIds) {
      await updateTask(taskId, { is_completed: completed });
      if (completed) {
        addTaskCompletion();
      }
    }
    toast({
      title: completed ? "Tarefas completadas" : "Tarefas reabertas",
      description: `${taskIds.length} tarefa(s) atualizada(s)`,
    });
  };

  const handleBulkMove = async (taskIds: string[], columnId: string) => {
    const destinationColumn = columns.find(c => c.id === columnId);
    const isCompletedColumn = destinationColumn?.name.toLowerCase() === "concluído";
    
    for (const taskId of taskIds) {
      const updates: Partial<Task> = { column_id: columnId };
      if (isCompletedColumn) {
        updates.is_completed = true;
        addTaskCompletion();
      }
      await updateTask(taskId, updates);
    }
    toast({
      title: "Tarefas movidas",
      description: `${taskIds.length} tarefa(s) movida(s) para "${destinationColumn?.name}"`,
    });
  };

  const getTasksForColumn = (columnId: string) => {
    const filtered = tasks.filter((t) => {
      if (t.column_id !== columnId) return false;
      
      // Filtro de busca
      if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filtro de prioridade
      if (priorityFilter !== "all" && t.priority !== priorityFilter) {
        return false;
      }
      
      // Filtro de tag
      if (tagFilter !== "all" && !t.tags?.includes(tagFilter)) {
        return false;
      }

      // Filtro de data de vencimento
      if (dueDateFilter && dueDateFilter !== "all") {
        const today = startOfToday();
        const taskDueDate = t.due_date ? parseISO(t.due_date) : null;
        
        switch (dueDateFilter) {
          case "overdue":
            // Tarefas atrasadas (data anterior a hoje e não concluídas)
            if (!taskDueDate || !isBefore(taskDueDate, today) || t.is_completed) {
              return false;
            }
            break;
          case "today":
            // Tarefas com vencimento hoje
            if (!taskDueDate || taskDueDate.toDateString() !== today.toDateString()) {
              return false;
            }
            break;
          case "week":
            // Tarefas desta semana
            const weekStart = startOfWeek(today, { weekStartsOn: 0 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
            if (!taskDueDate || isBefore(taskDueDate, weekStart) || isAfter(taskDueDate, weekEnd)) {
              return false;
            }
            break;
          case "month":
            // Tarefas deste mês
            const monthStart = startOfMonth(today);
            const monthEnd = endOfMonth(today);
            if (!taskDueDate || isBefore(taskDueDate, monthStart) || isAfter(taskDueDate, monthEnd)) {
              return false;
            }
            break;
        }
      }

      // OTIMIZAÇÃO: Usar settings em vez de localStorage direto
      if (settings.kanban.hideCompletedTasks && t.is_completed) {
        return false;
      }
      
      return true;
    });

    // Aplicar ordenação
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "name_asc":
          return a.title.localeCompare(b.title, "pt-BR");
        case "name_desc":
          return b.title.localeCompare(a.title, "pt-BR");
        case "priority_asc": {
          const priorityMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
          return (priorityMap[a.priority || "medium"] || 2) - (priorityMap[b.priority || "medium"] || 2);
        }
        case "priority_desc": {
          const priorityMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
          return (priorityMap[b.priority || "medium"] || 2) - (priorityMap[a.priority || "medium"] || 2);
        }
        case "date_asc": {
          // Ordenar por DATA primeiro (dia), depois HORA como desempate
          const getDateTimeSP = (dateStr: string | null) => {
            if (!dateStr) return { date: Number.POSITIVE_INFINITY, time: Number.POSITIVE_INFINITY };
            const date = new Date(dateStr);
            // Extrair data no timezone de São Paulo
            const dateOnlySP = date.toLocaleDateString("pt-BR", { 
              timeZone: "America/Sao_Paulo",
              year: "numeric",
              month: "2-digit",
              day: "2-digit"
            });
            // Converter para número comparável (AAAAMMDD)
            const [day, month, year] = dateOnlySP.split("/").map(Number);
            const dateNum = year * 10000 + month * 100 + day;
            // Extrair hora no timezone de São Paulo
            const timeStr = date.toLocaleTimeString("pt-BR", { 
              timeZone: "America/Sao_Paulo",
              hour: "2-digit", 
              minute: "2-digit",
              hour12: false 
            });
            const [hours, minutes] = timeStr.split(":").map(Number);
            return { date: dateNum, time: hours * 60 + minutes };
          };
          const dtA = getDateTimeSP(a.due_date);
          const dtB = getDateTimeSP(b.due_date);
          // Primeiro comparar por data
          if (dtA.date !== dtB.date) return dtA.date - dtB.date;
          // Depois por hora como desempate
          return dtA.time - dtB.time;
        }
        case "date_desc": {
          const getDateTimeSP = (dateStr: string | null) => {
            if (!dateStr) return { date: Number.NEGATIVE_INFINITY, time: Number.NEGATIVE_INFINITY };
            const date = new Date(dateStr);
            const dateOnlySP = date.toLocaleDateString("pt-BR", { 
              timeZone: "America/Sao_Paulo",
              year: "numeric",
              month: "2-digit",
              day: "2-digit"
            });
            const [day, month, year] = dateOnlySP.split("/").map(Number);
            const dateNum = year * 10000 + month * 100 + day;
            const timeStr = date.toLocaleTimeString("pt-BR", { 
              timeZone: "America/Sao_Paulo",
              hour: "2-digit", 
              minute: "2-digit",
              hour12: false 
            });
            const [hours, minutes] = timeStr.split(":").map(Number);
            return { date: dateNum, time: hours * 60 + minutes };
          };
          const dtA = getDateTimeSP(a.due_date);
          const dtB = getDateTimeSP(b.due_date);
          // Primeiro comparar por data (descendente)
          if (dtA.date !== dtB.date) return dtB.date - dtA.date;
          // Depois por hora como desempate (descendente)
          return dtB.time - dtA.time;
        }
        default:
          return a.position - b.position;
      }
    });

    return sorted;
  };

  // Calcular espaçamentos e tamanhos baseados no modo de densidade
  const getDensityStyles = () => {
    switch (densityMode) {
      case "ultra-compact":
        return {
          gap: "gap-1",
          padding: "p-1",
          headerPadding: "p-1.5",
          cardGap: "gap-1",
          minHeight: "min-h-[60px]",
          headerText: "text-xs",
          countText: "text-xs"
        };
      case "compact":
        return {
          gap: "gap-2",
          padding: "p-2",
          headerPadding: "p-2",
          cardGap: "gap-1.5",
          minHeight: "min-h-[100px]",
          headerText: "text-sm",
          countText: "text-xs"
        };
      default: // comfortable
        return {
          gap: compact ? "gap-4" : "gap-4 md:gap-6",
          padding: compact ? "p-2" : "p-4 md:p-6",
          headerPadding: "p-3",
          cardGap: compact ? "gap-2" : "gap-3",
          minHeight: compact ? "min-h-[120px]" : "min-h-[200px]",
          headerText: compact ? "text-base" : "text-lg",
          countText: "text-sm"
        };
    }
  };

  const styles = getDensityStyles();

  // Se for mobile, usar view mobile otimizada
  if (isMobile) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          import("@/hooks/use-toast").then(({ toast }) => {
            toast({
              title: "Arraste cancelado",
              description: "A tarefa voltou para a posição original",
              duration: 2000,
            });
          });
        }}
      >
        <MobileKanbanView
          columns={columns}
          tasks={tasks}
          getTasksForColumn={getTasksForColumn}
          handleAddTask={handleAddTask}
          handleEditTask={handleEditTask}
          handleDeleteClick={handleDeleteClick}
          toggleFavorite={toggleFavorite}
          duplicateTask={duplicateTask}
          handleMoveTask={handleMoveTask}
          handleUncheckRecurrentTasks={handleUncheckRecurrentTasks}
          isDailyKanban={isDailyKanban}
          showCategoryBadge={showCategoryBadge}
          densityMode={densityMode}
          hideBadges={hideBadges}
          gridColumns={gridColumns}
          priorityColors={settings.customization?.priorityColors}
          originalCategoriesMap={originalCategoriesMap}
          getTagColor={getTagColor}
          onAddPoints={addTaskCompletion}
        />

        <TaskModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSave={handleSaveTask}
          task={selectedTask}
          columnId={selectedColumn}
          isDailyKanban={isDailyKanban}
          viewMode={viewMode}
          categoryId={categoryId}
          columns={columns}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A tarefa será permanentemente excluída.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DndContext>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => {
          setActiveId(e.active.id as string);
          setOverId(null);
        }}
        onDragOver={(e: DragOverEvent) => {
          const overId = e.over?.id as string | null;
          if (overId) {
            // Verificar se é uma zona droppable column-*
            if (overId.startsWith("column-")) {
              setOverId(overId.replace("column-", ""));
            } else {
              // Check if it's a column or a task in a column
              const isColumn = columns.some(c => c.id === overId);
              if (isColumn) {
                setOverId(overId);
              } else {
                // Find which column contains this task
                const task = tasks.find(t => t.id === overId);
                if (task) {
                  setOverId(task.column_id);
                }
              }
            }
          }
        }}
        onDragEnd={(e) => {
          handleDragEnd(e);
          setActiveId(null);
          setOverId(null);
        }}
        onDragCancel={() => {
          setActiveId(null);
          setOverId(null);
          import("@/hooks/use-toast").then(({ toast }) => {
            toast({
              title: "Arraste cancelado",
              description: "A tarefa voltou para a posição original",
              duration: 2000,
            });
          });
        }}
      >
        <div className={styles.padding}>
          <ResizablePanelGroup
            direction="horizontal"
            className={styles.gap}
            onLayout={(sizes) => setColumnSizes(sizes)}
          >
            {columns.map((column, columnIndex) => {
              const columnTasks = getTasksForColumn(column.id);
              const isDropTarget = activeId && overId === column.id;
              const isDragging = !!activeId;
              return (
                <>
                  <ResizablePanel
                    key={column.id}
                    defaultSize={columnSizes[columnIndex] || 100 / columns.length}
                    minSize={15}
                  >
                    <div 
                      className={`flex flex-col ${styles.gap} h-full transition-all duration-200 ${
                        isDropTarget 
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg scale-[1.01]" 
                          : isDragging 
                            ? "opacity-75" 
                            : ""
                      }`}
                    >
                      {/* Barra colorida no topo da coluna (estilo KanbanFlow) */}
                      <div className={`rounded-t-lg overflow-hidden border border-b-0 ${getColumnBackgroundClass(column.color)}`}>
                        <div className={`h-1.5 w-full ${getColumnTopBarClass(column.color)}`} />
                        <div className={`flex items-center justify-between ${styles.headerPadding}`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className={`${styles.headerText} font-semibold`}>{column.name}</h2>
                            <span className={`${styles.countText} text-muted-foreground`}>
                              ({columnTasks.length})
                            </span>
                            {column.name.toLowerCase() === "recorrente" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium">
                                🔄 Não reseta
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {/* Botão de seleção em massa */}
                            <Button
                              size="sm"
                              variant={isSelectionMode ? "default" : "ghost"}
                              onClick={() => isSelectionMode ? exitSelectionMode() : enterSelectionMode()}
                              title={isSelectionMode ? "Sair do modo seleção" : "Selecionar múltiplas tarefas"}
                              className={isSelectionMode ? "bg-primary text-primary-foreground" : ""}
                            >
                              <CheckSquare className={densityMode === "ultra-compact" ? "h-3 w-3" : "h-4 w-4"} />
                            </Button>
                            {column.name.toLowerCase() === "recorrente" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUncheckRecurrentTasks(column.id)}
                                title="Desmarcar todas as tarefas recorrentes"
                              >
                                <RotateCcw className={densityMode === "ultra-compact" ? "h-3 w-3" : "h-4 w-4"} />
                              </Button>
                            )}
                            <ColumnColorPicker
                              currentColor={column.color}
                              onColorChange={(color) => updateColumnColor(column.id, color)}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleAddTask(column.id)}
                              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-full group"
                            >
                              <Plus className={`${densityMode === "ultra-compact" ? "h-3 w-3" : "h-4 w-4"} transition-transform group-hover:rotate-90 duration-200`} />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <SortableContext
                        items={columnTasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                        id={column.id}
                      >
                        <DroppableColumn 
                          id={column.id}
                          isActive={isDragging}
                          className={`flex flex-col ${styles.cardGap} ${styles.minHeight} ${styles.padding} rounded-b-lg border border-t-0 ${getColumnBackgroundClass(column.color)} ${
                            isDropTarget ? "!bg-primary/10 border-primary/30" : ""
                          }`}
                        >
                          <AnimatePresence mode="popLayout" initial={false}>
                            {columnTasks.map((task) => (
                              <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                                transition={{
                                  duration: 0.15,
                                  ease: "easeOut",
                                }}
                              >
                                <TaskCard
                                  task={{
                                    ...task,
                                    // Usar task.id para buscar no mapa (tarefas no diário)
                                    // ou task.mirror_task_id para tarefas que apontam para projetos
                                    originalCategory: originalCategoriesMap[task.id] || 
                                      (task.mirror_task_id ? originalCategoriesMap[task.mirror_task_id] : undefined)
                                  }}
                                  onEdit={handleEditTask}
                                  onDelete={handleDeleteClick}
                                  onMoveLeft={() => handleMoveTask(task.id, "left")}
                                  onMoveRight={() => handleMoveTask(task.id, "right")}
                                  canMoveLeft={columnIndex > 0}
                                  canMoveRight={columnIndex < columns.length - 1}
                                  compact={compact || densityMode !== "comfortable"}
                                  isDailyKanban={isDailyKanban}
                                  showCategoryBadge={showCategoryBadge}
                                  onToggleFavorite={toggleFavorite}
                                  onDuplicate={duplicateTask}
                                  densityMode={densityMode}
                                  priorityColors={settings.customization?.priorityColors}
                                  getTagColor={getTagColor}
                                  onAddPoints={addTaskCompletion}
                                  isSelected={isSelected(task.id)}
                                  isSelectionMode={isSelectionMode}
                                  onToggleSelection={toggleSelection}
                                  columnName={column.name}
                                  completedColumnId={completedColumnId}
                                  onMoveToCompleted={(taskId, colId) => updateTask(taskId, { column_id: colId })}
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </DroppableColumn>
                      </SortableContext>
                    </div>
                  </ResizablePanel>
                  {columnIndex < columns.length - 1 && (
                    <ResizableHandle withHandle />
                  )}
                </>
              );
            })}
          </ResizablePanelGroup>
        </div>

        <DragOverlay dropAnimation={{
          duration: 150,
          easing: 'ease-out',
        }}>
          {activeId ? (
            <div className="rotate-2 scale-[1.02] shadow-xl shadow-primary/15 cursor-grabbing opacity-95">
              <TaskCard
                task={tasks.find((t) => t.id === activeId)!}
                onEdit={() => {}}
                onDelete={() => {}}
                priorityColors={settings.customization?.priorityColors}
                getTagColor={getTagColor}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSaveTask}
        task={selectedTask}
        columnId={selectedColumn}
        isDailyKanban={isDailyKanban}
        viewMode={viewMode}
        categoryId={categoryId}
        columns={columns}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Barra de ações em massa */}
      <BulkActionsBar
        columns={columns}
        onBulkDelete={handleBulkDelete}
        onBulkComplete={handleBulkComplete}
        onBulkMove={handleBulkMove}
      />
    </>
  );
}
