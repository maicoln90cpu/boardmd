import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task } from "@/hooks/useTasks";
import { Label } from "@/components/ui/label";
import { useCategories } from "@/hooks/useCategories";
import { SubtasksEditor } from "@/components/kanban/SubtasksEditor";
import { RecurrenceEditor } from "@/components/kanban/RecurrenceEditor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Partial<Task>) => void;
  task?: Task | null;
  columnId: string;
  isDailyKanban?: boolean;
  viewMode?: string;
  categoryId?: string;
  columns?: Array<{ id: string; name: string }>;
}

export function TaskModal({ open, onOpenChange, onSave, task, columnId, isDailyKanban = false, viewMode, categoryId, columns }: TaskModalProps) {
  const { categories } = useCategories();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [tags, setTags] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [subtasks, setSubtasks] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [recurrence, setRecurrence] = useState<{ frequency: 'daily' | 'weekly' | 'monthly'; interval: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority || "medium");
      setSelectedCategory(task.category_id || "");
      setSubtasks(task.subtasks || []);
      setRecurrence(task.recurrence_rule);
      
      if (task.due_date) {
        const date = new Date(task.due_date);
        setDueDate(date.toISOString().split("T")[0]);
        setDueTime(date.toTimeString().slice(0, 5));
      } else {
        setDueDate("");
        setDueTime("");
      }
      
      setTags(task.tags?.join(", ") || "");
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setSubtasks([]);
      setRecurrence(null);
      // Se for Kanban Diário, data padrão é hoje
      if (isDailyKanban) {
        const today = new Date().toISOString().split("T")[0];
        setDueDate(today);
      } else {
        setDueDate("");
      }
      setDueTime("");
      setTags("");
      setSelectedCategory(categoryId || "");
    }
  }, [task, open, categoryId, isDailyKanban]);

  const handleSave = async () => {
    if (!title.trim()) return;
    
    let dueDateTimestamp: string | null = null;
    
    if (dueDate) {
      if (isDailyKanban) {
        if (dueTime) {
          // Salvar com data e hora em ISO
          const local = new Date(`${dueDate}T${dueTime}`);
          dueDateTimestamp = local.toISOString();
        } else if (task?.due_date) {
          // Preserva horário original ao editar
          dueDateTimestamp = task.due_date;
        } else {
          // Novo card sem horário - usar 00:00
          const local = new Date(`${dueDate}T00:00`);
          dueDateTimestamp = local.toISOString();
        }
      } else {
        // Kanban Projetos - salvar data com 00:00
        const local = new Date(`${dueDate}T00:00`);
        dueDateTimestamp = local.toISOString();
      }
    }
    
    let finalColumnId = columnId;
    let finalCategoryId = selectedCategory || categoryId;
    
    // Auto-mover para Kanban Diário e coluna Recorrente se ativou recorrência pela primeira vez
    if (recurrence && !task?.recurrence_rule) {
      const { data: dailyCategory } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", "diário")
        .maybeSingle();

      if (dailyCategory && categoryId !== dailyCategory.id) {
        // Se está em outra categoria (não Diário), criar ESPELHO no Diário
        const { data: recurrentColumn } = await supabase
          .from("columns")
          .select("id")
          .ilike("name", "recorrente")
          .maybeSingle();

        if (recurrentColumn) {
          // 1. Salvar tarefa original (mantém no lugar)
          const taskData: Partial<Task> = {
            title,
            description: description || null,
            priority,
            due_date: dueDateTimestamp,
            tags: tags ? tags.split(",").map((t) => t.trim()) : null,
            column_id: finalColumnId,
            position: task?.position ?? 0,
            category_id: finalCategoryId,
            subtasks,
            recurrence_rule: recurrence,
          };
          
          onSave(taskData);

          // 2. Criar CÓPIA espelhada no Diário/Recorrente
          const mirroredTask = {
            ...taskData,
            category_id: dailyCategory.id,
            column_id: recurrentColumn.id,
            tags: [...(taskData.tags || []), "espelho-diário"]
          };

          const { error: mirrorError } = await supabase
            .from("tasks")
            .insert([mirroredTask as any]);

          if (!mirrorError) {
            toast({
              title: "🔄 Tarefa recorrente espelhada!",
              description: "A tarefa permanece aqui e também aparece no Kanban Diário na coluna Recorrente.",
              duration: 5000,
            });
          }

          onOpenChange(false);
          return;
        }
      } else if (dailyCategory && categoryId === dailyCategory.id) {
        // Se já está no Diário, apenas mover para Recorrente
        const { data: recurrentColumn } = await supabase
          .from("columns")
          .select("id")
          .ilike("name", "recorrente")
          .maybeSingle();

        if (recurrentColumn) {
          finalCategoryId = dailyCategory.id;
          finalColumnId = recurrentColumn.id;
          
          toast({
            title: "🔄 Tarefa recorrente criada!",
            description: "Sua tarefa foi movida para a coluna Recorrente. Ela não será resetada automaticamente.",
            duration: 5000,
          });
        }
      }
    }
    
    const taskData: Partial<Task> = {
      title,
      description: description || null,
      priority,
      due_date: dueDateTimestamp,
      tags: tags ? tags.split(",").map((t) => t.trim()) : null,
      column_id: finalColumnId,
      position: task?.position ?? 0,
      category_id: finalCategoryId,
      subtasks,
      recurrence_rule: recurrence,
    };

    onSave(taskData);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isTextArea = target.tagName.toLowerCase() === "textarea";
    
    // Ctrl+Enter sempre salva
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSave();
      return;
    }
    
    // Enter simples salva se não estiver em textarea
    if (e.key === "Enter" && !isTextArea) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[600px] max-h-[90vh] overflow-y-auto" aria-describedby="task-modal-description" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>
        <p id="task-modal-description" className="sr-only">
          {task ? "Formulário para editar uma tarefa existente" : "Formulário para criar uma nova tarefa"}
        </p>
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição detalhada"
              rows={3}
            />
          </div>

          {viewMode === "all" && (
            <div>
              <Label>Categoria</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(cat => cat.name !== "Diário")
                    .map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{isDailyKanban ? "Data" : "Data de Entrega"}</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1"
                />
                {isDailyKanban && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDueDate(new Date().toISOString().split("T")[0])}
                  >
                    Hoje
                  </Button>
                )}
              </div>
            </div>
          </div>

          {isDailyKanban && (
            <div>
              <Label>Horário</Label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ex: urgente, cliente, bug"
            />
          </div>

          <SubtasksEditor subtasks={subtasks} onChange={setSubtasks} />

          <RecurrenceEditor recurrence={recurrence} onChange={setRecurrence} />

          <Button 
            onClick={handleSave} 
            className="w-full" 
            disabled={!title.trim() || (viewMode === "all" && !selectedCategory)}
          >
            {task ? "Atualizar" : "Criar"} Tarefa
            <span className="ml-2 text-xs opacity-60">(Ctrl+Enter)</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
