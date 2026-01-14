import jsPDF from "jspdf";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  is_completed?: boolean | null;
  priority?: string | null;
  due_date?: string | null;
  updated_at: string;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

interface UserStats {
  level?: number;
  total_points?: number;
  current_streak?: number;
  best_streak?: number;
  tasks_completed_today?: number;
  tasks_completed_week?: number;
}

interface ReportData {
  tasks: Task[];
  categories: Category[];
  stats: UserStats | null;
  period: "weekly" | "monthly";
}

export async function generateProductivityReport({
  tasks,
  categories,
  stats,
  period,
}: ReportData): Promise<Blob> {
  const doc = new jsPDF();
  const now = new Date();
  
  // Definir período
  const periodStart = period === "weekly" 
    ? startOfWeek(now, { weekStartsOn: 1 })
    : startOfMonth(now);
  const periodEnd = period === "weekly"
    ? endOfWeek(now, { weekStartsOn: 1 })
    : endOfMonth(now);

  const periodLabel = period === "weekly" ? "Semanal" : "Mensal";
  const periodRange = `${format(periodStart, "dd/MM/yyyy")} - ${format(periodEnd, "dd/MM/yyyy")}`;

  // Filtrar tarefas do período
  const tasksInPeriod = tasks.filter((task) => {
    const updatedAt = new Date(task.updated_at);
    return updatedAt >= periodStart && updatedAt <= periodEnd;
  });

  const completedInPeriod = tasksInPeriod.filter((t) => t.is_completed === true);
  const overdueInPeriod = tasksInPeriod.filter((t) => {
    if (!t.due_date || t.is_completed) return false;
    return new Date(t.due_date) < now;
  });

  // Header
  doc.setFillColor(79, 70, 229); // Primary color (indigo)
  doc.rect(0, 0, 210, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Produtividade", 105, 20, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`${periodLabel} • ${periodRange}`, 105, 32, { align: "center" });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  let yPos = 55;

  // Resumo Geral
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("📊 Resumo Geral", 15, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  // Box de estatísticas
  const boxWidth = 42;
  const boxHeight = 35;
  const startX = 15;
  const gap = 5;

  const statsBoxes = [
    { label: "Tarefas Totais", value: tasksInPeriod.length.toString(), color: [59, 130, 246] },
    { label: "Concluídas", value: completedInPeriod.length.toString(), color: [34, 197, 94] },
    { label: "Em Aberto", value: (tasksInPeriod.length - completedInPeriod.length).toString(), color: [234, 179, 8] },
    { label: "Atrasadas", value: overdueInPeriod.length.toString(), color: [239, 68, 68] },
  ];

  statsBoxes.forEach((box, index) => {
    const x = startX + (boxWidth + gap) * index;
    
    doc.setFillColor(box.color[0], box.color[1], box.color[2]);
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 3, 3, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(box.value, x + boxWidth / 2, yPos + 18, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(box.label, x + boxWidth / 2, yPos + 28, { align: "center" });
  });

  doc.setTextColor(0, 0, 0);
  yPos += boxHeight + 15;

  // Taxa de Conclusão
  const completionRate = tasksInPeriod.length > 0 
    ? Math.round((completedInPeriod.length / tasksInPeriod.length) * 100) 
    : 0;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("📈 Taxa de Conclusão", 15, yPos);
  yPos += 10;

  // Progress bar
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(15, yPos, 180, 8, 2, 2, "F");
  
  const progressWidth = (completionRate / 100) * 180;
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(15, yPos, progressWidth, 8, 2, 2, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${completionRate}%`, 105, yPos + 6, { align: "center" });

  yPos += 20;

  // Por Categoria
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("📂 Por Categoria", 15, yPos);
  yPos += 10;

  const categoryStats = categories.map((cat) => {
    const catTasks = tasksInPeriod.filter((t) => t.category_id === cat.id);
    const catCompleted = catTasks.filter((t) => t.is_completed === true);
    return {
      name: cat.name,
      total: catTasks.length,
      completed: catCompleted.length,
      rate: catTasks.length > 0 ? Math.round((catCompleted.length / catTasks.length) * 100) : 0,
    };
  }).filter((c) => c.total > 0);

  doc.setFontSize(10);
  categoryStats.forEach((cat) => {
    doc.setFont("helvetica", "normal");
    doc.text(`${cat.name}`, 20, yPos);
    doc.text(`${cat.completed}/${cat.total} (${cat.rate}%)`, 180, yPos, { align: "right" });
    yPos += 7;
  });

  yPos += 10;

  // Gamificação (se tiver stats)
  if (stats) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("🎮 Gamificação", 15, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Nível: ${stats.level || 1}`, 20, yPos);
    yPos += 6;
    doc.text(`Pontos Totais: ${stats.total_points || 0}`, 20, yPos);
    yPos += 6;
    doc.text(`Sequência Atual: ${stats.current_streak || 0} dias`, 20, yPos);
    yPos += 6;
    doc.text(`Melhor Sequência: ${stats.best_streak || 0} dias`, 20, yPos);
    yPos += 15;
  }

  // Produtividade diária (mini gráfico de barras)
  if (period === "weekly") {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("📅 Produtividade por Dia", 15, yPos);
    yPos += 10;

    const days = eachDayOfInterval({ start: periodStart, end: periodEnd });
    const barWidth = 22;
    const maxBarHeight = 30;

    const dailyData = days.map((day) => {
      const dayTasks = completedInPeriod.filter((t) => {
        const updatedAt = new Date(t.updated_at);
        return format(updatedAt, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
      });
      return {
        day: format(day, "EEE", { locale: ptBR }),
        count: dayTasks.length,
      };
    });

    const maxCount = Math.max(...dailyData.map((d) => d.count), 1);

    dailyData.forEach((data, index) => {
      const x = 20 + index * (barWidth + 5);
      const barHeight = (data.count / maxCount) * maxBarHeight;
      
      // Bar
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(x, yPos + maxBarHeight - barHeight, barWidth, barHeight, 2, 2, "F");
      
      // Label
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(data.day, x + barWidth / 2, yPos + maxBarHeight + 8, { align: "center" });
      
      // Count
      if (data.count > 0) {
        doc.setTextColor(255, 255, 255);
        doc.text(data.count.toString(), x + barWidth / 2, yPos + maxBarHeight - barHeight + 8, { align: "center" });
      }
    });

    doc.setTextColor(0, 0, 0);
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Gerado em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • TaskFlow`,
    105,
    285,
    { align: "center" }
  );

  return doc.output("blob");
}

export function downloadReport(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
