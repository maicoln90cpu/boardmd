import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { Column, useColumns } from "@/hooks/data/useColumns";
import { startOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isBefore, isAfter } from "date-fns";
import { Task, useTasks } from "@/hooks/tasks/useTasks";
import { TaskCard } from "./TaskCard";
import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { MobileKanbanView } from "./kanban/MobileKanbanView";
import { KanbanDesktopView } from "./kanban/KanbanDesktopView";
import { DeleteTaskDialog } from "./kanban/DeleteTaskDialog";
import { BulkActionsBar } from "./kanban/BulkActionsBar";
import { useBreakpoint } from "@/hooks/ui/useBreakpoint";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSettings } from "@/hooks/data/useSettings";
import { useTags } from "@/hooks/data/useTags";
import { useUserStats } from "@/hooks/useUserStats";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useKanbanDragDrop } from "@/hooks/useKanbanDragDrop";
import { useKanbanTaskActions } from "@/hooks/useKanbanTaskActions";
import { supabase } from "@/integrations/supabase/client";
import { TaskWithCategory } from "@/types";
import { sortTasksByOption, SortOptionType } from "@/lib/taskFilters";

// Lazy load TaskModal - componente pesado com muitas dependências
const TaskModal = lazy(() => import("./TaskModal").then(m => ({ default: m.TaskModal })));

interface KanbanBoardProps {
  columns: Column[];
  categoryId: string;
  compact?: boolean;
  searchTerm?: string;
  priorityFilter?: string | string[];
  tagFilter?: string | string[];
  dueDateFilter?: string | string[];
  sortOption?: string;
  showCategoryBadge?: boolean;
  allowCrossCategoryDrag?: boolean;
  densityMode?: "comfortable" | "compact" | "ultra-compact";
  hideBadges?: boolean;
  gridColumns?: 1 | 2;
  categoryFilter?: string[];
  categoryFilterInitialized?: boolean;
  selectedCategoryId?: string;
}

// Helper para normalizar filtro para array
const normalizeFilter = (filter: string | string[] | undefined): string[] => {
  if (!filter) return [];
  if (Array.isArray(filter)) return filter;
  if (filter === "all" || filter === "") return [];
  return [filter];
};

export function KanbanBoard({ 
  columns, 
  categoryId, 
  compact: compactProp = false,
  searchTerm = "",
  priorityFilter = "all",
  tagFilter = "all",
  dueDateFilter = "all",
  sortOption = "manual",
  showCategoryBadge = false,
  allowCrossCategoryDrag = false,
  densityMode = "comfortable",
  hideBadges = false,
  gridColumns = 2,
  categoryFilter = [],
  categoryFilterInitialized = false,
  selectedCategoryId
}: KanbanBoardProps) {
  const { tasks: rawTasks, addTask, updateTask, deleteTask, toggleFavorite, duplicateTask } = useTasks(categoryId);
  const { columns: allColumns, updateColumnColor } = useColumns();

  // FILTRO DE CATEGORIAS
  const tasks = useMemo(() => {
    if (categoryId !== "all") return rawTasks;
    if (!categoryFilterInitialized) return rawTasks;
    if (categoryFilter.length === 0) return [];
    return rawTasks.filter((task) => categoryFilter.includes(task.category_id));
  }, [rawTasks, categoryId, categoryFilter, categoryFilterInitialized]);

  const completedColumnId = allColumns.find((c) => c.name.toLowerCase() === "concluído")?.id;
  const { settings } = useSettings();
  const { getTagColor } = useTags();
  const { addTaskCompletion } = useUserStats();
  const {
    isSelectionMode,
    isSelected,
    toggleSelection,
    enterSelectionMode,
    exitSelectionMode,
  } = useBulkSelection();

  const isMobile = useBreakpoint() === "mobile";
  const compact = isMobile || compactProp;

  // Tamanhos das colunas sincronizados via settings
  const columnSizesFromSettings = settings.kanban.columnSizes?.[categoryId];
  const [localColumnSizes, setLocalColumnSizes] = useState<number[]>(
    columnSizesFromSettings || columns.map(() => 100 / columns.length)
  );

  // Sincronizar tamanhos com settings quando mudar
  useEffect(() => {
    if (columnSizesFromSettings) {
      setLocalColumnSizes(columnSizesFromSettings);
    }
  }, [columnSizesFromSettings]);

  const columnSizes = localColumnSizes;
  const setColumnSizes = useCallback((newSizes: number[] | ((prev: number[]) => number[])) => {
    const sizes = typeof newSizes === 'function' ? newSizes(localColumnSizes) : newSizes;
    setLocalColumnSizes(sizes);
    // Salvar no settings (banco de dados)
    // Isso será salvo junto com outras alterações para evitar muitas chamadas
  }, [localColumnSizes]);

  // Mapa de categorias originais (simplificado - sem espelhamento)
  const originalCategoriesMap: Record<string, string> = {};

  // Drag and Drop hook
  const {
    activeId,
    overId,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    setActiveId,
    setOverId,
  } = useKanbanDragDrop({
    columns,
    tasks,
    updateTask,
    onTaskCompleted: addTaskCompletion,
  });

  // Task Actions hook
  const {
    modalOpen,
    setModalOpen,
    selectedTask,
    selectedColumn,
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleAddTask,
    handleEditTask,
    handleDeleteClick,
    confirmDelete,
    handleMoveTask,
    handleUncheckRecurrentTasks,
    handleBulkDelete,
    handleBulkComplete,
    handleBulkMove,
  } = useKanbanTaskActions({
    columns,
    tasks,
    updateTask,
    deleteTask,
    onTaskCompleted: addTaskCompletion,
  });

  const handleSaveTask = useCallback(async (taskData: Partial<Task>) => {
    if (selectedTask) {
      await updateTask(selectedTask.id, taskData);
    } else {
      const finalCategoryId = categoryId === "all" ? taskData.category_id : categoryId;
      
      if (!finalCategoryId || finalCategoryId === "all") {
        const { toast } = await import("@/hooks/ui/useToast");
        toast({
          title: "Categoria obrigatória",
          description: "Por favor, selecione uma categoria para a tarefa.",
          variant: "destructive",
        });
        return;
      }
      
      await addTask({ ...taskData, column_id: selectedColumn, category_id: finalCategoryId });
    }
  }, [selectedTask, updateTask, categoryId, addTask, selectedColumn]);

  const getTasksForColumn = useCallback((columnId: string) => {
    // Normalizar filtros para arrays
    const priorities = normalizeFilter(priorityFilter);
    const tags = normalizeFilter(tagFilter);
    const dueDates = normalizeFilter(dueDateFilter);
    
    const filtered = tasks.filter((t) => {
      if (t.column_id !== columnId) return false;
      
      if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filtro de prioridade (OR logic)
      if (priorities.length > 0 && !priorities.includes(t.priority || "medium")) {
        return false;
      }
      
      // Filtro de tags (OR logic)
      if (tags.length > 0 && !t.tags?.some(tag => tags.includes(tag))) {
        return false;
      }

      // Filtro de data (OR logic)
      if (dueDates.length > 0) {
        const today = startOfToday();
        const taskDueDate = t.due_date ? parseISO(t.due_date) : null;
        
        const matchesAnyDateFilter = dueDates.some(dateFilter => {
          switch (dateFilter) {
            case "no_date":
              return taskDueDate === null;
            case "overdue":
              return taskDueDate && isBefore(taskDueDate, today) && !t.is_completed;
            case "overdue_today": {
              if (!taskDueDate) return false;
              const isOverdue = isBefore(taskDueDate, today) && !t.is_completed;
              const isToday = taskDueDate.toDateString() === today.toDateString();
              return isOverdue || isToday;
            }
            case "today":
              return taskDueDate && taskDueDate.toDateString() === today.toDateString();
            case "next_7_days": {
              if (!taskDueDate) return false;
              const next7Days = new Date(today);
              next7Days.setDate(next7Days.getDate() + 7);
              return !isBefore(taskDueDate, today) && !isAfter(taskDueDate, next7Days);
            }
            case "week": {
              const weekStart = startOfWeek(today, { weekStartsOn: 0 });
              const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
              return taskDueDate && !isBefore(taskDueDate, weekStart) && !isAfter(taskDueDate, weekEnd);
            }
            case "month": {
              const monthStart = startOfMonth(today);
              const monthEnd = endOfMonth(today);
              return taskDueDate && !isBefore(taskDueDate, monthStart) && !isAfter(taskDueDate, monthEnd);
            }
            default:
              return true;
          }
        });
        
        if (!matchesAnyDateFilter) return false;
      }

      // Ocultar tarefas concluídas EXCETO recorrentes (que ficam riscadas até reset)
      if (settings.kanban.hideCompletedTasks && t.is_completed) {
        // Tarefas recorrentes sempre visíveis (riscadas) até reset manual/cron
        if (t.recurrence_rule) {
          return true;
        }
        return false;
      }
      
      return true;
    });

    // Aplicar ordenação usando função centralizada
    return sortTasksByOption(filtered, sortOption as SortOptionType);
  }, [tasks, searchTerm, priorityFilter, tagFilter, dueDateFilter, settings.kanban.hideCompletedTasks, sortOption]);

  // Memoizar handlers para evitar re-renders em componentes filhos
  const handleUncheckRecurrentTasksWrapper = useCallback(
    (colId: string) => handleUncheckRecurrentTasks(colId, getTasksForColumn),
    [handleUncheckRecurrentTasks, getTasksForColumn]
  );

  const handleDragEndWrapper = useCallback((e: Parameters<typeof handleDragEnd>[0]) => {
    handleDragEnd(e);
    setActiveId(null);
    setOverId(null);
  }, [handleDragEnd, setActiveId, setOverId]);

  // Memoizar tarefa ativa para DragOverlay
  const activeTask = useMemo(
    () => activeId ? tasks.find((t) => t.id === activeId) : null,
    [activeId, tasks]
  );

  // Mobile view
  if (isMobile) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
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
          showCategoryBadge={showCategoryBadge}
          densityMode={densityMode}
          hideBadges={hideBadges}
          gridColumns={gridColumns}
          priorityColors={settings.customization?.priorityColors}
          originalCategoriesMap={originalCategoriesMap}
          getTagColor={getTagColor}
          onAddPoints={addTaskCompletion}
        />

        {modalOpen && (
          <Suspense fallback={null}>
            <TaskModal
              open={modalOpen}
              onOpenChange={setModalOpen}
              onSave={handleSaveTask}
              task={selectedTask}
              columnId={selectedColumn}
              categoryId={selectedCategoryId || categoryId}
              columns={columns}
            />
          </Suspense>
        )}

        <DeleteTaskDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
        />
      </DndContext>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEndWrapper}
        onDragCancel={handleDragCancel}
      >
        <KanbanDesktopView
          columns={columns}
          columnSizes={columnSizes}
          onColumnSizesChange={setColumnSizes}
          getTasksForColumn={getTasksForColumn}
          activeId={activeId}
          overId={overId}
          densityMode={densityMode}
          compact={compact}
          isSelectionMode={isSelectionMode}
          isSelected={isSelected}
          onToggleSelection={toggleSelection}
          onEnterSelectionMode={enterSelectionMode}
          onExitSelectionMode={exitSelectionMode}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onDeleteClick={handleDeleteClick}
          onMoveTask={handleMoveTask}
          onUncheckRecurrentTasks={handleUncheckRecurrentTasksWrapper}
          onColorChange={updateColumnColor}
          toggleFavorite={toggleFavorite}
          duplicateTask={duplicateTask}
          updateTask={updateTask}
          showCategoryBadge={showCategoryBadge}
          priorityColors={settings.customization?.priorityColors}
          getTagColor={getTagColor}
          onAddPoints={addTaskCompletion}
          originalCategoriesMap={originalCategoriesMap}
          completedColumnId={completedColumnId}
        />

        <DragOverlay dropAnimation={{
          duration: 150,
          easing: 'ease-out',
        }}>
          {activeTask ? (
            <div className="rotate-2 scale-[1.02] shadow-xl shadow-primary/15 cursor-grabbing opacity-95">
              <TaskCard
                task={activeTask}
                onEdit={() => {}}
                onDelete={() => {}}
                priorityColors={settings.customization?.priorityColors}
                getTagColor={getTagColor}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

        {modalOpen && (
          <Suspense fallback={null}>
            <TaskModal
              open={modalOpen}
              onOpenChange={setModalOpen}
              onSave={handleSaveTask}
              task={selectedTask}
              columnId={selectedColumn}
              categoryId={selectedCategoryId || categoryId}
              columns={columns}
            />
          </Suspense>
        )}

      <DeleteTaskDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
      />

      <BulkActionsBar
        columns={columns}
        onBulkDelete={handleBulkDelete}
        onBulkComplete={handleBulkComplete}
        onBulkMove={handleBulkMove}
      />
    </>
  );
}
