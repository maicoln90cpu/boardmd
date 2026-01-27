import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, BarChart3 } from "lucide-react";
import { useTaskCompletionLogs, TaskCompletionLog } from "@/hooks/useTaskCompletionLogs";
import { formatDateTimeBR } from "@/lib/dateUtils";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskMetricsHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

export const TaskMetricsHistoryModal: React.FC<TaskMetricsHistoryModalProps> = ({
  open,
  onOpenChange,
  taskId,
  taskTitle,
}) => {
  const { logs, loading, fetchLogs, deleteLog, getStats, getMetricLabel } = useTaskCompletionLogs(taskId);

  useEffect(() => {
    if (open && taskId) {
      fetchLogs(taskId);
    }
  }, [open, taskId, fetchLogs]);

  const stats = getStats();
  const metricInfo = logs.length > 0 && logs[0].metric_type 
    ? getMetricLabel(logs[0].metric_type) 
    : { name: "Valor", unit: "", icon: "📊" };

  const handleDelete = async (logId: string) => {
    await deleteLog(logId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Histórico: {taskTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum registro encontrado</p>
            <p className="text-sm">Complete esta tarefa para começar a rastrear métricas</p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Data</th>
                    <th className="text-right p-2 font-medium">
                      {metricInfo.icon} {metricInfo.name}
                    </th>
                    <th className="text-left p-2 font-medium">Comentário</th>
                    <th className="w-10 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: TaskCompletionLog) => (
                    <tr key={log.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 whitespace-nowrap">
                        {formatDateTimeBR(log.completed_at)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {log.metric_value !== null
                          ? `${log.metric_value} ${metricInfo.unit}`
                          : "-"}
                      </td>
                      <td className="p-2 max-w-[200px] truncate" title={log.comment || ""}>
                        {log.comment || "-"}
                      </td>
                      <td className="p-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(log.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            {/* Statistics Footer */}
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">{stats.totalDays}</p>
                  <p className="text-xs text-muted-foreground">Dias Concluídos</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">
                    {stats.sumMetric.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Soma ({metricInfo.unit || "total"})
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">
                    {stats.avgMetric.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Média ({metricInfo.unit}/dia)
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
