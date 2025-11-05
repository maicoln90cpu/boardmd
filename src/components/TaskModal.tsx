import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task } from "@/hooks/useTasks";
import { Label } from "@/components/ui/label";

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Partial<Task>) => void;
  task?: Task | null;
  columnId: string;
  isDailyKanban?: boolean;
}

export function TaskModal({ open, onOpenChange, onSave, task, columnId, isDailyKanban = false }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority || "medium");
      
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
      setDueDate("");
      setDueTime("");
      setTags("");
    }
  }, [task, open]);

  const handleSave = () => {
    let dueDateTimestamp = null;
    
    if (dueDate) {
      if (isDailyKanban && dueTime) {
        dueDateTimestamp = `${dueDate}T${dueTime}:00`;
      } else {
        dueDateTimestamp = dueDate;
      }
    }
    
    const taskData: Partial<Task> = {
      title,
      description: description || null,
      priority,
      due_date: dueDateTimestamp,
      tags: tags ? tags.split(",").map((t) => t.trim()) : null,
      column_id: columnId,
      position: task?.position ?? 0,
    };

    onSave(taskData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="task-modal-description">
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
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {isDailyKanban && dueDate && (
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

          <Button onClick={handleSave} className="w-full" disabled={!title.trim()}>
            {task ? "Atualizar" : "Criar"} Tarefa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
