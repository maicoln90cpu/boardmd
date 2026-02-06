import { useState, useMemo, useEffect } from "react";
import { isSameDay, parseISO, startOfDay, isToday, isBefore, isAfter, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { Sidebar } from "@/components/Sidebar";
import { useColumns } from "@/hooks/data/useColumns";
import { useCategories } from "@/hooks/data/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { FullScreenCalendar } from "@/components/ui/fullscreen-calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskModal } from "@/components/TaskModal";
import { toast } from "sonner";
import { FilterPresetsManager } from "@/components/kanban/FilterPresetsManager";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  tags: string[] | null;
  column_id: string;
  category_id: string;
  position: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  subtasks: any;
  recurrence_rule: any;
  mirror_task_id: string | null;
  linked_note_id: string | null;
  is_completed: boolean | null;
}

import { FilterPresetFilters } from "@/types";

export default function Calendar() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Estados de filtro avançado
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  
  const { columns } = useColumns();
  const { categories } = useCategories();

  // Objeto de filtros atuais para o FilterPresetsManager
  const currentFilters: FilterPresetFilters = useMemo(() => ({
    searchTerm: searchTerm,
    priorityFilter: priorityFilter,
    tagFilter: tagFilter,
    categoryFilter: selectedCategories,
  }), [searchTerm, priorityFilter, tagFilter, selectedCategories]);

  // Verificar se há filtros ativos
  const hasActiveFilters = useMemo(() => {
    return searchTerm !== "" || 
           priorityFilter !== "all" || 
           tagFilter !== "all" || 
           dueDateFilter !== "all" || 
           selectedCategories.length > 0 || 
           selectedColumns.length > 0;
  }, [searchTerm, priorityFilter, tagFilter, dueDateFilter, selectedCategories, selectedColumns]);

  // Aplicar preset de filtros
  const handleApplyPreset = (filters: FilterPresetFilters) => {
    if (filters.searchTerm !== undefined) setSearchTerm(filters.searchTerm);
    if (filters.priorityFilter !== undefined) setPriorityFilter(filters.priorityFilter);
    if (filters.tagFilter !== undefined) setTagFilter(filters.tagFilter);
    if (filters.categoryFilter !== undefined) setSelectedCategories(filters.categoryFilter);
  };

  // Fetch ALL tasks from all kanbans and categories
  useEffect(() => {
    const fetchAllTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("position");

      if (!error && data) {
        setTasks(data as Task[]);
      }
    };

    fetchAllTasks();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('calendar-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          fetchAllTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Extrair lista de tags disponíveis das tarefas
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(task => task.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [tasks]);

  // Filter tasks based on selected categories, columns, search, priority, tags, and due date
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    const today = new Date();
    
    // Filter out mirrored tasks to avoid duplicates (legacy cleanup)
    filtered = filtered.filter(task => !task.mirror_task_id);
    
    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtro de prioridade
    if (priorityFilter !== "all") {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }
    
    // Filtro de tag
    if (tagFilter !== "all") {
      filtered = filtered.filter(task => task.tags?.includes(tagFilter));
    }
    
    // Filtro de data de vencimento
    if (dueDateFilter !== "all") {
      filtered = filtered.filter(task => {
        const dueDate = task.due_date ? parseISO(task.due_date) : null;
        
        switch (dueDateFilter) {
          case "no_date":
            return dueDate === null;
          case "overdue":
            return dueDate && isBefore(dueDate, startOfDay(today)) && !isToday(dueDate);
          case "today":
            return dueDate && isToday(dueDate);
          case "next_7_days": {
            const next7Days = new Date(today);
            next7Days.setDate(next7Days.getDate() + 7);
            return dueDate && !isBefore(dueDate, startOfDay(today)) && !isAfter(dueDate, next7Days);
          }
          case "week":
            return dueDate && isWithinInterval(dueDate, {
              start: startOfWeek(today, { locale: ptBR }),
              end: endOfWeek(today, { locale: ptBR })
            });
          case "month":
            return dueDate && isWithinInterval(dueDate, {
              start: startOfMonth(today),
              end: endOfMonth(today)
            });
          default:
            return true;
        }
      });
    }
    
    // Filtros existentes de categoria e coluna
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(task => selectedCategories.includes(task.category_id));
    }
    
    if (selectedColumns.length > 0) {
      filtered = filtered.filter(task => selectedColumns.includes(task.column_id));
    }
    
    return filtered;
  }, [tasks, searchTerm, priorityFilter, tagFilter, dueDateFilter, selectedCategories, selectedColumns]);

  // Transform tasks into calendar data format
  const calendarData = useMemo(() => {
    const dateMap = new Map<string, Task[]>();

    filteredTasks.forEach(task => {
      if (task.due_date) {
        const dateKey = task.due_date.split('T')[0];
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey)!.push(task);
      }
    });

    return Array.from(dateMap.entries()).map(([dateStr, tasks]) => ({
      // Use parseISO to correctly handle timezone
      day: parseISO(dateStr + 'T12:00:00'),
      tasks,
    }));
  }, [filteredTasks]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return filteredTasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = parseISO(task.due_date);
      return isSameDay(taskDate, selectedDate);
    });
  }, [selectedDate, filteredTasks]);

  // Toggle category filter
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Toggle column filter
  const toggleColumn = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedColumns([]);
    setSearchTerm("");
    setPriorityFilter("all");
    setTagFilter("all");
    setDueDateFilter("all");
  };

  const getPriorityColor = (priority?: string | null) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-amber-500";
      case "low": return "bg-emerald-500";
      default: return "bg-muted-foreground";
    }
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setNewTaskDate(new Date());
    setIsTaskModalOpen(true);
  };

  const handleDayClick = (date: Date) => {
    // On desktop, show dialog. On mobile, the calendar handles it internally
    setSelectedDate(date);
  };

  const handleCreateTaskOnDay = (date: Date) => {
    setEditingTask(null);
    setNewTaskDate(date);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTaskDate(null);
    setIsTaskModalOpen(true);
  };

  const handleTaskDateChange = async (taskId: string, newDate: Date) => {
    // Preserve the time from the original task
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let newDueDate: string;
    
    if (task.due_date) {
      // Extract time from original due_date
      const originalDate = parseISO(task.due_date);
      const hours = originalDate.getHours();
      const minutes = originalDate.getMinutes();
      
      // Set the new date with the same time
      const updatedDate = new Date(newDate);
      updatedDate.setHours(hours, minutes, 0, 0);
      newDueDate = updatedDate.toISOString();
    } else {
      // If no time was set, use noon
      const updatedDate = new Date(newDate);
      updatedDate.setHours(12, 0, 0, 0);
      newDueDate = updatedDate.toISOString();
    }

    const { error } = await supabase
      .from("tasks")
      .update({ due_date: newDueDate })
      .eq("id", taskId);

    if (error) {
      toast.error("Erro ao mover tarefa");
    } else {
      toast.success("Tarefa movida com sucesso");
    }
  };

  const handleCreateTask = async (taskData: any) => {
    // If editing, update the task
    if (editingTask) {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: taskData.title,
          description: taskData.description || null,
          due_date: taskData.due_date || null,
          priority: taskData.priority || null,
        })
        .eq("id", editingTask.id);

      if (!error) {
        setIsTaskModalOpen(false);
        setEditingTask(null);
        toast.success("Tarefa atualizada");
      }
      return;
    }

    // Get first category and column as defaults
    const defaultCategoryId = categories[0]?.id;
    const defaultColumnId = columns[0]?.id;

    if (!defaultCategoryId || !defaultColumnId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("tasks").insert({
      title: taskData.title,
      description: taskData.description || null,
      due_date: taskData.due_date || null,
      priority: taskData.priority || null,
      category_id: defaultCategoryId,
      column_id: defaultColumnId,
      user_id: user.id,
      position: 0,
    });

    if (!error) {
      setIsTaskModalOpen(false);
      toast.success("Tarefa criada");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={() => {}}
      />

      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        <FullScreenCalendar
          data={calendarData}
          columns={columns.map(c => ({ id: c.id, name: c.name, color: c.color }))}
          categories={categories.map(c => ({ id: c.id, name: c.name }))}
          selectedCategories={selectedCategories}
          selectedColumns={selectedColumns}
          onToggleCategory={toggleCategory}
          onToggleColumn={toggleColumn}
          onClearFilters={clearFilters}
          onNewTask={handleNewTask}
          onDayClick={handleDayClick}
          onCreateTaskOnDay={handleCreateTaskOnDay}
          onEditTask={handleEditTask}
          onTaskDateChange={handleTaskDateChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          tagFilter={tagFilter}
          onTagChange={setTagFilter}
          availableTags={availableTags}
          onColumnChange={setSelectedColumns}
          dueDateFilter={dueDateFilter}
          onDueDateChange={setDueDateFilter}
          tasks={tasks}
          filterPresetsSlot={
            <FilterPresetsManager
              currentFilters={currentFilters}
              onApplyPreset={handleApplyPreset}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          }
        />

        {/* Day Tasks Dialog */}
        <Dialog open={selectedDate !== null} onOpenChange={(open) => !open && setSelectedDate(null)}>
          <DialogContent className="max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                {selectedDate && format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedDateTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma tarefa para este dia
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateTasks.map((task) => {
                    const column = columns.find(c => c.id === task.column_id);
                    const category = categories.find(c => c.id === task.category_id);

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleEditTask(task)}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                              getPriorityColor(task.priority)
                            )}
                          />
                          <div className="flex-1 min-w-0 space-y-2">
                            <h4 className="font-medium text-foreground">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              {column && (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor: column.color || "#888",
                                    color: column.color || "#888",
                                  }}
                                >
                                  {column.name}
                                </Badge>
                              )}
                              {category && (
                                <Badge variant="secondary" className="text-xs">
                                  {category.name}
                                </Badge>
                              )}
                              {task.due_date && (
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(task.due_date), "HH:mm")}
                                </span>
                              )}
                              {task.priority && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    task.priority === "high" && "border-red-500 text-red-500",
                                    task.priority === "medium" && "border-amber-500 text-amber-500",
                                    task.priority === "low" && "border-emerald-500 text-emerald-500"
                                  )}
                                >
                                  {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                                </Badge>
                              )}
                            </div>
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {task.tags.map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-[10px]">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Task Modal for Create/Edit */}
        <TaskModal
          open={isTaskModalOpen}
          onOpenChange={(open) => {
            setIsTaskModalOpen(open);
            if (!open) setEditingTask(null);
          }}
          onSave={handleCreateTask}
          task={editingTask}
          columnId={editingTask?.column_id || columns[0]?.id || ""}
          categoryId={editingTask?.category_id || categories[0]?.id}
          defaultDueDate={newTaskDate}
        />
      </main>
    </div>
  );
}
