import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Task } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

export function TaskSelectorModal({
  open,
  onOpenChange,
  tasks,
  onSelectTask,
}: TaskSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks;
    const lower = searchTerm.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(lower) ||
        task.description?.toLowerCase().includes(lower)
    );
  }, [tasks, searchTerm]);

  // Agrupar por status
  const pendingTasks = filteredTasks.filter((t) => !t.is_completed);
  const completedTasks = filteredTasks.filter((t) => t.is_completed);

  const getPriorityIcon = (priority: string | null) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      case "medium":
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return null;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    try {
      return format(parseISO(date), "dd MMM", { locale: ptBR });
    } catch {
      return null;
    }
  };

  const handleSelect = (task: Task) => {
    onSelectTask(task);
    onOpenChange(false);
    setSearchTerm("");
  };

  const TaskItem = ({ task }: { task: Task }) => (
    <button
      onClick={() => handleSelect(task)}
      className={cn(
        "w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors",
        task.is_completed && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        {task.is_completed ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
        ) : (
          getPriorityIcon(task.priority)
        )}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-medium text-sm truncate",
              task.is_completed && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.priority && (
              <Badge
                variant={
                  task.priority === "high"
                    ? "destructive"
                    : task.priority === "medium"
                    ? "default"
                    : "secondary"
                }
                className="text-[10px] px-1.5 py-0"
              >
                {task.priority === "high"
                  ? "Alta"
                  : task.priority === "medium"
                  ? "Média"
                  : "Baixa"}
              </Badge>
            )}
            {formatDate(task.due_date) && (
              <span className="text-xs text-muted-foreground">
                {formatDate(task.due_date)}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Inserir Tarefa</DialogTitle>
          <DialogDescription>
            Selecione uma tarefa para inserir como bloco na nota
          </DialogDescription>
        </DialogHeader>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista de tarefas */}
        <ScrollArea className="flex-1 max-h-[400px] -mx-6 px-6">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "Nenhuma tarefa encontrada"
                : "Nenhuma tarefa disponível"}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pendentes */}
              {pendingTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Pendentes ({pendingTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingTasks.map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* Concluídas */}
              {completedTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Concluídas ({completedTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {completedTasks.slice(0, 5).map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                    {completedTasks.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        + {completedTasks.length - 5} tarefas concluídas
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
