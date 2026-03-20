import { useState, useMemo, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/ui/useToast";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { isBefore, parseISO, addDays } from "date-fns";
import { formatDateShortBR } from "@/lib/dateUtils";
import { AlertTriangle, Clock, Zap, Archive, Calendar, GripVertical } from "lucide-react";
import { KanbanLoadingSkeleton } from "@/components/ui/loading-skeleton";

interface EisenhowerTask {
  id: string;
  title: string;
  priority: string | null;
  due_date: string | null;
  category_id: string;
  is_completed: boolean | null;
  column_id: string;
}

type Quadrant = "do" | "schedule" | "delegate" | "eliminate";

function classifyTask(task: EisenhowerTask): Quadrant {
  const isUrgent = task.due_date 
    ? isBefore(parseISO(task.due_date), addDays(new Date(), 3))
    : false;
  const isImportant = task.priority === "high" || task.priority === "medium";
  
  if (isUrgent && isImportant) return "do";
  if (!isUrgent && isImportant) return "schedule";
  if (isUrgent && !isImportant) return "delegate";
  return "eliminate";
}

const QUADRANTS = {
  do: { 
    label: "Fazer Agora", 
    subtitle: "Urgente + Importante",
    icon: Zap, 
    bgClass: "bg-destructive/5 border-destructive/30",
    headerClass: "bg-destructive/10 text-destructive",
    iconColor: "text-destructive"
  },
  schedule: { 
    label: "Agendar", 
    subtitle: "Importante, não urgente",
    icon: Calendar, 
    bgClass: "bg-primary/5 border-primary/30",
    headerClass: "bg-primary/10 text-primary",
    iconColor: "text-primary"
  },
  delegate: { 
    label: "Delegar", 
    subtitle: "Urgente, não importante",
    icon: AlertTriangle, 
    bgClass: "bg-orange-500/5 border-orange-500/30",
    headerClass: "bg-orange-500/10 text-orange-600",
    iconColor: "text-orange-500"
  },
  eliminate: { 
    label: "Eliminar", 
    subtitle: "Nem urgente, nem importante",
    icon: Archive, 
    bgClass: "bg-muted/50 border-muted-foreground/20",
    headerClass: "bg-muted text-muted-foreground",
    iconColor: "text-muted-foreground"
  },
} as const;

function DraggableTask({ task }: { task: EisenhowerTask }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const isOverdue = task.due_date && isBefore(parseISO(task.due_date), new Date());

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-card border shadow-sm cursor-grab active:cursor-grabbing touch-none transition-all hover:shadow-md",
        isDragging && "opacity-40",
        isOverdue && "ring-1 ring-destructive/50"
      )}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <span className="truncate flex-1 font-medium">{task.title}</span>
      {task.due_date && (
        <span className={cn("text-[10px] flex items-center gap-0.5 flex-shrink-0", isOverdue ? "text-destructive" : "text-muted-foreground")}>
          <Clock className="h-2.5 w-2.5" />
          {formatDateShortBR(task.due_date)}
        </span>
      )}
    </div>
  );
}

function DroppableQuadrant({ quadrant, tasks }: { quadrant: Quadrant; tasks: EisenhowerTask[] }) {
  const config = QUADRANTS[quadrant];
  const Icon = config.icon;
  const { isOver, setNodeRef } = useDroppable({ id: quadrant });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border-2 transition-all min-h-[200px]",
        config.bgClass,
        isOver && "ring-2 ring-primary scale-[1.01]"
      )}
    >
      <div className={cn("flex items-center gap-2 px-4 py-3 rounded-t-xl", config.headerClass)}>
        <Icon className={cn("h-5 w-5", config.iconColor)} />
        <div>
          <h3 className="font-bold text-sm">{config.label}</h3>
          <p className="text-[10px] opacity-70">{config.subtitle}</p>
        </div>
        <Badge variant="outline" className="ml-auto text-[10px]">{tasks.length}</Badge>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(50vh-80px)]">
        {tasks.map(task => (
          <DraggableTask key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8 opacity-50">
            Arraste tarefas aqui
          </p>
        )}
      </div>
    </div>
  );
}

function Eisenhower() {
  const { toggleTheme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<EisenhowerTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["eisenhower-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, priority, due_date, category_id, is_completed, column_id")
        .eq("user_id", user.id)
        .or("is_completed.is.null,is_completed.eq.false");
      if (error) throw error;
      return (data || []) as EisenhowerTask[];
    },
    enabled: !!user?.id,
  });

  const grouped = useMemo(() => {
    const result: Record<Quadrant, EisenhowerTask[]> = { do: [], schedule: [], delegate: [], eliminate: [] };
    tasks.forEach(t => result[classifyTask(t)].push(t));
    return result;
  }, [tasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTask(event.active.data.current?.task || null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    
    const targetQuadrant = over.id as Quadrant;
    const task = active.data.current?.task as EisenhowerTask;
    if (!task) return;

    const currentQuadrant = classifyTask(task);
    if (currentQuadrant === targetQuadrant) return;

    // Map quadrant to priority + due_date adjustments
    const updates: Record<string, unknown> = {};
    if (targetQuadrant === "do") {
      updates.priority = "high";
      if (!task.due_date || !isBefore(parseISO(task.due_date), addDays(new Date(), 3))) {
        updates.due_date = new Date().toISOString();
      }
    } else if (targetQuadrant === "schedule") {
      updates.priority = "high";
      if (task.due_date && isBefore(parseISO(task.due_date), addDays(new Date(), 3))) {
        updates.due_date = addDays(new Date(), 7).toISOString();
      }
    } else if (targetQuadrant === "delegate") {
      updates.priority = "low";
      if (!task.due_date || !isBefore(parseISO(task.due_date), addDays(new Date(), 3))) {
        updates.due_date = new Date().toISOString();
      }
    } else {
      updates.priority = "low";
      updates.due_date = null;
    }

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", task.id);

    if (error) {
      toast({ title: "Erro ao mover tarefa", variant: "destructive" });
    } else {
      toast({ title: `Tarefa movida para "${QUADRANTS[targetQuadrant].label}"` });
      queryClient.invalidateQueries({ queryKey: ["eisenhower-tasks"] });
    }
  }, [toast, queryClient]);

  if (isLoading) return <KanbanLoadingSkeleton />;

  return (
    <div className="flex h-screen pt-14 md:pt-0">
      <Sidebar onExport={() => {}} onImport={() => {}} onThemeToggle={toggleTheme} />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Matriz Eisenhower</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Arraste tarefas entre quadrantes para reclassificá-las. A classificação é baseada em prioridade + prazo.
          </p>
        </div>

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DroppableQuadrant quadrant="do" tasks={grouped.do} />
            <DroppableQuadrant quadrant="schedule" tasks={grouped.schedule} />
            <DroppableQuadrant quadrant="delegate" tasks={grouped.delegate} />
            <DroppableQuadrant quadrant="eliminate" tasks={grouped.eliminate} />
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-card border shadow-xl ring-2 ring-primary/30">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate font-medium">{activeTask.title}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}

export default Eisenhower;
