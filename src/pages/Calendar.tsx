import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar } from "@/components/Sidebar";
import { useColumns } from "@/hooks/useColumns";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"daily" | "all">("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

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

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    return filteredTasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date), date);
    });
  };

  // Get selected date tasks
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return getTasksForDate(selectedDate);
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

  const hasActiveFilters = selectedCategories.length > 0 || selectedColumns.length > 0;

  const getPriorityColor = (priority?: string | null) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getColumnColor = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    return column?.color || "#888888";
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Get first day of week for alignment
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={() => {}}
        onViewChange={setViewMode}
        viewMode={viewMode}
      />

      <main className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Calendário de Tarefas
                </CardTitle>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filters */}
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Filter className="h-4 w-4" />
                          Categorias
                          {selectedCategories.length > 0 && (
                            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5">
                              {selectedCategories.length}
                            </Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Filtrar por Categoria</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {categories.map((category) => (
                          <DropdownMenuCheckboxItem
                            key={category.id}
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={() => toggleCategory(category.id)}
                          >
                            {category.name}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Filter className="h-4 w-4" />
                          Status
                          {selectedColumns.length > 0 && (
                            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5">
                              {selectedColumns.length}
                            </Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {columns.map((column) => (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            checked={selectedColumns.includes(column.id)}
                            onCheckedChange={() => toggleColumn(column.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: column.color }}
                              />
                              {column.name}
                            </div>
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Limpar
                      </Button>
                    )}
                  </div>

                  <div className="h-6 w-px bg-border" />

                  {/* Navigation */}
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Hoje
                  </Button>
                  <Button variant="outline" size="icon" onClick={previousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-[180px] text-center font-semibold">
                    {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Week day headers */}
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                  <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
                    {day}
                  </div>
                ))}

                {/* Empty days before month starts */}
                {emptyDays.map((i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Days of month */}
                {daysInMonth.map((day) => {
                  const dayTasks = getTasksForDate(day);
                  const isCurrentDay = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "aspect-square border rounded-lg p-2 hover:bg-accent transition-colors relative",
                        isCurrentDay && "border-primary border-2 bg-primary/5"
                      )}
                    >
                      <div className="text-sm font-medium mb-1">
                        {format(day, "d")}
                      </div>
                      
                      {/* Task indicators */}
                      {dayTasks.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {dayTasks.slice(0, 3).map((task) => (
                            <div
                              key={task.id}
                              className={cn(
                                "w-2 h-2 rounded-full",
                                getPriorityColor(task.priority)
                              )}
                              style={{
                                boxShadow: `0 0 4px ${getColumnColor(task.column_id)}`
                              }}
                            />
                          ))}
                          {dayTasks.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{dayTasks.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex flex-wrap gap-6 justify-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Prioridade:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-muted-foreground">Alta</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-muted-foreground">Média</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">Baixa</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Status:</span>
                    <span className="text-muted-foreground">Cor do brilho indica a coluna</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Task Details Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {selectedDateTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma tarefa agendada para este dia
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateTasks.map((task) => {
                  const column = columns.find(c => c.id === task.column_id);
                  
                  return (
                    <Card key={task.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "w-1 h-full rounded-full",
                              getPriorityColor(task.priority)
                            )}
                          />
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold">{task.title}</h4>
                              {column && (
                                <Badge
                                  style={{
                                    backgroundColor: column.color,
                                    color: '#fff'
                                  }}
                                >
                                  {column.name}
                                </Badge>
                              )}
                            </div>
                            
                            {task.description && (
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              {task.tags?.map((tag) => (
                                <Badge key={tag} variant="outline">
                                  {tag}
                                </Badge>
                              ))}
                              
                              {task.due_date && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(task.due_date), "HH:mm")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
