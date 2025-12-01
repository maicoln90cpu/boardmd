import { useTaskHistory } from "@/hooks/useTaskHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Edit, Trash2, Plus, MoveRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Json } from "@/integrations/supabase/types";

interface ActivityHistoryProps {
  taskId: string | null;
}

export function ActivityHistory({ taskId }: ActivityHistoryProps) {
  const { history, loading } = useTaskHistory(taskId);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created": return Plus;
      case "updated": return Edit;
      case "deleted": return Trash2;
      case "moved": return MoveRight;
      default: return Clock;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "created": return "Criada";
      case "updated": return "Atualizada";
      case "deleted": return "Deletada";
      case "moved": return "Movida";
      default: return action;
    }
  };

  const formatChanges = (changes: Json) => {
    if (!changes || typeof changes !== 'object') return "Sem mudanças registradas";
    
    const obj = changes as Record<string, any>;
    const entries = Object.entries(obj);
    if (entries.length === 0) return "Sem mudanças registradas";

    return entries.map(([key, value]) => {
      if (key === "from" || key === "to") return null;
      return `${key}: ${JSON.stringify(value)}`;
    }).filter(Boolean).join(", ");
  };

  if (!taskId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Histórico de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecione uma tarefa para ver o histórico
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Histórico de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <ListLoadingSkeleton count={3} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Histórico de Atividades</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => {
                const Icon = getActionIcon(entry.action);
                return (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="p-2 rounded-full bg-muted">
                        <Icon className="h-3 w-3" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {getActionLabel(entry.action)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatChanges(entry.changes)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), "PPp", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
