import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Target, Plus, Trash2, CheckCircle2, Calendar, Trophy, TrendingUp, Zap, Link2 } from "lucide-react";
import { useGoals, Goal } from "@/hooks/useGoals";
import { CircularProgress } from "@/components/ui/circular-progress";
import { differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Switch } from "@/components/ui/switch";

export function GoalsCard() {
  const { goals, activeGoals, completedGoals, isLoading, createGoal, incrementGoal, deleteGoal, getDefaultDates } = useGoals();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [newGoal, setNewGoal] = useState({
    title: "",
    target: 5,
    period: "weekly" as "weekly" | "monthly",
    auto_increment: true,
  });

  // Ranking de metas mais completadas (histórico)
  const goalsRanking = useMemo(() => {
    const completed = goals.filter(g => g.is_completed);
    const titleCounts = completed.reduce((acc, goal) => {
      const baseTitle = goal.title.toLowerCase().trim();
      acc[baseTitle] = (acc[baseTitle] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(titleCounts)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [goals]);

  const handleCreate = async () => {
    if (!newGoal.title.trim()) return;

    const dates = getDefaultDates(newGoal.period);
    await createGoal.mutateAsync({
      title: newGoal.title,
      target: newGoal.target,
      period: newGoal.period,
      auto_increment: newGoal.auto_increment,
      ...dates,
    });

    setNewGoal({ title: "", target: 5, period: "weekly", auto_increment: true });
    setIsOpen(false);
  };

  const handleIncrement = async (goalId: string) => {
    const result = await incrementGoal.mutateAsync(goalId);
    if (result.justCompleted) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10B981', '#34D399', '#6EE7B7', '#FFD700'],
      });
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) return { text: "Expirada", urgent: true };
    if (days === 0) return { text: "Último dia!", urgent: true };
    if (days === 1) return { text: "1 dia", urgent: true };
    if (days <= 3) return { text: `${days} dias`, urgent: true };
    return { text: `${days} dias`, urgent: false };
  };

  const renderGoalCard = (goal: Goal, index: number) => {
    const daysInfo = getDaysRemaining(goal.end_date);
    const percentage = Math.round((goal.current / goal.target) * 100);

    return (
      <motion.div
        key={goal.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ delay: index * 0.1 }}
        className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50 hover:border-primary/30 transition-all"
      >
        <CircularProgress
          value={goal.current}
          max={goal.target}
          size={64}
          strokeWidth={6}
          showPercentage
          showValues
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{goal.title}</p>
            {goal.auto_increment && (
              <Tooltip>
                <TooltipTrigger>
                  <Link2 className="h-3 w-3 text-primary" />
                </TooltipTrigger>
                <TooltipContent>Auto-incrementa com tarefas</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {goal.period === "weekly" ? "Sem" : "Mês"}
            </Badge>
            <span className={`text-xs flex items-center gap-1 ${daysInfo.urgent ? "text-orange-500 font-medium" : "text-muted-foreground"}`}>
              <Calendar className="h-3 w-3" />
              {daysInfo.text}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-green-500/10"
            onClick={() => handleIncrement(goal.id)}
            disabled={goal.is_completed}
          >
            <CheckCircle2 className={`h-5 w-5 ${goal.is_completed ? "text-green-500" : "text-muted-foreground hover:text-green-500"}`} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-destructive/10"
            onClick={() => deleteGoal.mutate(goal.id)}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <Card className="col-span-full lg:col-span-1 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-primary/5 to-transparent">
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
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Criar Nova Meta
              </DialogTitle>
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
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Auto-incrementar
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Incrementa automaticamente ao concluir tarefas
                  </p>
                </div>
                <Switch
                  checked={newGoal.auto_increment}
                  onCheckedChange={(checked) => setNewGoal({ ...newGoal, auto_increment: checked })}
                />
              </div>

              <Button onClick={handleCreate} className="w-full" disabled={createGoal.isPending}>
                <Target className="h-4 w-4 mr-2" />
                Criar Meta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="active" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Ativas ({activeGoals.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Concluídas
            </TabsTrigger>
            <TabsTrigger value="ranking" className="text-xs">
              <Trophy className="h-3 w-3 mr-1" />
              Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-4">
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Carregando metas...
              </div>
            ) : activeGoals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Nenhuma meta ativa</p>
                <p className="text-xs mt-1">Crie uma meta para acompanhar seu progresso</p>
              </div>
            ) : (
              <AnimatePresence>
                {activeGoals.slice(0, 4).map((goal, index) => renderGoalCard(goal, index))}
              </AnimatePresence>
            )}
            {activeGoals.length > 4 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{activeGoals.length - 4} metas adicionais
              </p>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedGoals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma meta concluída ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completedGoals.slice(0, 5).map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm truncate">{goal.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                      {goal.target} ✓
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ranking" className="mt-4">
            {goalsRanking.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Complete metas para ver seu ranking</p>
              </div>
            ) : (
              <div className="space-y-2">
                {goalsRanking.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ${
                      index === 0 ? "bg-yellow-500/20 text-yellow-600" :
                      index === 1 ? "bg-gray-400/20 text-gray-500" :
                      index === 2 ? "bg-amber-600/20 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                    </div>
                    <span className="flex-1 text-sm truncate capitalize">{item.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {item.count}x
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
