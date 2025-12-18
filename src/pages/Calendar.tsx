import { useState, useMemo, useEffect } from "react";
import { isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { Sidebar } from "@/components/Sidebar";
import { useColumns } from "@/hooks/useColumns";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { FullScreenCalendar } from "@/components/ui/fullscreen-calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskModal } from "@/components/TaskModal";

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
}

export default function Calendar() {
  const [viewMode, setViewMode] = useState<"daily" | "all">("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
  
  const { columns } = useColumns();
  const { categories } = useCategories();

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

  // Filter tasks based on selected categories and columns
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(task => selectedCategories.includes(task.category_id));
    }
    
    if (selectedColumns.length > 0) {
      filtered = filtered.filter(task => selectedColumns.includes(task.column_id));
    }
    
    return filtered;
  }, [tasks, selectedCategories, selectedColumns]);

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
      day: new Date(dateStr),
      tasks,
    }));
  }, [filteredTasks]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return filteredTasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date), selectedDate);
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
    setNewTaskDate(new Date());
    setIsTaskModalOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCreateTask = async (taskData: any) => {
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
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={() => {}}
        onViewChange={setViewMode}
        viewMode={viewMode}
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
                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
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
                                  {format(new Date(task.due_date), "HH:mm")}
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

        {/* New Task Modal */}
        <TaskModal
          open={isTaskModalOpen}
          onOpenChange={setIsTaskModalOpen}
          onSave={handleCreateTask}
          task={null}
          columnId={columns[0]?.id || ""}
          categoryId={categories[0]?.id}
        />
      </main>
    </div>
  );
}
