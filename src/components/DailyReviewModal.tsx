import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Sun,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Task } from "@/hooks/useTasks";
import { formatRelativeDateBR } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

interface DailyReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onNavigateToTask?: (taskId: string) => void;
}

export function DailyReviewModal({ 
  open, 
  onOpenChange, 
  tasks,
  onNavigateToTask 
}: DailyReviewModalProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Tarefas pendentes de ontem (vencidas e não completadas)
  const overdueFromYesterday = useMemo(() => {
    return tasks.filter(task => {
      if (task.is_completed) return false;
      if (!task.due_date) return false;
      
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate < today;
    }).sort((a, b) => {
      const dateA = new Date(a.due_date!).getTime();
      const dateB = new Date(b.due_date!).getTime();
      return dateA - dateB;
    });
  }, [tasks, today]);

  // Tarefas vencendo hoje
  const dueToday = useMemo(() => {
    return tasks.filter(task => {
      if (task.is_completed) return false;
      if (!task.due_date) return false;
      
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate.getTime() === today.getTime();
    }).sort((a, b) => {
      // Ordenar por hora
      const timeA = new Date(a.due_date!).getHours() * 60 + new Date(a.due_date!).getMinutes();
      const timeB = new Date(b.due_date!).getHours() * 60 + new Date(b.due_date!).getMinutes();
      return timeA - timeB;
    });
  }, [tasks, today]);

  // Sugestão de priorização: alta prioridade primeiro, depois por data
  const prioritySuggestions = useMemo(() => {
    const pendingTasks = tasks.filter(task => 
      !task.is_completed && 
      task.due_date && 
      new Date(task.due_date) >= today
    );
    
    return pendingTasks
      .sort((a, b) => {
        // Primeiro por prioridade (high > medium > low)
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const prioA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
        const prioB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
        
        if (prioA !== prioB) return prioA - prioB;
        
        // Depois por data
        return new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
      })
      .slice(0, 5); // Top 5 sugestões
  }, [tasks, today]);

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">Média</Badge>;
      case 'low':
        return <Badge variant="secondary" className="text-xs">Baixa</Badge>;
      default:
        return null;
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const totalPending = overdueFromYesterday.length + dueToday.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sun className="h-6 w-6 text-amber-500" />
            Bom dia! Revisão Diária
          </DialogTitle>
          <DialogDescription>
            {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 pb-4">
            {/* Resumo rápido */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Atrasadas</span>
                </div>
                <p className="text-2xl font-bold text-destructive mt-1">
                  {overdueFromYesterday.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-600">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Vencem Hoje</span>
                </div>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {dueToday.length}
                </p>
              </div>
            </div>

            {/* Tarefas atrasadas */}
            {overdueFromYesterday.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="font-semibold text-destructive">Pendentes de Dias Anteriores</h3>
                </div>
                <div className="space-y-2">
                  {overdueFromYesterday.slice(0, 5).map(task => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => {
                        onNavigateToTask?.(task.id);
                        onOpenChange(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Venceu em {formatRelativeDateBR(task.due_date!)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(task.priority)}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {overdueFromYesterday.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      + {overdueFromYesterday.length - 5} outras tarefas atrasadas
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tarefas de hoje */}
            {dueToday.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <h3 className="font-semibold text-amber-600">Para Hoje</h3>
                </div>
                <div className="space-y-2">
                  {dueToday.map(task => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => {
                        onNavigateToTask?.(task.id);
                        onOpenChange(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(task.due_date!)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(task.priority)}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sugestões de priorização */}
            {prioritySuggestions.length > 0 && totalPending === 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Foco Sugerido</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Nenhuma tarefa atrasada! Aqui estão as próximas prioridades:
                </p>
                <div className="space-y-2">
                  {prioritySuggestions.map((task, index) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => {
                        onNavigateToTask?.(task.id);
                        onOpenChange(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{task.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {task.due_date && formatRelativeDateBR(task.due_date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(task.priority)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tudo em dia! */}
            {totalPending === 0 && prioritySuggestions.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold text-lg">Tudo em dia!</h3>
                <p className="text-muted-foreground mt-1">
                  Você não tem tarefas pendentes ou atrasadas.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator className="my-2" />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Começar o Dia
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
