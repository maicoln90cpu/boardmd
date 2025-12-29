import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, GripVertical, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TaskBlockComponent({ node, updateAttributes, selected }: NodeViewProps) {
  const { taskId, title, isCompleted, priority, dueDate } = node.attrs;

  const handleToggleComplete = () => {
    updateAttributes({ isCompleted: !isCompleted });
    // Nota: A sincronização com o Kanban será implementada na Etapa 4.2
  };

  const getPriorityStyles = () => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20';
      case 'medium':
        return 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20';
      case 'low':
        return 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20';
      default:
        return 'border-l-muted-foreground bg-muted/30';
    }
  };

  const getPriorityBadge = () => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">Média</Badge>;
      case 'low':
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Baixa</Badge>;
      default:
        return null;
    }
  };

  const formatDueDate = () => {
    if (!dueDate) return null;
    try {
      const date = parseISO(dueDate);
      return format(date, "dd MMM", { locale: ptBR });
    } catch {
      return null;
    }
  };

  return (
    <NodeViewWrapper className="my-2">
      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border-l-4 border transition-all cursor-pointer group",
          getPriorityStyles(),
          selected && "ring-2 ring-primary ring-offset-2",
          isCompleted && "opacity-60"
        )}
        contentEditable={false}
      >
        {/* Grip para arrastar */}
        <div className="opacity-0 group-hover:opacity-50 transition-opacity cursor-grab" data-drag-handle>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Checkbox */}
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleToggleComplete}
          className="mt-0.5 h-5 w-5"
        />

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span 
              className={cn(
                "font-medium text-sm",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {title || "Tarefa sem título"}
            </span>
            
            {/* Link para abrir no Kanban (futuro) */}
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
              title="Abrir no Kanban"
              onClick={(e) => {
                e.stopPropagation();
                // Futuro: Navegar para a tarefa no Kanban
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Metadados */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {getPriorityBadge()}
            
            {formatDueDate() && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDueDate()}
              </span>
            )}
            
            {taskId && (
              <span className="text-[10px] text-muted-foreground/50 font-mono">
                #{taskId.slice(0, 6)}
              </span>
            )}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
