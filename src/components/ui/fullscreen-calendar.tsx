"use client";

import * as React from "react";
import { add, eachDayOfInterval, endOfMonth, endOfWeek, format, getDay, isEqual, isSameDay, isSameMonth, isToday, isBefore, parse, parseISO, startOfToday, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon, PlusCircleIcon, Calendar, CalendarDays, ChevronUp, Plus, GripVertical, Clock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KanbanFiltersBar } from "@/components/kanban/KanbanFiltersBar";
interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  tags: string[] | null;
  column_id: string;
  category_id: string;
}
interface Column {
  id: string;
  name: string;
  color: string | null;
}
interface Category {
  id: string;
  name: string;
}
interface CalendarData {
  day: Date;
  tasks: Task[];
}
interface FullScreenCalendarProps {
  data: CalendarData[];
  columns: Column[];
  categories: Category[];
  selectedCategories: string[];
  selectedColumns: string[];
  onToggleCategory: (categoryId: string) => void;
  onToggleColumn: (columnId: string) => void;
  onClearFilters: () => void;
  onNewTask: () => void;
  onDayClick: (date: Date) => void;
  onCreateTaskOnDay?: (date: Date) => void;
  onEditTask?: (task: Task) => void;
  onTaskDateChange?: (taskId: string, newDate: Date) => void;
  // Novos filtros avançados
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  priorityFilter?: string;
  onPriorityChange?: (value: string) => void;
  tagFilter?: string;
  onTagChange?: (value: string) => void;
  availableTags?: string[];
  onColumnChange?: (value: string[]) => void;
  dueDateFilter?: string;
  onDueDateChange?: (value: string) => void;
}
const colStartClasses = ["", "col-start-2", "col-start-3", "col-start-4", "col-start-5", "col-start-6", "col-start-7"];
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Helper function to get column color
function getColumnColor(columnId: string, columns: Column[]): string | null {
  const column = columns.find(c => c.id === columnId);
  return column?.color || null;
}

// Draggable Task Component
function DraggableTask({
  task,
  columns,
  getPriorityColor,
  getPriorityBg,
  onEditTask
}: {
  task: Task;
  columns: Column[];
  getPriorityColor: (priority?: string | null) => string;
  getPriorityBg: (priority?: string | null) => string;
  onEditTask?: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging
  } = useDraggable({
    id: task.id,
    data: {
      task
    }
  });

  // Check if task is overdue
  const today = startOfToday();
  const isOverdue = task.due_date && isBefore(parseISO(task.due_date), today);
  
  // Get column color for this task
  const columnColor = getColumnColor(task.column_id, columns);
  
  // Determine background style based on column color or priority
  const getTaskStyle = () => {
    if (isOverdue) {
      return {
        className: "bg-red-500/20 ring-1 ring-red-500 text-red-700 dark:text-red-400",
        indicatorColor: "bg-red-500"
      };
    }
    
    if (columnColor) {
      return {
        style: { 
          backgroundColor: `${columnColor}20`,
          borderLeft: `3px solid ${columnColor}`
        },
        indicatorStyle: { backgroundColor: columnColor }
      };
    }
    
    return {
      className: getPriorityBg(task.priority),
      indicatorClassName: getPriorityColor(task.priority)
    };
  };
  
  const taskStyle = getTaskStyle();
  
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors group w-full cursor-grab active:cursor-grabbing touch-none",
        taskStyle.className,
        isDragging && "opacity-50"
      )}
      style={taskStyle.style}
      onDoubleClick={e => {
        e.stopPropagation();
        onEditTask?.(task);
      }}
    >
      <GripVertical className="h-2.5 w-2.5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      <div 
        className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", taskStyle.indicatorClassName)} 
        style={taskStyle.indicatorStyle}
      />
      <span className="truncate font-medium text-[10px]">{task.title}</span>
    </div>
  );
}

// Droppable Day Cell Component
function DroppableDay({
  day,
  dayIdx,
  dayTasks,
  columns,
  selectedDay,
  firstDayCurrentMonth,
  getPriorityColor,
  getPriorityBg,
  onDayClick,
  onEditTask,
  viewType
}: {
  day: Date;
  dayIdx: number;
  dayTasks: Task[];
  columns: Column[];
  selectedDay: Date;
  firstDayCurrentMonth: Date;
  getPriorityColor: (priority?: string | null) => string;
  getPriorityBg: (priority?: string | null) => string;
  onDayClick: (day: Date) => void;
  onEditTask?: (task: Task) => void;
  viewType: "month" | "week";
}) {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id: format(day, "yyyy-MM-dd"),
    data: {
      day
    }
  });
  return <div ref={setNodeRef} onClick={() => onDayClick(day)} className={cn(dayIdx === 0 && colStartClasses[getDay(day)], !isEqual(day, selectedDay) && !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "bg-muted/30 text-muted-foreground", "relative flex flex-col border-b border-r hover:bg-muted/50 cursor-pointer transition-colors", isEqual(day, selectedDay) && "bg-primary/5 ring-1 ring-inset ring-primary/20", isToday(day) && "bg-primary/10", isOver && "ring-2 ring-primary ring-inset bg-primary/20")}>
      <div className="flex items-center justify-center py-1.5">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium", isToday(day) && "bg-primary text-primary-foreground", isEqual(day, selectedDay) && !isToday(day) && "bg-muted")}>
          {format(day, "d")}
        </span>
      </div>

      <div className={cn("flex-1 flex-col gap-0.5 overflow-y-auto px-1 pb-1 scrollbar-thin scrollbar-thumb-muted flex items-center justify-center", viewType === "week" ? "max-h-[300px]" : "max-h-[140px]")}>
        {dayTasks.map(task => <DraggableTask key={task.id} task={task} columns={columns} getPriorityColor={getPriorityColor} getPriorityBg={getPriorityBg} onEditTask={onEditTask} />)}
      </div>
    </div>;
}

// Mobile Droppable Day Cell Component
function MobileDroppableDay({
  day,
  dayTasks,
  selectedDay,
  firstDayCurrentMonth,
  getPriorityColor,
  onDayClick
}: {
  day: Date;
  dayTasks: Task[];
  selectedDay: Date;
  firstDayCurrentMonth: Date;
  getPriorityColor: (priority?: string | null) => string;
  onDayClick: (day: Date) => void;
}) {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id: format(day, "yyyy-MM-dd"),
    data: {
      day
    }
  });

  // Check for overdue tasks
  const today = startOfToday();
  const hasOverdue = dayTasks.some(task => task.due_date && isBefore(parseISO(task.due_date), today));
  return <button ref={setNodeRef} onClick={() => onDayClick(day)} type="button" className={cn(!isEqual(day, selectedDay) && !isToday(day) && isSameMonth(day, firstDayCurrentMonth) && "text-foreground", !isEqual(day, selectedDay) && !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "text-muted-foreground", (isEqual(day, selectedDay) || isToday(day)) && "font-semibold", isEqual(day, selectedDay) && "bg-primary/10", isOver && "ring-2 ring-primary ring-inset bg-primary/20", "flex h-12 flex-col items-center border-b border-r px-1 py-1.5 hover:bg-muted focus:z-10 transition-colors")}>
      <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs", isToday(day) && "bg-primary text-primary-foreground", isEqual(day, selectedDay) && !isToday(day) && "ring-2 ring-primary ring-offset-1")}>
        {format(day, "d")}
      </span>
      {dayTasks.length > 0 && <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
          {dayTasks.slice(0, 3).map(task => {
        const isOverdue = task.due_date && isBefore(parseISO(task.due_date), today);
        return <div key={task.id} className={cn("h-1 w-1 rounded-full", isOverdue ? "bg-red-500" : getPriorityColor(task.priority))} />;
      })}
          {dayTasks.length > 3 && <span className="text-[8px] text-muted-foreground">+{dayTasks.length - 3}</span>}
        </div>}
    </button>;
}
export function FullScreenCalendar({
  data,
  columns,
  categories,
  selectedCategories,
  selectedColumns,
  onToggleCategory,
  onToggleColumn,
  onClearFilters,
  onNewTask,
  onDayClick,
  onCreateTaskOnDay,
  onEditTask,
  onTaskDateChange,
  searchTerm = "",
  onSearchChange,
  priorityFilter = "all",
  onPriorityChange,
  tagFilter = "all",
  onTagChange,
  availableTags = [],
  onColumnChange,
  dueDateFilter = "all",
  onDueDateChange
}: FullScreenCalendarProps) {
  const today = startOfToday();
  const [selectedDay, setSelectedDay] = React.useState(today);
  const [currentMonth, setCurrentMonth] = React.useState(format(today, "MMM-yyyy"));
  const [mobileTasksExpanded, setMobileTasksExpanded] = React.useState(true);
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const [viewType, setViewType] = React.useState<"month" | "week">("month");
  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date());
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 8
    }
  }));

  // Get days based on view type
  const monthDays = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth, {
      locale: ptBR
    }),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth), {
      locale: ptBR
    })
  });
  const weekDaysInterval = eachDayOfInterval({
    start: startOfWeek(selectedDay, {
      locale: ptBR
    }),
    end: endOfWeek(selectedDay, {
      locale: ptBR
    })
  });
  const days = viewType === "week" ? weekDaysInterval : monthDays;

  // Get tasks for selected day
  const selectedDayData = data.find(d => isSameDay(d.day, selectedDay));
  const selectedDayTasks = selectedDayData?.tasks || [];
  function previousPeriod() {
    if (viewType === "week") {
      const newSelectedDay = add(selectedDay, {
        weeks: -1
      });
      setSelectedDay(newSelectedDay);
      setCurrentMonth(format(newSelectedDay, "MMM-yyyy"));
    } else {
      const firstDayNextMonth = add(firstDayCurrentMonth, {
        months: -1
      });
      setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
    }
  }
  function nextPeriod() {
    if (viewType === "week") {
      const newSelectedDay = add(selectedDay, {
        weeks: 1
      });
      setSelectedDay(newSelectedDay);
      setCurrentMonth(format(newSelectedDay, "MMM-yyyy"));
    } else {
      const firstDayNextMonth = add(firstDayCurrentMonth, {
        months: 1
      });
      setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
    }
  }
  function goToToday() {
    setCurrentMonth(format(today, "MMM-yyyy"));
    setSelectedDay(today);
  }
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    onDayClick(day);
  };
  const handleCreateTaskOnDay = (day: Date) => {
    if (onCreateTaskOnDay) {
      onCreateTaskOnDay(day);
    } else {
      onNewTask();
    }
  };
  const handleDragStart = (event: DragStartEvent) => {
    const {
      active
    } = event;
    const task = active.data.current?.task as Task;
    setActiveTask(task);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    setActiveTask(null);
    if (!over) return;
    const taskId = active.id as string;
    const newDateStr = over.id as string;

    // Parse the new date
    const newDate = parseISO(newDateStr);
    if (onTaskDateChange) {
      onTaskDateChange(taskId, newDate);
    }
  };
  const getPriorityColor = (priority?: string | null) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-amber-500";
      case "low":
        return "bg-emerald-500";
      default:
        return "bg-muted-foreground";
    }
  };
  const getPriorityBg = (priority?: string | null) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 hover:bg-red-500/20";
      case "medium":
        return "bg-amber-500/10 hover:bg-amber-500/20";
      case "low":
        return "bg-emerald-500/10 hover:bg-emerald-500/20";
      default:
        return "bg-muted hover:bg-muted/80";
    }
  };
  const hasActiveFilters = searchTerm || priorityFilter !== "all" || tagFilter !== "all" || selectedCategories.length > 0 || selectedColumns.length > 0;
  return <div className="flex h-full flex-col">
      {/* Filters Bar */}
      <KanbanFiltersBar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange || (() => {})}
        priorityFilter={priorityFilter}
        onPriorityChange={onPriorityChange || (() => {})}
        tagFilter={tagFilter}
        onTagChange={onTagChange || (() => {})}
        availableTags={availableTags}
        onClearFilters={onClearFilters}
        categoryFilter={selectedCategories}
        onCategoryChange={(cats) => {
          // Toggle each category
          cats.forEach(cat => {
            if (!selectedCategories.includes(cat)) {
              onToggleCategory(cat);
            }
          });
          selectedCategories.forEach(cat => {
            if (!cats.includes(cat)) {
              onToggleCategory(cat);
            }
          });
        }}
        categories={categories}
        columnFilter={selectedColumns}
        onColumnChange={onColumnChange}
        columns={columns}
        dueDateFilter={dueDateFilter}
        onDueDateChange={onDueDateChange}
        showPresets={false}
        searchPlaceholder="Buscar no calendário..."
      />

      {/* Calendar Header */}
      <div className="flex flex-col gap-4 border-b bg-card px-4 py-4 lg:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Today info + Month */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg border bg-muted/50">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                {format(today, "MMM", {
                locale: ptBR
              })}
              </span>
              <span className="text-lg font-bold leading-none text-foreground">{format(today, "d")}</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-foreground">
                {format(firstDayCurrentMonth, "MMMM, yyyy", {
                locale: ptBR
              })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(firstDayCurrentMonth, "d 'de' MMM", {
                locale: ptBR
              })} -{" "}
                {format(endOfMonth(firstDayCurrentMonth), "d 'de' MMM, yyyy", {
                locale: ptBR
              })}
              </p>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex flex-wrap items-center gap-2">

            {/* View Toggle */}
            <div className="flex rounded-lg border bg-muted/50 p-0.5">
              <Button variant={viewType === "month" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewType("month")}>
                <Calendar className="h-3.5 w-3.5 mr-1" />
                Mês
              </Button>
              <Button variant={viewType === "week" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewType("week")}>
                <CalendarDays className="h-3.5 w-3.5 mr-1" />
                Semana
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={previousPeriod}>
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={nextPeriod}>
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            {/* New Task Button */}
            <Button onClick={onNewTask} size="sm" className="gap-2">
              <PlusCircleIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Tarefa</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {weekDays.map(day => <div key={day} className="flex items-center justify-center py-2 text-xs font-medium text-muted-foreground">
              {day}
            </div>)}
        </div>

        {/* Calendar Days */}
        <div className="overflow-y-auto min-h-0">
          {/* Desktop View with Drag and Drop */}
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className={cn("hidden md:grid md:grid-cols-7 md:auto-rows-fr", "min-h-full")}>
              {days.map((day, dayIdx) => {
              const dayData = data.find(d => isSameDay(d.day, day));
              const dayTasks = dayData?.tasks || [];
              return <DroppableDay key={dayIdx} day={day} dayIdx={dayIdx} dayTasks={dayTasks} columns={columns} selectedDay={selectedDay} firstDayCurrentMonth={firstDayCurrentMonth} getPriorityColor={getPriorityColor} getPriorityBg={getPriorityBg} onDayClick={handleDayClick} onEditTask={onEditTask} viewType={viewType} />;
            })}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeTask && <div className={cn("flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs shadow-lg", getPriorityBg(activeTask.priority))}>
                  <div className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", getPriorityColor(activeTask.priority))} />
                  <span className="truncate font-medium">{activeTask.title}</span>
                </div>}
            </DragOverlay>
          </DndContext>

          {/* Mobile View - Calendar Grid with DnD */}
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-7 md:hidden">
              {days.map((day, dayIdx) => {
              const dayData = data.find(d => isSameDay(d.day, day));
              const dayTasks = dayData?.tasks || [];
              return <MobileDroppableDay key={dayIdx} day={day} dayTasks={dayTasks} selectedDay={selectedDay} firstDayCurrentMonth={firstDayCurrentMonth} getPriorityColor={getPriorityColor} onDayClick={handleDayClick} />;
            })}
            </div>

            {/* Mobile Drag Overlay */}
            <DragOverlay>
              {activeTask && <div className={cn("flex items-center gap-1.5 rounded px-2 py-1 text-xs shadow-lg", (() => {
              const isOverdue = activeTask.due_date && isBefore(parseISO(activeTask.due_date), today);
              return isOverdue ? "bg-red-500/20 ring-1 ring-red-500" : getPriorityBg(activeTask.priority);
            })())}>
                  <div className={cn("h-2 w-2 rounded-full flex-shrink-0", getPriorityColor(activeTask.priority))} />
                  <span className="truncate font-medium">{activeTask.title}</span>
                </div>}
            </DragOverlay>
          </DndContext>

          {/* Mobile View - Tasks List for Selected Day */}
          <div className="md:hidden border-t bg-card">
            {/* Header with toggle */}
            <button onClick={() => setMobileTasksExpanded(!mobileTasksExpanded)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-primary/10">
                  <span className="text-[10px] font-semibold uppercase text-primary">
                    {format(selectedDay, "EEE", {
                    locale: ptBR
                  })}
                  </span>
                  <span className="text-sm font-bold leading-none text-primary">{format(selectedDay, "d")}</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">
                    {format(selectedDay, "EEEE, d 'de' MMMM", {
                    locale: ptBR
                  })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedDayTasks.length === 0 ? "Nenhuma tarefa" : `${selectedDayTasks.length} tarefa${selectedDayTasks.length > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <motion.div animate={{
              rotate: mobileTasksExpanded ? 180 : 0
            }} transition={{
              duration: 0.2
            }}>
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </button>

            {/* Tasks List */}
            <AnimatePresence>
              {mobileTasksExpanded && <motion.div initial={{
              height: 0,
              opacity: 0
            }} animate={{
              height: "auto",
              opacity: 1
            }} exit={{
              height: 0,
              opacity: 0
            }} transition={{
              duration: 0.2
            }} className="overflow-hidden">
                  <ScrollArea className="max-h-64">
                    <div className="flex flex-col flex-1 px-4 pb-4 space-y-2">
                      {selectedDayTasks.length === 0 ? <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
                          <p className="text-sm text-muted-foreground mb-3">Nenhuma tarefa para este dia</p>
                          <Button size="sm" variant="outline" onClick={() => handleCreateTaskOnDay(selectedDay)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Criar tarefa
                          </Button>
                        </div> : <>
                          {selectedDayTasks.map(task => {
                      const column = columns.find(c => c.id === task.column_id);
                      const category = categories.find(c => c.id === task.category_id);
                      const isOverdue = task.due_date && isBefore(parseISO(task.due_date), today);
                      return <div key={task.id} onClick={() => onEditTask?.(task)} className={cn("flex items-start gap-3 rounded-lg p-3 transition-colors cursor-pointer", isOverdue ? "bg-red-500/20 ring-1 ring-red-500" : getPriorityBg(task.priority))}>
                                <div className={cn("mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0", isOverdue ? "bg-red-500" : getPriorityColor(task.priority))} />
                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-sm font-medium truncate", isOverdue ? "text-red-700 dark:text-red-400" : "text-foreground")}>
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {task.due_date && <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                                        <Clock className="h-3 w-3" />
                                        {format(parseISO(task.due_date), "HH:mm")}
                                      </span>}
                                    {column && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4" style={{
                              borderColor: column.color || undefined,
                              color: column.color || undefined
                            }}>
                                        {column.name}
                                      </Badge>}
                                    {category && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                        {category.name}
                                      </Badge>}
                                  </div>
                                </div>
                              </div>;
                    })}
                          {/* Add task button at the bottom */}
                          <Button variant="ghost" size="sm" onClick={() => handleCreateTaskOnDay(selectedDay)} className="w-full gap-2 text-muted-foreground hover:text-foreground">
                            <Plus className="h-4 w-4" />
                            Adicionar tarefa
                          </Button>
                        </>}
                    </div>
                  </ScrollArea>
                </motion.div>}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>;
}