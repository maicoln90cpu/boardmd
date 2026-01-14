import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, Plus, Trash2, CheckCircle2, Calendar } from "lucide-react";
import { useGoals, Goal } from "@/hooks/useGoals";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import confetti from "canvas-confetti";

export function GoalsCard() {
  const { activeGoals, isLoading, createGoal, incrementGoal, deleteGoal, getDefaultDates } = useGoals();
  const [isOpen, setIsOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    target: 5,
    period: "weekly" as "weekly" | "monthly",
  });

  const handleCreate = async () => {
    if (!newGoal.title.trim()) return;

    const dates = getDefaultDates(newGoal.period);
    await createGoal.mutateAsync({
      title: newGoal.title,
      target: newGoal.target,
      period: newGoal.period,
      ...dates,
    });

    setNewGoal({ title: "", target: 5, period: "weekly" });
    setIsOpen(false);
  };

  const handleIncrement = async (goalId: string) => {
    const result = await incrementGoal.mutateAsync(goalId);
    if (result.justCompleted) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const getProgressColor = (goal: Goal) => {
    const percentage = (goal.current / goal.target) * 100;
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-emerald-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-primary";
  };

  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) return "Expirada";
    if (days === 0) return "Último dia!";
    if (days === 1) return "1 dia restante";
    return `${days} dias restantes`;
  };

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Metas
        </CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Meta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Título da Meta</Label>
                <Input
                  placeholder="Ex: Completar 10 tarefas"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Objetivo</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newGoal.target}
                    onChange={(e) => setNewGoal({ ...newGoal, target: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select
                    value={newGoal.period}
                    onValueChange={(value: "weekly" | "monthly") => setNewGoal({ ...newGoal, period: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createGoal.isPending}>
                Criar Meta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Carregando metas...
          </div>
        ) : activeGoals.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma meta ativa</p>
            <p className="text-xs mt-1">Crie uma meta para acompanhar seu progresso</p>
          </div>
        ) : (
          activeGoals.slice(0, 3).map((goal) => (
            <div key={goal.id} className="space-y-2 p-3 rounded-lg bg-muted/50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{goal.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {goal.period === "weekly" ? "Semanal" : "Mensal"}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {getDaysRemaining(goal.end_date)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleIncrement(goal.id)}
                    disabled={goal.is_completed}
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => deleteGoal.mutate(goal.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">
                    {goal.current} / {goal.target}
                  </span>
                </div>
                <Progress 
                  value={Math.min((goal.current / goal.target) * 100, 100)} 
                  className="h-2"
                />
              </div>
            </div>
          ))
        )}
        {activeGoals.length > 3 && (
          <p className="text-xs text-center text-muted-foreground">
            +{activeGoals.length - 3} metas adicionais
          </p>
        )}
      </CardContent>
    </Card>
  );
}
