import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, Calendar, CalendarDays, Loader2 } from "lucide-react";
import { generateProductivityReport, downloadReport } from "@/lib/export/reportGenerator";
import { toast } from "sonner";
import { format } from "date-fns";

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

interface ReportExportButtonProps {
  tasks: Task[];
  categories: Category[];
  stats: UserStats | null;
}

export function ReportExportButton({ tasks, categories, stats }: ReportExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (period: "weekly" | "monthly") => {
    setIsExporting(true);
    try {
      const blob = await generateProductivityReport({
        tasks,
        categories,
        stats,
        period,
      });

      const periodLabel = period === "weekly" ? "semanal" : "mensal";
      const filename = `relatorio-${periodLabel}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      
      downloadReport(blob, filename);
      
      toast.success(`Relatório ${periodLabel} exportado!`, {
        description: "O arquivo PDF foi baixado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      toast.error("Erro ao exportar relatório", {
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          Exportar Relatório
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("weekly")}>
          <Calendar className="h-4 w-4 mr-2" />
          Relatório Semanal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("monthly")}>
          <CalendarDays className="h-4 w-4 mr-2" />
          Relatório Mensal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
