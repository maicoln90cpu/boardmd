import { useState } from "react";
import { Column, useColumns } from "@/hooks/useColumns";
import { Task, useTasks } from "@/hooks/useTasks";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ColumnColorPicker, getColumnColorClass } from "./kanban/ColumnColorPicker";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { MobileKanbanView } from "./kanban/MobileKanbanView";
import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";

interface KanbanBoardProps {
  columns: Column[];
  categoryId: string;
  compact?: boolean;
  searchTerm?: string;
  priorityFilter?: string;
  tagFilter?: string;
  isDailyKanban?: boolean;
  sortOption?: string;
  showCategoryBadge?: boolean;
  allowCrossCategoryDrag?: boolean;
  viewMode?: string;
  densityMode?: "comfortable" | "compact" | "ultra-compact";
  hideBadges?: boolean;
  gridColumns?: 1 | 2;
}

export function KanbanBoard({ 
  columns, 
  categoryId, 
  compact: compactProp = false,
  searchTerm = "",
  priorityFilter = "all",
  tagFilter = "all",
  isDailyKanban = false,
  sortOption = "manual",
  showCategoryBadge = false,
  allowCrossCategoryDrag = false,
  viewMode = "daily",
  densityMode = "comfortable",
  hideBadges = false,
  gridColumns = 2
}: KanbanBoardProps) {
  const { tasks, addTask, updateTask, deleteTask, toggleFavorite, duplicateTask } = useTasks(categoryId);
  const { updateColumnColor } = useColumns();
  const { settings } = useSettings(); // OTIMIZAÇÃO: usar settings em vez de localStorage direto
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    
    if (!task) {
      setActiveId(null);
      return;
    }

    // Bloquear movimento de tarefas recorrentes para fora da coluna Recorrente
    const sourceColumn = columns.find(col => col.id === task.column_id);
    const containerId = over.data?.current?.sortable?.containerId ?? over.id;
    const newColumnId = containerId as string;
    
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
      await addTask({ ...taskData, column_id: selectedColumn, category_id: categoryId });
    }
  };

  const handleDeleteClick = (id: string) => {
    setTaskToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
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

  const handleUncheckRecurrentTasks = (columnId: string) => {
    const columnTasks = getTasksForColumn(columnId);
    
    // Data atual em UTC (apenas dia/mês/ano)
    const now = new Date();
    
    // Remover do localStorage e atualizar due_date
    columnTasks.forEach(task => {
      localStorage.removeItem(`task-completed-${task.id}`);
      
      // Preservar horário original, atualizar apenas a data
      if (task.due_date) {
        const originalDate = new Date(task.due_date);
        const newDate = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          originalDate.getUTCHours(),
          originalDate.getUTCMinutes(),
          originalDate.getUTCSeconds(),
          originalDate.getUTCMilliseconds()
        ));
        
        updateTask(task.id, {
          due_date: newDate.toISOString(),
          is_completed: false
        });
      }
    });
    
    // OTIMIZAÇÃO: Remover evento 'storage' - não mais necessário
    window.dispatchEvent(new CustomEvent('tasks-unchecked'));
    
    // Toast de sucesso
    import("@/hooks/use-toast").then(({ toast }) => {
      toast({
        title: "✅ Tarefas desmarcadas",
        description: "Todas as tarefas recorrentes foram desmarcadas e atualizadas para hoje",
      });
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
          // Extrair hora do dia no timezone de São Paulo para ordenar por horário
          const getTimeOfDaySP = (dateStr: string | null) => {
            if (!dateStr) return Number.POSITIVE_INFINITY;
            const date = new Date(dateStr);
            const timeStr = date.toLocaleTimeString("pt-BR", { 
              timeZone: "America/Sao_Paulo",
              hour: "2-digit", 
              minute: "2-digit",
              hour12: false 
            });
            const [hours, minutes] = timeStr.split(":").map(Number);
            return hours * 60 + minutes;
          };
          const timeA = getTimeOfDaySP(a.due_date);
          const timeB = getTimeOfDaySP(b.due_date);
          return timeA - timeB;
        }
        case "date_desc": {
          const getTimeOfDaySP = (dateStr: string | null) => {
            if (!dateStr) return Number.NEGATIVE_INFINITY;
            const date = new Date(dateStr);
            const timeStr = date.toLocaleTimeString("pt-BR", { 
              timeZone: "America/Sao_Paulo",
              hour: "2-digit", 
              minute: "2-digit",
              hour12: false 
            });
            const [hours, minutes] = timeStr.split(":").map(Number);
            return hours * 60 + minutes;
          };
          const timeA = getTimeOfDaySP(a.due_date);
          const timeB = getTimeOfDaySP(b.due_date);
          return timeB - timeA;
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
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.padding}>
          <ResizablePanelGroup
            direction="horizontal"
            className={styles.gap}
            onLayout={(sizes) => setColumnSizes(sizes)}
          >
            {columns.map((column, columnIndex) => {
              const columnTasks = getTasksForColumn(column.id);
              return (
                <>
                  <ResizablePanel
                    key={column.id}
                    defaultSize={columnSizes[columnIndex] || 100 / columns.length}
                    minSize={15}
                  >
                    <div className={`flex flex-col ${styles.gap} h-full`}>
                      <div className={`flex items-center justify-between ${styles.headerPadding} rounded-t-lg ${getColumnColorClass(column.color)}`}>
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
                            variant="ghost"
                            onClick={() => handleAddTask(column.id)}
                          >
                            <Plus className={densityMode === "ultra-compact" ? "h-3 w-3" : "h-4 w-4"} />
                          </Button>
                        </div>
                      </div>

                      <SortableContext
                        items={columnTasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                        id={column.id}
                      >
                        <div className={`flex flex-col ${styles.cardGap} ${styles.minHeight} ${styles.padding} rounded-lg bg-muted/30`}>
                          {columnTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
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
                            />
                          ))}
                        </div>
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

        <DragOverlay>
          {activeId ? (
            <div className="opacity-50">
              <TaskCard
                task={tasks.find((t) => t.id === activeId)!}
                onEdit={() => {}}
                onDelete={() => {}}
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
    </>
  );
}
