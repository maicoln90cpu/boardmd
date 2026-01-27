import React, { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, BarChart3, TrendingUp } from "lucide-react";
import { useTaskCompletionLogs, TaskCompletionLog } from "@/hooks/useTaskCompletionLogs";
import { formatDateTimeBR } from "@/lib/dateUtils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  // Prepare chart data (reverse to show oldest first)
  const chartData = useMemo(() => {
    return [...logs]
      .filter(log => log.metric_value !== null)
      .reverse()
      .map(log => ({
        date: format(parseISO(log.completed_at), "dd/MM", { locale: ptBR }),
        fullDate: format(parseISO(log.completed_at), "dd/MM/yyyy", { locale: ptBR }),
        value: log.metric_value || 0,
      }));
  }, [logs]);

  const handleDelete = async (logId: string) => {
    await deleteLog(logId);
  };

  const hasChartData = chartData.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
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
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Chart Section */}
            {hasChartData && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Evolução ({metricInfo.unit})</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value} ${metricInfo.unit}`, metricInfo.name]}
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return item?.fullDate || label;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorMetric)"
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Table Section */}
            <ScrollArea className="flex-1 max-h-[250px]">
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
            <div className="border-t pt-4">
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};