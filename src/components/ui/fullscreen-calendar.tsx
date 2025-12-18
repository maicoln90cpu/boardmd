"use client";

import * as React from "react";
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusCircleIcon,
  Filter,
  X,
  Clock,
  Calendar,
  ChevronUp,
  Plus,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

const colStartClasses = ["", "col-start-2", "col-start-3", "col-start-4", "col-start-5", "col-start-6", "col-start-7"];

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
}: FullScreenCalendarProps) {
  const today = startOfToday();
  const [selectedDay, setSelectedDay] = React.useState(today);
  const [currentMonth, setCurrentMonth] = React.useState(format(today, "MMM-yyyy"));
  const [mobileTasksExpanded, setMobileTasksExpanded] = React.useState(true);
  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date());
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
  });

  // Get tasks for selected day
  const selectedDayData = data.find((d) => isSameDay(d.day, selectedDay));
  const selectedDayTasks = selectedDayData?.tasks || [];

  function previousMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 });
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
  }

  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 });
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
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

  const hasActiveFilters = selectedCategories.length > 0 || selectedColumns.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Calendar Header */}
      <div className="flex flex-col gap-4 border-b bg-card px-4 py-4 lg:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Today info + Month */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg border bg-muted/50">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                {format(today, "MMM", { locale: ptBR })}
              </span>
              <span className="text-lg font-bold leading-none text-foreground">{format(today, "d")}</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-foreground">
                {format(firstDayCurrentMonth, "MMMM, yyyy", { locale: ptBR })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(firstDayCurrentMonth, "d 'de' MMM", { locale: ptBR })} -{" "}
                {format(endOfMonth(firstDayCurrentMonth), "d 'de' MMM, yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filters */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Categorias</span>
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
                    onCheckedChange={() => onToggleCategory(category.id)}
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
                  <span className="hidden sm:inline">Status</span>
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
                    onCheckedChange={() => onToggleColumn(column.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color || "#888" }} />
                      {column.name}
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1 px-2">
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Limpar</span>
              </Button>
            )}

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
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
          {weekDays.map((day) => (
            <div key={day} className="flex items-center justify-center py-2 text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="flex-1 overflow-auto">
          {/* Desktop View */}
          <div className={cn("hidden md:grid md:grid-cols-7 md:auto-rows-fr", "min-h-full")}>
            {days.map((day, dayIdx) => {
              const dayData = data.find((d) => isSameDay(d.day, day));
              const dayTasks = dayData?.tasks || [];

              return (
                <div
                  key={dayIdx}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    dayIdx === 0 && colStartClasses[getDay(day)],
                    !isEqual(day, selectedDay) &&
                      !isToday(day) &&
                      !isSameMonth(day, firstDayCurrentMonth) &&
                      "bg-muted/30 text-muted-foreground",
                    "relative flex flex-col border-b border-r hover:bg-muted/50 cursor-pointer transition-colors",
                    isEqual(day, selectedDay) && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                    isToday(day) && "bg-primary/10",
                  )}
                >
                  <div className="flex items-center justify-center py-1.5">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                        isToday(day) && "bg-primary text-primary-foreground",
                        isEqual(day, selectedDay) && !isToday(day) && "bg-muted",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-0.5 overflow-hidden px-1 pb-1">
                    {dayTasks.slice(0, 6).map((task) => {
                      const column = columns.find((c) => c.id === task.column_id);
                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs transition-colors",
                            getPriorityBg(task.priority),
                          )}
                        >
                          <div
                            className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", getPriorityColor(task.priority))}
                          />
                          <span className="truncate font-medium">{task.title}</span>
                          {task.due_date && (
                            <span className="ml-auto text-[10px] text-muted-foreground flex-shrink-0">
                              {format(new Date(task.due_date), "HH:mm")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {dayTasks.length > 6 && (
                      <div className="text-center text-[10px] text-muted-foreground">+ {dayTasks.length - 6} mais</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile View - Calendar Grid */}
          <div className="grid grid-cols-7 md:hidden">
            {days.map((day, dayIdx) => {
              const dayData = data.find((d) => isSameDay(d.day, day));
              const dayTasks = dayData?.tasks || [];

              return (
                <button
                  onClick={() => handleDayClick(day)}
                  key={dayIdx}
                  type="button"
                  className={cn(
                    !isEqual(day, selectedDay) &&
                      !isToday(day) &&
                      isSameMonth(day, firstDayCurrentMonth) &&
                      "text-foreground",
                    !isEqual(day, selectedDay) &&
                      !isToday(day) &&
                      !isSameMonth(day, firstDayCurrentMonth) &&
                      "text-muted-foreground",
                    (isEqual(day, selectedDay) || isToday(day)) && "font-semibold",
                    isEqual(day, selectedDay) && "bg-primary/10",
                    "flex h-12 flex-col items-center border-b border-r px-1 py-1.5 hover:bg-muted focus:z-10 transition-colors",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday(day) && "bg-primary text-primary-foreground",
                      isEqual(day, selectedDay) && !isToday(day) && "ring-2 ring-primary ring-offset-1",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayTasks.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div key={task.id} className={cn("h-1 w-1 rounded-full", getPriorityColor(task.priority))} />
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{dayTasks.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile View - Tasks List for Selected Day */}
          <div className="md:hidden border-t bg-card">
            {/* Header with toggle */}
            <button
              onClick={() => setMobileTasksExpanded(!mobileTasksExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-primary/10">
                  <span className="text-[10px] font-semibold uppercase text-primary">
                    {format(selectedDay, "EEE", { locale: ptBR })}
                  </span>
                  <span className="text-sm font-bold leading-none text-primary">{format(selectedDay, "d")}</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">
                    {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedDayTasks.length === 0
                      ? "Nenhuma tarefa"
                      : `${selectedDayTasks.length} tarefa${selectedDayTasks.length > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <motion.div animate={{ rotate: mobileTasksExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </button>

            {/* Tasks List */}
            <AnimatePresence>
              {mobileTasksExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <ScrollArea className="max-h-64">
                    <div className="px-4 pb-4 space-y-2">
                      {selectedDayTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
                          <p className="text-sm text-muted-foreground mb-3">Nenhuma tarefa para este dia</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateTaskOnDay(selectedDay)}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Criar tarefa
                          </Button>
                        </div>
                      ) : (
                        <>
                          {selectedDayTasks.map((task) => {
                            const column = columns.find((c) => c.id === task.column_id);
                            const category = categories.find((c) => c.id === task.category_id);
                            return (
                              <div
                                key={task.id}
                                className={cn(
                                  "flex items-start gap-3 rounded-lg p-3 transition-colors",
                                  getPriorityBg(task.priority),
                                )}
                              >
                                <div
                                  className={cn(
                                    "mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0",
                                    getPriorityColor(task.priority),
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {task.due_date && (
                                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(task.due_date), "HH:mm")}
                                      </span>
                                    )}
                                    {column && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-4"
                                        style={{
                                          borderColor: column.color || undefined,
                                          color: column.color || undefined,
                                        }}
                                      >
                                        {column.name}
                                      </Badge>
                                    )}
                                    {category && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                        {category.name}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {/* Add task button at the bottom */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateTaskOnDay(selectedDay)}
                            className="w-full gap-2 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar tarefa
                          </Button>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
