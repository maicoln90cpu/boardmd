import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task } from "@/hooks/tasks/useTasks";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp } from "lucide-react";

interface ProductivityChartProps {
  tasks: Task[];
}

export function ProductivityChart({ tasks }: ProductivityChartProps) {
  // Gerar dados dos últimos 7 dias
  const data = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const completed = tasks.filter((task) => {
      if (!task.updated_at || !task.column_id?.includes("done")) return false;
      const updatedAt = new Date(task.updated_at);
      return updatedAt >= dayStart && updatedAt <= dayEnd;
    }).length;

    return {
      day: format(date, "EEE", { locale: ptBR }),
      completed,
      fullDate: format(date, "dd/MM", { locale: ptBR }),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Produtividade (7 dias)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="day" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelFormatter={(label) => {
                const item = data.find(d => d.day === label);
                return item?.fullDate || label;
              }}
            />
            <Bar 
              dataKey="completed" 
              fill="hsl(var(--primary))" 
              radius={[8, 8, 0, 0]}
              name="Tarefas Concluídas"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
