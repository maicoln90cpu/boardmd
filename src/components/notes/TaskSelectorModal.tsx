import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2, Clock, AlertCircle, Plus, ArrowLeft } from "lucide-react";
import { Task } from "@/hooks/tasks/useTasks";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onCreateTask?: (taskData: { title: string; description?: string; priority: string }) => Promise<Task | null>;
}

type ViewMode = 'list' | 'create';

export function TaskSelectorModal({
  open,
  onOpenChange,
  tasks,
  onSelectTask,
  onCreateTask,
}: TaskSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state para nova tarefa
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");

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
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearchTerm("");
    setViewMode('list');
    resetForm();
  };

  const resetForm = () => {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("medium");
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !onCreateTask) return;
    
    setIsCreating(true);
    try {
      const newTask = await onCreateTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        priority: newTaskPriority,
      });
      
      if (newTask) {
        onSelectTask(newTask);
        handleClose();
      }
    } finally {
      setIsCreating(false);
    }
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {viewMode === 'create' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setViewMode('list')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {viewMode === 'list' ? 'Inserir Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
          <DialogDescription>
            {viewMode === 'list' 
              ? 'Selecione uma tarefa existente ou crie uma nova'
              : 'Crie uma nova tarefa para inserir na nota'}
          </DialogDescription>
        </DialogHeader>

        {viewMode === 'list' ? (
          <>
            {/* Busca e botão criar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {onCreateTask && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode('create')}
                  title="Criar nova tarefa"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Lista de tarefas */}
            <ScrollArea className="flex-1 max-h-[400px] -mx-6 px-6">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{searchTerm ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa disponível"}</p>
                  {onCreateTask && (
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => {
                        if (searchTerm) setNewTaskTitle(searchTerm);
                        setViewMode('create');
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Criar nova tarefa
                    </Button>
                  )}
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
            <div className="flex justify-between gap-2 pt-4 border-t">
              {onCreateTask && (
                <Button variant="outline" onClick={() => setViewMode('create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Tarefa
                </Button>
              )}
              <Button variant="ghost" onClick={handleClose} className="ml-auto">
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Formulário de criação */}
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="task-title">Título *</Label>
                <Input
                  id="task-title"
                  placeholder="Digite o título da tarefa..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">Descrição</Label>
                <Textarea
                  id="task-description"
                  placeholder="Descrição opcional..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-priority">Prioridade</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Baixa
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Média
                      </span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Alta
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setViewMode('list')}>
                Voltar
              </Button>
              <Button
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim() || isCreating}
              >
                {isCreating ? "Criando..." : "Criar e Inserir"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
