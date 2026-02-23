import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Clock, FileText, X, BarChart3, GraduationCap, Bell, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Task } from "@/hooks/tasks/useTasks";
import { Label } from "@/components/ui/label";
import { useCategories } from "@/hooks/data/useCategories";
import { useColumns } from "@/hooks/data/useColumns";
import { SubtasksEditor } from "@/components/kanban/SubtasksEditor";
import { RecurrenceEditor } from "@/components/kanban/RecurrenceEditor";
import { AISubtasksSuggester } from "@/components/kanban/AISubtasksSuggester";
import { TagSelector } from "@/components/TagSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/useToast";
import { useBreakpoint } from "@/hooks/ui/useBreakpoint";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RecurrenceRule } from "@/lib/recurrenceUtils";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { METRIC_TYPES } from "@/hooks/useTaskCompletionLogs";
import { useCourses } from "@/hooks/useCourses";

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Partial<Task>) => void;
  task?: Task | null;
  columnId: string;
  categoryId?: string;
  columns?: Array<{ id: string; name: string }>;
  defaultDueDate?: Date | null;
}

export function TaskModal({ 
  open, 
  onOpenChange, 
  onSave, 
  task, 
  columnId, 
  categoryId, 
  columns, 
  defaultDueDate 
}: TaskModalProps) {
  const { categories } = useCategories();
  const { columns: allColumns } = useColumns();
  const { courses } = useCourses();
  const navigate = useNavigate();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [subtasks, setSubtasks] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [linkedNotes, setLinkedNotes] = useState<Array<{ id: string; title: string }>>([]);
  const [trackMetrics, setTrackMetrics] = useState(false);
  const [metricType, setMetricType] = useState<string | null>(null);
  const [trackComments, setTrackComments] = useState(false);
  const [linkedCourseId, setLinkedCourseId] = useState<string | null>(null);
  const [customReminders, setCustomReminders] = useState<Array<{ hours_before: number; channel: 'push' | 'whatsapp' | 'both' }>>([]);
  const [useCustomReminders, setUseCustomReminders] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority || "medium");
      setSelectedCategory(task.category_id || "");
      setSelectedColumn(task.column_id || columnId);
      setSubtasks(task.subtasks || []);
      setRecurrence(task.recurrence_rule);
      setTrackMetrics(task.track_metrics || false);
      setMetricType(task.metric_type || null);
      setTrackComments(task.track_comments || false);
      setLinkedCourseId((task as any).linked_course_id || null);
      
      // Carregar notificações personalizadas
      if (task.notification_settings?.reminders?.length) {
        setUseCustomReminders(true);
        setCustomReminders(task.notification_settings.reminders);
      } else {
        setUseCustomReminders(false);
        setCustomReminders([]);
      }
      
      if (task.due_date) {
        const date = new Date(task.due_date);
        setDueDate(date.toISOString().split("T")[0]);
        setDueTime(date.toTimeString().slice(0, 5));
      } else {
        setDueDate("");
        setDueTime("");
      }
      
      // Filtrar tags legadas de espelhamento
      setTags((task.tags || []).filter(t => t !== "espelho-diário"));
      
      // Buscar notas vinculadas à tarefa
      const fetchLinkedNotes = async () => {
        const { data } = await supabase
          .from("notes")
          .select("id, title")
          .eq("linked_task_id", task.id);
        setLinkedNotes(data || []);
      };
      fetchLinkedNotes();
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setSubtasks([]);
      setRecurrence(null);
      setSelectedColumn(columnId);
      setLinkedNotes([]);
      setSelectedCategory(categoryId || "");
      setTrackMetrics(false);
      setMetricType(null);
      setTrackComments(false);
      setLinkedCourseId(null);
      setUseCustomReminders(false);
      setCustomReminders([]);
      
      // Se foi passada uma data padrão (ex: clicou em um dia do calendário)
      if (defaultDueDate) {
        const dateStr = defaultDueDate.toISOString().split("T")[0];
        setDueDate(dateStr);
      } else {
        setDueDate("");
      }
      setDueTime("");
      setTags([]);
    }
  }, [task, open, categoryId, columnId, defaultDueDate]);

  // Validação de categoria
  const isCategoryValid = !!selectedCategory;

  const handleSave = async () => {
    if (!title.trim()) return;
    
    // Validar categoria obrigatória
    if (!selectedCategory) {
      toast({
        title: "Categoria obrigatória",
        description: "Selecione uma categoria para salvar a tarefa.",
        variant: "destructive"
      });
      return;
    }
    
    let dueDateTimestamp: string | null = null;
    
    if (dueDate) {
      if (dueTime) {
        const local = new Date(`${dueDate}T${dueTime}`);
        dueDateTimestamp = local.toISOString();
      } else if (task?.due_date) {
        dueDateTimestamp = task.due_date;
      } else {
        const local = new Date(`${dueDate}T00:00`);
        dueDateTimestamp = local.toISOString();
      }
    }
    
    const finalColumnId = selectedColumn || columnId;
    const finalCategoryId = selectedCategory || categoryId;
    
    // Sistema simplificado: tags são apenas as tags selecionadas pelo usuário
    // A identificação de recorrência é feita pelo campo recurrence_rule, não por tags
    const finalTags = tags.filter(t => t !== "espelho-diário");
    
    const taskData: Partial<Task> & { linked_course_id?: string | null } = {
      title,
      description: description || null,
      priority,
      due_date: dueDateTimestamp,
      tags: finalTags.length > 0 ? finalTags : null,
      column_id: finalColumnId,
      position: task?.position ?? 0,
      category_id: finalCategoryId,
      track_metrics: trackMetrics,
      metric_type: trackMetrics ? metricType : null,
      track_comments: trackComments,
      subtasks,
      recurrence_rule: recurrence,
      linked_course_id: linkedCourseId,
      notification_settings: useCustomReminders && customReminders.length > 0 && dueDate
        ? { reminders: customReminders }
        : null,
    };

    // Notificar se adicionou recorrência
    if (recurrence && !task?.recurrence_rule) {
      toast({
        title: "🔄 Tarefa recorrente configurada!",
        description: "Esta tarefa será resetada automaticamente conforme a regra de recorrência.",
        duration: 4000,
      });
    }

    onSave(taskData);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isTextArea = target.tagName.toLowerCase() === "textarea";
    
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSave();
      return;
    }
    
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
        
        <ScrollArea className="flex-1 px-4 pb-4 max-h-[60vh] overflow-y-auto">
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

            {/* Date & Time Picker */}
            <div className="space-y-3">
              <Label>Data e Horário</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground",
                        isMobile && "min-h-[48px]"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? (
                        format(new Date(dueDate + "T00:00:00"), "dd 'de' MMMM, yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecionar data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover border shadow-lg z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate ? new Date(dueDate + "T00:00:00") : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setDueDate(format(date, "yyyy-MM-dd"));
                        } else {
                          setDueDate("");
                        }
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                    {dueDate && (
                      <div className="p-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-muted-foreground"
                          onClick={() => setDueDate("")}
                        >
                          Limpar data
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className={cn(
                      "pl-10 w-[130px]",
                      isMobile && "min-h-[48px]"
                    )}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Tags</Label>
              <TagSelector
                selectedTags={tags}
                onTagsChange={setTags}
              />
            </div>

            {/* Categoria */}
            <div>
              <Label className={!selectedCategory ? 'text-destructive' : ''}>
                Categoria {!selectedCategory && <span className="text-destructive">*</span>}
              </Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className={cn(
                  isMobile ? 'min-h-[48px]' : '',
                  !selectedCategory && 'border-destructive focus:ring-destructive'
                )}>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((category) => category.name !== "Diário")
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {!selectedCategory && (
                <p className="text-xs text-destructive mt-1">
                  Selecione uma categoria para salvar a tarefa
                </p>
              )}
            </div>

            {/* Coluna */}
            <div>
              <Label>Coluna</Label>
              <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                <SelectTrigger className={isMobile ? 'min-h-[48px]' : ''}>
                  <SelectValue placeholder="Selecione uma coluna" />
                </SelectTrigger>
                <SelectContent>
                  {(columns || allColumns).map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SubtasksEditor subtasks={subtasks} onChange={setSubtasks} />
            
            {/* AI Subtasks Suggester - disponível na criação e edição */}
            <AISubtasksSuggester
              taskTitle={title}
              taskDescription={description}
              existingSubtasks={subtasks}
              onAddSubtasks={setSubtasks}
            />
            
            <RecurrenceEditor recurrence={recurrence} onChange={setRecurrence} />
            
            {/* Lembretes Personalizados - só aparece se tem data */}
            {dueDate && (
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Lembretes personalizados</Label>
                  </div>
                  <Switch
                    checked={useCustomReminders}
                    onCheckedChange={(checked) => {
                      setUseCustomReminders(checked);
                      if (checked && customReminders.length === 0) {
                        setCustomReminders([{ hours_before: 24, channel: 'push' }]);
                      }
                      if (!checked) setCustomReminders([]);
                    }}
                  />
                </div>
                
                {useCustomReminders && (
                  <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                    {customReminders.map((reminder, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0.5}
                          max={168}
                          step={0.5}
                          value={reminder.hours_before}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              setCustomReminders(prev => prev.map((r, i) => 
                                i === index ? { ...r, hours_before: val } : r
                              ));
                            }
                          }}
                          className={cn("w-20", isMobile && "min-h-[48px]")}
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">h antes</span>
                        <Select
                          value={reminder.channel}
                          onValueChange={(val: 'push' | 'whatsapp' | 'both') => {
                            setCustomReminders(prev => prev.map((r, i) =>
                              i === index ? { ...r, channel: val } : r
                            ));
                          }}
                        >
                          <SelectTrigger className={cn("w-[120px]", isMobile && "min-h-[48px]")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="push">Push</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="both">Ambos</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setCustomReminders(prev => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {customReminders.length < 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setCustomReminders(prev => [...prev, { hours_before: 2, channel: 'push' }])}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar lembrete
                      </Button>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Se vazio, usa as configurações globais do sistema
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Rastreamento de Métricas */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Rastreamento de Conclusão</Label>
              </div>
              
              <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="track-metrics" className="text-sm">
                    Rastrear métricas ao concluir
                  </Label>
                  <Switch
                    id="track-metrics"
                    checked={trackMetrics}
                    onCheckedChange={(checked) => {
                      setTrackMetrics(checked);
                      if (!checked) setMetricType(null);
                    }}
                  />
                </div>
                
                {trackMetrics && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo de métrica</Label>
                    <Select value={metricType || ""} onValueChange={setMetricType}>
                      <SelectTrigger className={isMobile ? 'min-h-[48px]' : ''}>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {METRIC_TYPES.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.icon} {m.name} ({m.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="track-comments" className="text-sm">
                    Solicitar comentário ao concluir
                  </Label>
                  <Switch
                    id="track-comments"
                    checked={trackComments}
                    onCheckedChange={setTrackComments}
                  />
                </div>
                
                {(trackMetrics || trackComments) && (
                  <p className="text-xs text-muted-foreground">
                    Ao marcar como concluída, aparecerá um modal para registrar {trackMetrics && "a métrica"}{trackMetrics && trackComments && " e "}{trackComments && "um comentário"}.
                  </p>
                )}
              </div>
            </div>
            
            {/* Curso vinculado */}
            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Curso Vinculado</Label>
              </div>
              <Select 
                value={linkedCourseId || "none"} 
                onValueChange={(val) => setLinkedCourseId(val === "none" ? null : val)}
              >
                <SelectTrigger className={isMobile ? 'min-h-[48px]' : ''}>
                  <SelectValue placeholder="Nenhum curso vinculado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      📚 {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {linkedCourseId && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs p-0 h-auto"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/courses`);
                  }}
                >
                  Ver curso vinculado →
                </Button>
              )}
            </div>
            
            {/* Notas vinculadas (apenas para tarefas existentes) */}
            {task && linkedNotes.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notas Vinculadas
                </Label>
                <div className="flex flex-wrap gap-2">
                  {linkedNotes.map((noteItem) => (
                    <div key={noteItem.id} className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/notes?noteId=${noteItem.id}`);
                        }}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {noteItem.title || "Sem título"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Desvincular nota"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await supabase
                            .from("notes")
                            .update({ linked_task_id: null })
                            .eq("id", noteItem.id);
                          
                          setLinkedNotes(prev => prev.filter(n => n.id !== noteItem.id));
                          window.dispatchEvent(new CustomEvent('task-updated'));
                          
                          toast({
                            title: "Nota desvinculada",
                            description: "A nota foi desvinculada desta tarefa."
                          });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            disabled={!title.trim() || !isCategoryValid}
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
