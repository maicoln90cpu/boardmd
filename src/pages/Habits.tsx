import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useHabits } from "@/hooks/useHabits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Flame, Check, Trash2, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];
const ICONS = ["✅", "💪", "📚", "🏃", "💧", "🧘", "✍️", "🎯", "💤", "🥗", "🎵", "💊"];

function HabitConsistencyGrid({ habitId, checkins }: { habitId: string; checkins: Array<{ habit_id: string; checked_date: string }> }) {
  const habitCheckins = checkins
    .filter(c => c.habit_id === habitId)
    .map(c => c.checked_date);

  const days: { date: string; checked: boolean }[] = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({ date: dateStr, checked: habitCheckins.includes(dateStr) });
  }

  // Group into weeks (12 weeks x 7 days)
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="flex gap-0.5">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-0.5">
          {week.map(day => (
            <div
              key={day.date}
              title={day.date}
              className={cn(
                "w-3 h-3 rounded-sm transition-colors",
                day.checked
                  ? "bg-emerald-500 dark:bg-emerald-400"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Habits() {
  const { habits, checkins, loading, addHabit, deleteHabit, toggleCheckin, getStreak, isCheckedToday } = useHabits();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [newIcon, setNewIcon] = useState(ICONS[0]);

  const today = new Date().toISOString().split("T")[0];
  const completedToday = habits.filter(h => isCheckedToday(h.id)).length;
  const totalHabits = habits.length;
  const progress = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addHabit(newName.trim(), newColor, newIcon);
    setNewName("");
    setShowNew(false);
  };

  return (
    <div className="min-h-screen bg-background pt-14 md:pt-0 flex">
      <Sidebar onExport={() => {}} onImport={() => {}} onThemeToggle={() => {}} />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🎯 Hábitos</h1>
              <p className="text-sm text-muted-foreground">Rastreie seus hábitos diários e construa consistência</p>
            </div>
            <Dialog open={showNew} onOpenChange={setShowNew}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Novo Hábito</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Hábito</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Nome do hábito..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAdd()}
                  />
                  <div>
                    <p className="text-sm font-medium mb-2">Ícone</p>
                    <div className="flex gap-2 flex-wrap">
                      {ICONS.map(icon => (
                        <button
                          key={icon}
                          onClick={() => setNewIcon(icon)}
                          className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center text-lg border-2 transition-colors",
                            newIcon === icon ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"
                          )}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Cor</p>
                    <div className="flex gap-2">
                      {COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setNewColor(color)}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-transform",
                            newColor === color ? "border-foreground scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleAdd} className="w-full" disabled={!newName.trim()}>
                    Criar Hábito
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Progress Card */}
          {totalHabits > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso Diário</span>
                  <span className="text-sm text-muted-foreground">{completedToday}/{totalHabits}</span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">{progress}% concluído hoje</p>
              </CardContent>
            </Card>
          )}

          {/* Habits List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : habits.length === 0 ? (
            <EmptyState
              variant="tasks"
              title="Nenhum hábito ainda"
              description="Comece criando um hábito para rastrear diariamente"
            />
          ) : (
            <div className="space-y-3">
              {habits.map(habit => {
                const streak = getStreak(habit.id);
                const checked = isCheckedToday(habit.id);
                return (
                  <Card key={habit.id} className="overflow-hidden">
                    <div className="h-1" style={{ backgroundColor: habit.color }} />
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            onClick={() => { toggleCheckin(habit.id, today); hapticSuccess(); }}
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all shrink-0",
                              checked
                                ? "border-emerald-500 bg-emerald-500/10 scale-110"
                                : "border-muted-foreground/30 hover:border-primary"
                            )}
                          >
                            {checked ? <Check className="h-5 w-5 text-emerald-500" /> : <span>{habit.icon}</span>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className={cn("font-medium", checked && "line-through text-muted-foreground")}>{habit.name}</h3>
                              {streak > 0 && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Flame className="h-3 w-3 text-orange-500" /> {streak}d
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2">
                              <HabitConsistencyGrid habitId={habit.id} checkins={checkins} />
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => deleteHabit(habit.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Habits;
