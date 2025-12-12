import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Timer, 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  Settings2, 
  Plus, 
  Trash2, 
  Edit2,
  Check,
  X,
  BarChart3,
  History,
  Target,
  Coffee,
  Flame,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Sidebar } from "@/components/Sidebar";
import { usePomodoro } from "@/hooks/usePomodoro";
import { usePomodoroTemplates, PomodoroTemplate } from "@/hooks/usePomodoroTemplates";
import { useTasks } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { formatDateTimeBR } from "@/lib/dateUtils";
import { toast } from "sonner";

export default function Pomodoro() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    state,
    timeRemaining,
    formattedTime,
    progress,
    sessionsCompleted,
    stats,
    settings,
    isActive,
    isPaused,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    skipSession,
    updateSettings,
  } = usePomodoro();

  const { templates, addTemplate, updateTemplate, deleteTemplate, isLoading: templatesLoading } = usePomodoroTemplates();
  const { tasks } = useTasks("all");
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Template editing state
  const [editingTemplate, setEditingTemplate] = useState<PomodoroTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    work_duration: 25,
    short_break: 5,
    long_break: 15,
    sessions_until_long: 4,
  });
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);

  // Weekly stats
  const [weeklyStats, setWeeklyStats] = useState({ sessions: 0, minutes: 0 });

  // Load session history
  useEffect(() => {
    if (!user) return;
    
    const loadHistory = async () => {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from("pomodoro_sessions")
        .select("*, tasks(title)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(50);
      
      if (!error && data) {
        setSessionHistory(data);
      }
      setHistoryLoading(false);
    };

    loadHistory();
  }, [user]);

  // Load weekly stats
  useEffect(() => {
    if (!user) return;
    
    const loadWeeklyStats = async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from("pomodoro_sessions")
        .select("duration_minutes")
        .eq("user_id", user.id)
        .eq("completed", true)
        .eq("session_type", "work")
        .gte("started_at", weekAgo.toISOString());
      
      if (!error && data) {
        setWeeklyStats({
          sessions: data.length,
          minutes: data.reduce((acc, s) => acc + (s.duration_minutes || 0), 0),
        });
      }
    };

    loadWeeklyStats();
  }, [user]);

  const handleApplyTemplate = (template: PomodoroTemplate) => {
    updateSettings({
      workDuration: template.work_duration,
      shortBreakDuration: template.short_break,
      longBreakDuration: template.long_break,
      sessionsUntilLongBreak: template.sessions_until_long,
    });
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const handleSaveNewTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast.error("Nome do template é obrigatório");
      return;
    }
    
    await addTemplate(newTemplate);
    setNewTemplate({
      name: "",
      work_duration: 25,
      short_break: 5,
      long_break: 15,
      sessions_until_long: 4,
    });
    setIsAddingTemplate(false);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    await updateTemplate(editingTemplate.id, editingTemplate);
    setEditingTemplate(null);
  };

  const getStateColor = () => {
    switch (state) {
      case "working": return "text-red-500";
      case "shortBreak": return "text-green-500";
      case "longBreak": return "text-blue-500";
      default: return "text-muted-foreground";
    }
  };

  const getStateLabel = () => {
    switch (state) {
      case "working": return "Focando";
      case "shortBreak": return "Pausa Curta";
      case "longBreak": return "Pausa Longa";
      case "paused": return "Pausado";
      default: return "Pronto";
    }
  };

  const activeTasks = useMemo(() => 
    tasks.filter(t => !t.is_completed).slice(0, 20), 
    [tasks]
  );

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={() => {}}
        onViewChange={() => {}}
        viewMode="all"
      />

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Timer className="h-6 w-6 text-red-500" />
                Pomodoro Timer
              </h1>
              <p className="text-muted-foreground">Foco e produtividade com técnica Pomodoro</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Timer Card */}
            <Card className="lg:col-span-2">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-6">
                  {/* Timer Display */}
                  <div className="relative w-64 h-64">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 120}
                        strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                        className={cn(
                          "transition-all duration-1000",
                          state === "working" ? "text-red-500" : 
                          state === "shortBreak" ? "text-green-500" : 
                          state === "longBreak" ? "text-blue-500" : "text-primary"
                        )}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={cn("text-5xl font-bold tabular-nums", getStateColor())}>
                        {formattedTime}
                      </span>
                      <span className="text-sm text-muted-foreground mt-2">
                        {getStateLabel()}
                      </span>
                    </div>
                  </div>

                  {/* Session Counter */}
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-lg px-4 py-1">
                      <Flame className="h-4 w-4 mr-2 text-orange-500" />
                      {sessionsCompleted} sessões
                    </Badge>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-3">
                    {state === "idle" ? (
                      <>
                        <Button size="lg" onClick={() => startSession("work")} className="gap-2">
                          <Play className="h-5 w-5" />
                          Iniciar Foco
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => startSession("short_break")} className="gap-2">
                          <Coffee className="h-5 w-5" />
                          Pausa Curta
                        </Button>
                      </>
                    ) : isPaused ? (
                      <>
                        <Button size="lg" onClick={resumeSession} className="gap-2">
                          <Play className="h-5 w-5" />
                          Retomar
                        </Button>
                        <Button size="lg" variant="destructive" onClick={stopSession} className="gap-2">
                          <Square className="h-5 w-5" />
                          Parar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="lg" variant="outline" onClick={pauseSession} className="gap-2">
                          <Pause className="h-5 w-5" />
                          Pausar
                        </Button>
                        <Button size="lg" variant="secondary" onClick={skipSession} className="gap-2">
                          <SkipForward className="h-5 w-5" />
                          Pular
                        </Button>
                        <Button size="lg" variant="destructive" onClick={stopSession} className="gap-2">
                          <Square className="h-5 w-5" />
                          Parar
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Task Selection */}
                  <div className="w-full max-w-md">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      Tarefa vinculada (opcional)
                    </Label>
                    <Select value={selectedTaskId || "none"} onValueChange={(val) => setSelectedTaskId(val === "none" ? null : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma tarefa..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma tarefa</SelectItem>
                        {activeTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">{stats.sessionsToday}</div>
                    <div className="text-xs text-muted-foreground">Sessões Hoje</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">{stats.totalMinutesToday}</div>
                    <div className="text-xs text-muted-foreground">Minutos Hoje</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-orange-500">{weeklyStats.sessions}</div>
                    <div className="text-xs text-muted-foreground">Sessões Semana</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-orange-500">{Math.round(weeklyStats.minutes / 60)}h</div>
                    <div className="text-xs text-muted-foreground">Horas Semana</div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Meta Diária
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{stats.sessionsToday} de 8 sessões</span>
                      <span>{Math.round((stats.sessionsToday / 8) * 100)}%</span>
                    </div>
                    <Progress value={(stats.sessionsToday / 8) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Section */}
          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="templates" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Clock className="h-4 w-4" />
                Configurações
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* Templates Tab */}
            <TabsContent value="templates">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Templates Personalizados</CardTitle>
                      <CardDescription>Crie configurações de timer para diferentes tipos de trabalho</CardDescription>
                    </div>
                    <Dialog open={isAddingTemplate} onOpenChange={setIsAddingTemplate}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          Novo Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Template</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Nome do Template</Label>
                            <Input
                              value={newTemplate.name}
                              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                              placeholder="Ex: Trabalho Profundo"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Foco (min)</Label>
                              <Input
                                type="number"
                                min={5}
                                max={120}
                                value={newTemplate.work_duration}
                                onChange={(e) => setNewTemplate({ ...newTemplate, work_duration: parseInt(e.target.value) || 25 })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Pausa Curta (min)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={30}
                                value={newTemplate.short_break}
                                onChange={(e) => setNewTemplate({ ...newTemplate, short_break: parseInt(e.target.value) || 5 })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Pausa Longa (min)</Label>
                              <Input
                                type="number"
                                min={5}
                                max={60}
                                value={newTemplate.long_break}
                                onChange={(e) => setNewTemplate({ ...newTemplate, long_break: parseInt(e.target.value) || 15 })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Sessões até Pausa Longa</Label>
                              <Input
                                type="number"
                                min={2}
                                max={10}
                                value={newTemplate.sessions_until_long}
                                onChange={(e) => setNewTemplate({ ...newTemplate, sessions_until_long: parseInt(e.target.value) || 4 })}
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                          </DialogClose>
                          <Button onClick={handleSaveNewTemplate}>Salvar Template</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {templatesLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum template criado ainda. Crie seu primeiro template!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {templates.map((template) => (
                        <Card key={template.id} className="relative">
                          <CardContent className="pt-4">
                            {editingTemplate?.id === template.id ? (
                              <div className="space-y-3">
                                <Input
                                  value={editingTemplate.name}
                                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    type="number"
                                    value={editingTemplate.work_duration}
                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, work_duration: parseInt(e.target.value) || 25 })}
                                    min={5}
                                    max={120}
                                  />
                                  <Input
                                    type="number"
                                    value={editingTemplate.short_break}
                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, short_break: parseInt(e.target.value) || 5 })}
                                    min={1}
                                    max={30}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => setEditingTemplate(null)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" onClick={handleUpdateTemplate}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between mb-3">
                                  <h3 className="font-semibold">{template.name}</h3>
                                  <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingTemplate(template)}>
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteTemplate(template.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                  <div className="flex items-center gap-1">
                                    <Timer className="h-3 w-3 text-red-500" />
                                    <span>{template.work_duration} min foco</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Coffee className="h-3 w-3 text-green-500" />
                                    <span>{template.short_break} min pausa</span>
                                  </div>
                                </div>
                                <Button size="sm" className="w-full" onClick={() => handleApplyTemplate(template)}>
                                  Usar Template
                                </Button>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações do Timer</CardTitle>
                  <CardDescription>Personalize as durações e comportamentos do Pomodoro</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Duração do Foco (minutos)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={120}
                        value={settings.workDuration}
                        onChange={(e) => updateSettings({ workDuration: parseInt(e.target.value) || 25 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pausa Curta (minutos)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={settings.shortBreakDuration}
                        onChange={(e) => updateSettings({ shortBreakDuration: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pausa Longa (minutos)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={60}
                        value={settings.longBreakDuration}
                        onChange={(e) => updateSettings({ longBreakDuration: parseInt(e.target.value) || 15 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Sessões até Pausa Longa</Label>
                    <Input
                      type="number"
                      min={2}
                      max={10}
                      value={settings.sessionsUntilLongBreak}
                      onChange={(e) => updateSettings({ sessionsUntilLongBreak: parseInt(e.target.value) || 4 })}
                      className="max-w-[200px]"
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Iniciar pausas automaticamente</Label>
                        <p className="text-sm text-muted-foreground">Começar pausa ao terminar foco</p>
                      </div>
                      <Switch
                        checked={settings.autoStartBreaks}
                        onCheckedChange={(checked) => updateSettings({ autoStartBreaks: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Iniciar foco automaticamente</Label>
                        <p className="text-sm text-muted-foreground">Começar foco ao terminar pausa</p>
                      </div>
                      <Switch
                        checked={settings.autoStartWork}
                        onCheckedChange={(checked) => updateSettings({ autoStartWork: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Som de notificação</Label>
                        <p className="text-sm text-muted-foreground">Tocar som ao terminar sessão</p>
                      </div>
                      <Switch
                        checked={settings.soundEnabled}
                        onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Sessões</CardTitle>
                  <CardDescription>Suas últimas 50 sessões de Pomodoro</CardDescription>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                  ) : sessionHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma sessão registrada ainda.
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {sessionHistory.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                session.session_type === "work" ? "bg-red-500" :
                                session.session_type === "short_break" ? "bg-green-500" : "bg-blue-500"
                              )} />
                              <div>
                                <div className="font-medium text-sm">
                                  {session.session_type === "work" ? "Foco" :
                                   session.session_type === "short_break" ? "Pausa Curta" : "Pausa Longa"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDateTimeBR(session.started_at)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {session.tasks?.title && (
                                <Badge variant="outline" className="text-xs">
                                  {session.tasks.title}
                                </Badge>
                              )}
                              <Badge variant={session.completed ? "default" : "secondary"}>
                                {session.duration_minutes} min
                              </Badge>
                              {session.completed ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
