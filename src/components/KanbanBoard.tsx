import { useState, useEffect, useMemo, useCallback } from "react";
import { Column, useColumns } from "@/hooks/useColumns";
import { startOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isBefore, isAfter } from "date-fns";
import { Task, useTasks } from "@/hooks/useTasks";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { MobileKanbanView } from "./kanban/MobileKanbanView";
import { KanbanDesktopView } from "./kanban/KanbanDesktopView";
import { DeleteTaskDialog } from "./kanban/DeleteTaskDialog";
import { BulkActionsBar } from "./kanban/BulkActionsBar";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSettings } from "@/hooks/useSettings";
import { useTags } from "@/hooks/useTags";
import { useUserStats } from "@/hooks/useUserStats";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useKanbanDragDrop } from "@/hooks/useKanbanDragDrop";
import { useKanbanTaskActions } from "@/hooks/useKanbanTaskActions";
import { supabase } from "@/integrations/supabase/client";

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
  
  // FILTRO DE CATEGORIAS
  const tasks = useMemo(() => {
    if (categoryId !== "all") return rawTasks;
    if (!categoryFilterInitialized) return rawTasks;
    if (categoryFilter.length === 0) return [];
    return rawTasks.filter(task => categoryFilter.includes(task.category_id));
  }, [rawTasks, categoryId, categoryFilter, categoryFilterInitialized]);
  
  const completedColumnId = allColumns.find(c => c.name.toLowerCase() === "concluído")?.id;
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
  
  const isMobile = useBreakpoint() === 'mobile';
  const compact = isMobile || compactProp;
  
  const [columnSizes, setColumnSizes] = useLocalStorage<number[]>(
    `kanban-column-sizes-${categoryId}`,
    columns.map(() => 100 / columns.length)
  );
  
  // Mapa de categorias originais para tarefas espelhadas
  const [originalCategoriesMap, setOriginalCategoriesMap] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (!isDailyKanban) return;
    
    const dailyRecurrentIds = tasks.filter(t => t.recurrence_rule).map(t => t.id);
    const mirrorIds = tasks.filter(t => t.mirror_task_id).map(t => t.mirror_task_id!);
    
    const fetchFromMirrorIds = mirrorIds.length > 0 ? supabase
      .from("tasks")
      .select("id, categories:categories(name)")
      .in("id", mirrorIds) : Promise.resolve({ data: [] });
    
    const fetchFromProjectMirrors = dailyRecurrentIds.length > 0 ? supabase
      .from("tasks")
      .select("id, mirror_task_id, categories:categories(name)")
      .in("mirror_task_id", dailyRecurrentIds) : Promise.resolve({ data: [] });
    
    Promise.all([fetchFromMirrorIds, fetchFromProjectMirrors]).then(([result1, result2]) => {
      const map: Record<string, string> = {};
      
      if (result1.data) {
        result1.data.forEach((task: any) => {
          if (task.categories?.name) {
            map[task.id] = task.categories.name;
          }
        });
      }
      
      if (result2.data) {
        result2.data.forEach((task: any) => {
          if (task.categories?.name && task.mirror_task_id) {
            map[task.mirror_task_id] = task.categories.name;
          }
        });
      }
      
      setOriginalCategoriesMap(map);
    });
  }, [isDailyKanban, tasks]);

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

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (selectedTask) {
      await updateTask(selectedTask.id, taskData);
    } else {
      const finalCategoryId = categoryId === "all" ? taskData.category_id : categoryId;
      
      if (!finalCategoryId || finalCategoryId === "all") {
        const { toast } = await import("@/hooks/useToast");
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

  const getTasksForColumn = useCallback((columnId: string) => {
    const filtered = tasks.filter((t) => {
      if (t.column_id !== columnId) return false;
      
      if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      if (priorityFilter !== "all" && t.priority !== priorityFilter) {
        return false;
      }
      
      if (tagFilter !== "all" && !t.tags?.includes(tagFilter)) {
        return false;
      }

      if (dueDateFilter && dueDateFilter !== "all") {
        const today = startOfToday();
        const taskDueDate = t.due_date ? parseISO(t.due_date) : null;
        
        switch (dueDateFilter) {
          case "no_date":
            if (taskDueDate !== null) return false;
            break;
          case "overdue":
            if (!taskDueDate || !isBefore(taskDueDate, today) || t.is_completed) return false;
            break;
          case "today":
            if (!taskDueDate || taskDueDate.toDateString() !== today.toDateString()) return false;
            break;
          case "week":
            const weekStart = startOfWeek(today, { weekStartsOn: 0 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
            if (!taskDueDate || isBefore(taskDueDate, weekStart) || isAfter(taskDueDate, weekEnd)) return false;
            break;
          case "month":
            const monthStart = startOfMonth(today);
            const monthEnd = endOfMonth(today);
            if (!taskDueDate || isBefore(taskDueDate, monthStart) || isAfter(taskDueDate, monthEnd)) return false;
            break;
        }
      }

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
          const getDateTimeSP = (dateStr: string | null) => {
            if (!dateStr) return { date: Number.POSITIVE_INFINITY, time: Number.POSITIVE_INFINITY };
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
          if (dtA.date !== dtB.date) return dtA.date - dtB.date;
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
          if (dtA.date !== dtB.date) return dtB.date - dtA.date;
          return dtB.time - dtA.time;
        }
        default:
          return a.position - b.position;
      }
    });

    return sorted;
  }, [tasks, searchTerm, priorityFilter, tagFilter, dueDateFilter, settings.kanban.hideCompletedTasks, sortOption]);

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
          handleUncheckRecurrentTasks={(colId) => handleUncheckRecurrentTasks(colId, getTasksForColumn)}
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
        onDragEnd={(e) => {
          handleDragEnd(e);
          setActiveId(null);
          setOverId(null);
        }}
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
          onUncheckRecurrentTasks={(colId) => handleUncheckRecurrentTasks(colId, getTasksForColumn)}
          onColorChange={updateColumnColor}
          toggleFavorite={toggleFavorite}
          duplicateTask={duplicateTask}
          updateTask={updateTask}
          isDailyKanban={isDailyKanban}
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
