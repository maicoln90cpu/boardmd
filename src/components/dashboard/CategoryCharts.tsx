import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface Task {
  category_id: string;
  is_completed: boolean | null;
  priority: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface CategoryChartsProps {
  tasks: Task[];
  categories: Category[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

export function CategoryCharts({ tasks, categories }: CategoryChartsProps) {
  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; total: number; completed: number }> = {};
    categories.forEach((c) => {
      map[c.id] = { name: c.name, total: 0, completed: 0 };
    });

    tasks.forEach((t) => {
      if (map[t.category_id]) {
        map[t.category_id].total++;
        if (t.is_completed) map[t.category_id].completed++;
      }
    });

    return Object.values(map)
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [tasks, categories]);

  const priorityData = useMemo(() => {
    const counts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    tasks.forEach((t) => {
      if (!t.is_completed) {
        const p = t.priority || "medium";
        if (counts[p] !== undefined) counts[p]++;
      }
    });
    return [
      { name: "Alta", value: counts.high, color: "#ef4444" },
      { name: "Média", value: counts.medium, color: "#f59e0b" },
      { name: "Baixa", value: counts.low, color: "#22c55e" },
    ].filter((d) => d.value > 0);
  }, [tasks]);

  if (categoryData.length === 0 && priorityData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Distribuição por Categoria e Prioridade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar chart by category */}
          {categoryData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Tarefas por Categoria</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryData.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === "total" ? "Total" : "Concluídas",
                    ]}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="total" />
                  <Bar dataKey="completed" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie chart by priority */}
          {priorityData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Pendentes por Prioridade</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
