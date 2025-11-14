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
import { useAuth } from "@/contexts/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const { user } = useAuth();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
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
          const local = new Date(`${dueDate}T${dueTime}`);
          dueDateTimestamp = local.toISOString();
        } else if (task?.due_date) {
          dueDateTimestamp = task.due_date;
        } else {
          const local = new Date(`${dueDate}T00:00`);
          dueDateTimestamp = local.toISOString();
        }
      } else {
        const local = new Date(`${dueDate}T00:00`);
        dueDateTimestamp = local.toISOString();
      }
    }
    
    let finalColumnId = columnId;
    let finalCategoryId = selectedCategory || categoryId;
    
    // Auto-mover para Kanban Diário e coluna Recorrente se ativou recorrência
    if (recurrence) {
      const { data: dailyCategory } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", "diário")
        .maybeSingle();

      if (dailyCategory && categoryId !== dailyCategory.id) {
        // Se está em outra categoria (não Diário), verificar se precisa criar ESPELHO
        const { data: recurrentColumn } = await supabase
          .from("columns")
          .select("id")
          .ilike("name", "recorrente")
          .maybeSingle();

        if (recurrentColumn) {
          // Preparar dados da tarefa
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

          // Se está editando tarefa existente
          if (task?.id) {
            // Verificar se já tem espelho criado
            const { data: existingMirror } = await (supabase
              .from("tasks")
              .select("id") as any)
              .eq("mirror_task_id", task.id)
              .maybeSingle();

            if (!existingMirror) {
              console.log("[ESPELHAMENTO] Criando espelho para tarefa existente:", task.id);
              // 1. Salvar tarefa original primeiro
              onSave(taskData);

              // 2. Criar CÓPIA espelhada no Diário/Recorrente
              const mirroredTask = {
                ...taskData,
                category_id: dailyCategory.id,
                column_id: recurrentColumn.id,
                tags: [...(taskData.tags || []), "espelho-diário"],
                user_id: task.user_id
              };

              const { data: newMirror, error: mirrorError } = await supabase
                .from("tasks")
                .insert([mirroredTask as any])
                .select()
                .single();

              if (!mirrorError && newMirror) {
                console.log("[ESPELHAMENTO] Espelho criado:", newMirror.id);
                // Atualizar tarefa original com ID do espelho
                await supabase
                  .from("tasks")
                  .update({ mirror_task_id: newMirror.id } as any)
                  .eq("id", task.id);

                // Atualizar espelho com ID da original
                await supabase
                  .from("tasks")
                  .update({ mirror_task_id: task.id } as any)
                  .eq("id", newMirror.id);

                console.log("[ESPELHAMENTO] Referências mútuas criadas");
                toast({
                  title: "🔄 Tarefa recorrente espelhada!",
                  description: "A tarefa permanece aqui e também aparece no Kanban Diário na coluna Recorrente.",
                  duration: 5000,
                });
              }

              onOpenChange(false);
              return;
            }
          } else {
            // Se está criando nova tarefa recorrente, criar ambas diretamente no banco
            console.log("[ESPELHAMENTO] Criando nova tarefa recorrente com espelho");
            if (!user) {
              toast({
                title: "Erro",
                description: "Você precisa estar logado",
                variant: "destructive"
              });
              onOpenChange(false);
              return;
            }

            // 1. Criar tarefa original
            const originalTask = {
              title,
              description: description || null,
              priority,
              due_date: dueDateTimestamp,
              tags: tags ? tags.split(",").map((t) => t.trim()) : [],
              column_id: finalColumnId,
              category_id: finalCategoryId,
              subtasks,
              recurrence_rule: recurrence,
              user_id: user.id,
              position: 0
            };

            const { data: newOriginal, error: originalError } = await supabase
              .from("tasks")
              .insert([originalTask as any])
              .select()
              .single();

            if (originalError || !newOriginal) {
              toast({
                title: "Erro ao criar tarefa",
                variant: "destructive"
              });
              onOpenChange(false);
              return;
            }

            // 2. Criar espelho
            const mirroredTask = {
              title,
              description: description || null,
              priority,
              due_date: dueDateTimestamp,
              tags: [...(tags ? tags.split(",").map((t) => t.trim()) : []), "espelho-diário"],
              column_id: recurrentColumn.id,
              category_id: dailyCategory.id,
              subtasks,
              recurrence_rule: recurrence,
              user_id: user.id,
              position: 0
            };

            const { data: newMirror, error: mirrorError } = await supabase
              .from("tasks")
              .insert([mirroredTask as any])
              .select()
              .single();

            if (!mirrorError && newMirror) {
              console.log("[ESPELHAMENTO] Original e espelho criados:", newOriginal.id, newMirror.id);
              // Atualizar ambas com referências mútuas
              await supabase
                .from("tasks")
                .update({ mirror_task_id: newMirror.id } as any)
                .eq("id", newOriginal.id);

              await supabase
                .from("tasks")
                .update({ mirror_task_id: newOriginal.id } as any)
                .eq("id", newMirror.id);

              console.log("[ESPELHAMENTO] Referências mútuas criadas");
              toast({
                title: "🔄 Tarefa recorrente espelhada!",
                description: "A tarefa foi criada e espelhada no Kanban Diário na coluna Recorrente.",
                duration: 5000,
              });
            }

            onOpenChange(false);
            return;
          }
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
      <DialogContent 
        className={`${isMobile ? 'w-full h-full max-w-full max-h-full rounded-none' : 'w-[calc(100vw-2rem)] max-w-[600px] max-h-[90vh]'} overflow-hidden`}
        aria-describedby="task-modal-description" 
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className={isMobile ? 'px-4 pt-4' : ''}>
          <DialogTitle>{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>
        <p id="task-modal-description" className="sr-only">
          {task ? "Formulário para editar uma tarefa existente" : "Formulário para criar uma nova tarefa"}
        </p>
        
        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Digite o título da tarefa"
                className={isMobile ? 'min-h-[48px] text-base' : ''}
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição (opcional)"
                className={isMobile ? 'min-h-[120px] text-base' : 'min-h-[100px]'}
              />
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className={isMobile ? 'min-h-[48px]' : ''}>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={isMobile ? 'min-h-[48px] text-base' : ''}
              />
            </div>

            {isDailyKanban && (
              <div>
                <Label>Horário (opcional)</Label>
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className={isMobile ? 'min-h-[48px] text-base' : ''}
                />
              </div>
            )}

            <div>
              <Label>Tags</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tag1, Tag2, Tag3"
                className={isMobile ? 'min-h-[48px] text-base' : ''}
              />
            </div>

            {viewMode !== "daily" && (
              <div>
                <Label>Categoria</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className={isMobile ? 'min-h-[48px]' : ''}>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <SubtasksEditor subtasks={subtasks} onChange={setSubtasks} />
            
            <RecurrenceEditor recurrence={recurrence} onChange={setRecurrence} />
          </div>
        </ScrollArea>

        <div className={`flex ${isMobile ? 'flex-col gap-2 px-4 pb-4' : 'justify-end gap-2 px-6 pb-4'} border-t pt-4`}>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className={isMobile ? 'min-h-[48px] order-2' : ''}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            className={isMobile ? 'min-h-[48px] order-1' : ''}
          >
            Salvar
            <span className={isMobile ? 'hidden' : 'ml-2 text-xs opacity-70'}>Ctrl+Enter</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

