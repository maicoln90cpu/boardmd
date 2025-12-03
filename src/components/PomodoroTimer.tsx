import { useState } from "react";
import { usePomodoro, PomodoroState } from "@/hooks/usePomodoro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Coffee,
  Brain,
  Settings,
  X,
  Timer,
  Trophy,
  Flame,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PomodoroTimerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PomodoroTimer({ isOpen, onClose }: PomodoroTimerProps) {
  const {
    state,
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

  const [showSettings, setShowSettings] = useState(false);

  const getStateColor = () => {
    switch (state) {
      case "working":
        return "text-red-500";
      case "shortBreak":
      case "longBreak":
        return "text-green-500";
      case "paused":
        return "text-yellow-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStateLabel = () => {
    switch (state) {
      case "working":
        return "Foco";
      case "shortBreak":
        return "Pausa Curta";
      case "longBreak":
        return "Pausa Longa";
      case "paused":
        return "Pausado";
      default:
        return "Pronto";
    }
  };

  const getProgressColor = () => {
    switch (state) {
      case "working":
        return "bg-red-500";
      case "shortBreak":
      case "longBreak":
        return "bg-green-500";
      default:
        return "bg-primary";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Pomodoro Timer
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="timer" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timer">Timer</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="settings">Config</TabsTrigger>
          </TabsList>

          <TabsContent value="timer" className="space-y-4">
            {/* Timer Circle */}
            <div className="flex flex-col items-center py-6">
              <div className="relative w-48 h-48">
                {/* Background circle */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 88}
                    strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
                    className={getStateColor()}
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                {/* Time display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${getStateColor()}`}>
                    {formattedTime}
                  </span>
                  <Badge variant="outline" className="mt-2">
                    {getStateLabel()}
                  </Badge>
                </div>
              </div>

              {/* Sessions indicator */}
              <div className="flex items-center gap-1 mt-4">
                {Array.from({ length: settings.sessionsUntilLongBreak }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i < sessionsCompleted % settings.sessionsUntilLongBreak
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-2">
              {state === "idle" ? (
                <>
                  <Button onClick={() => startSession("work")} className="gap-2">
                    <Brain className="h-4 w-4" />
                    Iniciar Foco
                  </Button>
                  <Button variant="outline" onClick={() => startSession("short_break")} className="gap-2">
                    <Coffee className="h-4 w-4" />
                    Pausa
                  </Button>
                </>
              ) : (
                <>
                  {isPaused ? (
                    <Button onClick={resumeSession} className="gap-2">
                      <Play className="h-4 w-4" />
                      Retomar
                    </Button>
                  ) : (
                    <Button onClick={pauseSession} variant="outline" className="gap-2">
                      <Pause className="h-4 w-4" />
                      Pausar
                    </Button>
                  )}
                  <Button onClick={skipSession} variant="outline" className="gap-2">
                    <SkipForward className="h-4 w-4" />
                    Pular
                  </Button>
                  <Button onClick={stopSession} variant="destructive" size="icon">
                    <Square className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.sessionsToday}</p>
                      <p className="text-xs text-muted-foreground">Sessões hoje</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.totalMinutesToday}</p>
                      <p className="text-xs text-muted-foreground">Minutos focados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-2">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{sessionsCompleted}</p>
                      <p className="text-xs text-muted-foreground">Streak atual (sessões consecutivas)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Duração do Foco: {settings.workDuration} min</Label>
                <Slider
                  value={[settings.workDuration]}
                  onValueChange={([v]) => updateSettings({ workDuration: v })}
                  min={5}
                  max={60}
                  step={5}
                  disabled={isActive}
                />
              </div>

              <div className="space-y-2">
                <Label>Pausa Curta: {settings.shortBreakDuration} min</Label>
                <Slider
                  value={[settings.shortBreakDuration]}
                  onValueChange={([v]) => updateSettings({ shortBreakDuration: v })}
                  min={1}
                  max={15}
                  step={1}
                  disabled={isActive}
                />
              </div>

              <div className="space-y-2">
                <Label>Pausa Longa: {settings.longBreakDuration} min</Label>
                <Slider
                  value={[settings.longBreakDuration]}
                  onValueChange={([v]) => updateSettings({ longBreakDuration: v })}
                  min={10}
                  max={30}
                  step={5}
                  disabled={isActive}
                />
              </div>

              <div className="space-y-2">
                <Label>Sessões até pausa longa: {settings.sessionsUntilLongBreak}</Label>
                <Slider
                  value={[settings.sessionsUntilLongBreak]}
                  onValueChange={([v]) => updateSettings({ sessionsUntilLongBreak: v })}
                  min={2}
                  max={6}
                  step={1}
                  disabled={isActive}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoBreaks">Auto-iniciar pausas</Label>
                <Switch
                  id="autoBreaks"
                  checked={settings.autoStartBreaks}
                  onCheckedChange={(v) => updateSettings({ autoStartBreaks: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoWork">Auto-iniciar trabalho</Label>
                <Switch
                  id="autoWork"
                  checked={settings.autoStartWork}
                  onCheckedChange={(v) => updateSettings({ autoStartWork: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sound">Som ao terminar</Label>
                <Switch
                  id="sound"
                  checked={settings.soundEnabled}
                  onCheckedChange={(v) => updateSettings({ soundEnabled: v })}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Mini timer component for sidebar/header
export function PomodoroMiniTimer({ onClick }: { onClick: () => void }) {
  const { state, formattedTime, isActive } = usePomodoro();

  if (!isActive && state === "idle") {
    return (
      <Button variant="ghost" size="sm" onClick={onClick} className="gap-2">
        <Timer className="h-4 w-4" />
        <span className="hidden sm:inline">Pomodoro</span>
      </Button>
    );
  }

  const getStateColor = () => {
    switch (state) {
      case "working":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      case "shortBreak":
      case "longBreak":
        return "bg-green-500/10 text-green-500 border-green-500/30";
      case "paused":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      default:
        return "";
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={`gap-2 ${getStateColor()} animate-pulse`}
    >
      <Timer className="h-4 w-4" />
      <span className="font-mono">{formattedTime}</span>
    </Button>
  );
}
