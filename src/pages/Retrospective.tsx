import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useWeeklyReviews } from "@/hooks/useWeeklyReviews";
import { useTasks, Task } from "@/hooks/tasks/useTasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Save, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

const MOODS = [
  { value: 1, emoji: "😞", label: "Ruim" },
  { value: 2, emoji: "😐", label: "Regular" },
  { value: 3, emoji: "🙂", label: "Ok" },
  { value: 4, emoji: "😊", label: "Bom" },
  { value: 5, emoji: "🤩", label: "Ótimo" },
];

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${start.toLocaleDateString("pt-BR", opts)} — ${end.toLocaleDateString("pt-BR", opts)}`;
}

function Retrospective() {
  const { reviews, loading, saveReview, getCurrentWeekStart, getReviewForWeek } = useWeeklyReviews();
  const { tasks } = useTasks("all");

  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart);
  const [whatDid, setWhatDid] = useState("");
  const [whatLearned, setWhatLearned] = useState("");
  const [whatImprove, setWhatImprove] = useState("");
  const [nextWeekPlan, setNextWeekPlan] = useState("");
  const [mood, setMood] = useState(3);
  const [saving, setSaving] = useState(false);

  // Load existing review when week changes
  useEffect(() => {
    const review = getReviewForWeek(selectedWeek);
    if (review) {
      setWhatDid(review.what_did);
      setWhatLearned(review.what_learned);
      setWhatImprove(review.what_improve);
      setNextWeekPlan(review.next_week_plan);
      setMood(review.mood || 3);
    } else {
      setWhatDid("");
      setWhatLearned("");
      setWhatImprove("");
      setNextWeekPlan("");
      setMood(3);
    }
  }, [selectedWeek, getReviewForWeek]);

  // Auto-populate "what I did" with completed tasks for the selected week
  const completedThisWeek = useMemo(() => {
    const weekEnd = getWeekEnd(selectedWeek);
    return tasks.filter(t => {
      if (!t.is_completed) return false;
      const updated = t.updated_at?.split("T")[0];
      return updated && updated >= selectedWeek && updated <= weekEnd;
    });
  }, [tasks, selectedWeek]);

  const autoPopulate = () => {
    const items = completedThisWeek.map(t => `• ${t.title}`).join("\n");
    setWhatDid(prev => prev ? prev + "\n" + items : items);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveReview({
      week_start: selectedWeek,
      what_did: whatDid,
      what_learned: whatLearned,
      what_improve: whatImprove,
      next_week_plan: nextWeekPlan,
      mood,
    });
    setSaving(false);
  };

  const navigateWeek = (direction: -1 | 1) => {
    const d = new Date(selectedWeek + "T12:00:00");
    d.setDate(d.getDate() + direction * 7);
    setSelectedWeek(d.toISOString().split("T")[0]);
  };

  const isCurrentWeek = selectedWeek === getCurrentWeekStart();

  return (
    <div className="min-h-screen bg-background pt-14 md:pt-0 flex">
      <Sidebar onExport={() => {}} onImport={() => {}} onThemeToggle={() => {}} />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">📝 Retrospectiva Semanal</h1>
            <p className="text-sm text-muted-foreground">Reflita sobre sua semana e planeje a próxima</p>
          </div>

          {/* Week Navigator */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="text-center">
                  <p className="font-semibold">{formatWeekRange(selectedWeek)}</p>
                  {isCurrentWeek && <Badge variant="secondary" className="mt-1">Semana Atual</Badge>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)} disabled={isCurrentWeek}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              {/* Week stats */}
              <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>{completedThisWeek.length} tarefas concluídas</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mood */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Como foi sua semana?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-3">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                      mood === m.value
                        ? "bg-primary/10 scale-110 ring-2 ring-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* What I did */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">✅ O que eu fiz</CardTitle>
                {completedThisWeek.length > 0 && (
                  <Button variant="outline" size="sm" onClick={autoPopulate}>
                    Auto-preencher ({completedThisWeek.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Liste suas conquistas e entregas da semana..."
                value={whatDid}
                onChange={e => setWhatDid(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* What I learned */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📚 O que eu aprendi</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Insights, descobertas e aprendizados..."
                value={whatLearned}
                onChange={e => setWhatLearned(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* What to improve */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🔧 O que melhorar</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Pontos de melhoria e ajustes necessários..."
                value={whatImprove}
                onChange={e => setWhatImprove(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Next week plan */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🎯 Plano da próxima semana</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Prioridades e objetivos para a próxima semana..."
                value={nextWeekPlan}
                onChange={e => setNextWeekPlan(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Save */}
          <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Retrospectiva"}
          </Button>

          {/* History */}
          {reviews.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-lg font-semibold mb-3">📋 Histórico</h2>
                <div className="space-y-2">
                  {reviews.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedWeek(r.week_start)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors",
                        selectedWeek === r.week_start
                          ? "bg-primary/5 border-primary/30"
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{formatWeekRange(r.week_start)}</span>
                        <span className="text-lg">{MOODS.find(m => m.value === r.mood)?.emoji || "🙂"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Retrospective;
