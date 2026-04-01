import { isToday, isBefore, startOfDay, parseISO, isYesterday } from "date-fns";
import { Newspaper, CheckCircle2, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  is_completed: boolean | null;
  priority: string | null;
  updated_at: string;
  column_id: string;
}

interface DailyDigestCardProps {
  tasks: Task[];
}

export function DailyDigestCard({ tasks }: DailyDigestCardProps) {
  const navigate = useNavigate();
  const now = new Date();
  const todayStart = startOfDay(now);

  const digest = useMemo(() => {
    const dueToday = tasks.filter(t => {
      if (!t.due_date || t.is_completed) return false;
      return isToday(parseISO(t.due_date));
    });

    const overdue = tasks.filter(t => {
      if (!t.due_date || t.is_completed) return false;
      return isBefore(parseISO(t.due_date), todayStart);
    });

    const completedYesterday = tasks.filter(t => {
      if (!t.is_completed) return false;
      return isYesterday(parseISO(t.updated_at));
    });

    const completedToday = tasks.filter(t => {
      if (!t.is_completed) return false;
      return isToday(parseISO(t.updated_at));
    });

    return { dueToday, overdue, completedYesterday, completedToday };
  }, [tasks, todayStart]);

  const totalItems = digest.dueToday.length + digest.overdue.length;

  if (totalItems === 0 && digest.completedToday.length === 0 && digest.completedYesterday.length === 0) {
    return null; // Nothing to show
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          Digest do Dia
          {digest.overdue.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {digest.overdue.length} atrasada(s)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overdue */}
        {digest.overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Atrasadas ({digest.overdue.length})
              </span>
            </div>
            <div className="space-y-1">
              {digest.overdue.slice(0, 5).map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 text-sm p-2 rounded-md bg-destructive/10 cursor-pointer hover:bg-destructive/20 transition-colors"
                  onClick={() => navigate("/")}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
                  <span className="truncate flex-1">{task.title}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
              {digest.overdue.length > 5 && (
                <p className="text-xs text-muted-foreground pl-4">
                  +{digest.overdue.length - 5} mais
                </p>
              )}
            </div>
          </div>
        )}

        {/* Due Today */}
        {digest.dueToday.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                Para hoje ({digest.dueToday.length})
              </span>
            </div>
            <div className="space-y-1">
              {digest.dueToday.slice(0, 5).map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 text-sm p-2 rounded-md bg-blue-500/10 cursor-pointer hover:bg-blue-500/20 transition-colors"
                  onClick={() => navigate("/")}
                >
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full flex-shrink-0",
                    task.priority === "high" ? "bg-red-500" :
                    task.priority === "low" ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                  <span className="truncate flex-1">{task.title}</span>
                </div>
              ))}
              {digest.dueToday.length > 5 && (
                <p className="text-xs text-muted-foreground pl-4">
                  +{digest.dueToday.length - 5} mais
                </p>
              )}
            </div>
          </div>
        )}

        {/* Completed Today */}
        {digest.completedToday.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">
                Concluídas hoje ({digest.completedToday.length})
              </span>
            </div>
            <div className="space-y-1">
              {digest.completedToday.slice(0, 3).map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 text-sm p-2 rounded-md bg-green-500/10"
                >
                  <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                  <span className="truncate line-through text-muted-foreground">{task.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Yesterday */}
        {digest.completedYesterday.length > 0 && digest.completedToday.length === 0 && (
          <div className="text-xs text-muted-foreground">
            ✅ {digest.completedYesterday.length} tarefa(s) concluída(s) ontem
          </div>
        )}
      </CardContent>
    </Card>
  );
}
