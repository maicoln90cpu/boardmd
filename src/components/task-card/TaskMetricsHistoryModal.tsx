import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, BarChart3, TrendingUp, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useTaskCompletionLogs, TaskCompletionLog } from "@/hooks/useTaskCompletionLogs";
import { formatDateTimeBR } from "@/lib/dateUtils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO, subDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";

interface TaskMetricsHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

type DateFilter = "7" | "30" | "all";

export const TaskMetricsHistoryModal: React.FC<TaskMetricsHistoryModalProps> = ({
  open,
  onOpenChange,
  taskId,
  taskTitle,
}) => {
  const { logs, loading, fetchLogs, deleteLog, getStats, getMetricLabel } = useTaskCompletionLogs(taskId);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  useEffect(() => {
    if (open && taskId) {
      fetchLogs(taskId);
    }
  }, [open, taskId, fetchLogs]);

  // Filter logs by date range
  const filteredLogs = useMemo(() => {
    if (dateFilter === "all") return logs;
    
    const now = new Date();
    const daysAgo = parseInt(dateFilter);
    const cutoffDate = subDays(now, daysAgo);
    
    return logs.filter(log => isAfter(parseISO(log.completed_at), cutoffDate));
  }, [logs, dateFilter]);

  // Calculate stats from filtered logs
  const stats = useMemo(() => {
    const totalDays = filteredLogs.length;
    const metricsWithValue = filteredLogs.filter(log => log.metric_value !== null);
    const sumMetric = metricsWithValue.reduce((sum, log) => sum + (log.metric_value || 0), 0);
    const avgMetric = metricsWithValue.length > 0 ? sumMetric / metricsWithValue.length : 0;
    return { totalDays, sumMetric, avgMetric };
  }, [filteredLogs]);

  const metricInfo = logs.length > 0 && logs[0].metric_type 
    ? getMetricLabel(logs[0].metric_type) 
    : { name: "Valor", unit: "", icon: "📊" };

  // Prepare chart data (reverse to show oldest first)
  const chartData = useMemo(() => {
    return [...filteredLogs]
      .filter(log => log.metric_value !== null)
      .reverse()
      .map(log => ({
        date: format(parseISO(log.completed_at), "dd/MM", { locale: ptBR }),
        fullDate: format(parseISO(log.completed_at), "dd/MM/yyyy", { locale: ptBR }),
        value: log.metric_value || 0,
      }));
  }, [filteredLogs]);

  const handleDelete = async (logId: string) => {
    await deleteLog(logId);
  };

  const hasChartData = chartData.length >= 2;

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Data", metricInfo.name, "Comentário"];
    const rows = filteredLogs.map(log => [
      format(parseISO(log.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      log.metric_value !== null ? `${log.metric_value}` : "",
      log.comment || "",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(";")),
      "",
      `"Total de dias:";${stats.totalDays}`,
      `"Soma:";${stats.sumMetric.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${metricInfo.unit}`,
      `"Média:";${stats.avgMetric.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${metricInfo.unit}/dia`,
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `metricas-${taskTitle.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Histórico de Métricas: ${taskTitle}`, 14, 20);
    
    // Date filter info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const filterText = dateFilter === "all" ? "Todos os registros" : `Últimos ${dateFilter} dias`;
    doc.text(`Período: ${filterText}`, 14, 28);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 34);
    
    // Statistics
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo", 14, 46);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`• Dias concluídos: ${stats.totalDays}`, 14, 54);
    doc.text(`• Soma total: ${stats.sumMetric.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${metricInfo.unit}`, 14, 60);
    doc.text(`• Média por dia: ${stats.avgMetric.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${metricInfo.unit}`, 14, 66);
    
    // Table header
    let yPos = 80;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Data", 14, yPos);
    doc.text(metricInfo.name, 60, yPos);
    doc.text("Comentário", 100, yPos);
    
    // Table rows
    doc.setFont("helvetica", "normal");
    yPos += 8;
    
    filteredLogs.forEach((log, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(format(parseISO(log.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR }), 14, yPos);
      doc.text(log.metric_value !== null ? `${log.metric_value} ${metricInfo.unit}` : "-", 60, yPos);
      
      const comment = log.comment || "-";
      const truncatedComment = comment.length > 40 ? comment.substring(0, 40) + "..." : comment;
      doc.text(truncatedComment, 100, yPos);
      
      yPos += 6;
    });
    
    doc.save(`metricas-${taskTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Histórico: {taskTitle}
            </DialogTitle>
            
            {filteredLogs.length > 0 && (
              <div className="flex items-center gap-2">
                {/* Date Filter */}
                <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Export Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Exportar</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportToCSV}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToPDF}>
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
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
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum registro no período selecionado</p>
            <p className="text-sm">Tente selecionar um período maior</p>
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
                  {filteredLogs.map((log: TaskCompletionLog) => (
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