import { Task } from "@/hooks/tasks/useTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, ListTodo } from "lucide-react";

interface DashboardStatsProps {
  tasks: Task[];
}

export function DashboardStats({ tasks }: DashboardStatsProps) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.is_completed === true).length;
  const overdue = tasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && !t.is_completed
  ).length;
  const inProgress = total - completed;

  const stats = [
    {
      title: "Total de Tarefas",
      value: total,
      icon: ListTodo,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Em Progresso",
      value: inProgress,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100"
    },
    {
      title: "Concluídas",
      value: completed,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Atrasadas",
      value: overdue,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
