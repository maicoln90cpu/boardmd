import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export type PomodoroState = "idle" | "working" | "shortBreak" | "longBreak" | "paused";
export type SessionType = "work" | "short_break" | "long_break";

interface PomodoroSettings {
  workDuration: number; // minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
}

interface PomodoroStats {
  sessionsToday: number;
  totalMinutesToday: number;
  currentStreak: number;
}

const defaultSettings: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
};

export function usePomodoro() {
  const { user } = useAuth();
  const [state, setState] = useState<PomodoroState>("idle");
  const [timeRemaining, setTimeRemaining] = useState(defaultSettings.workDuration * 60);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [settings, setSettings] = useState<PomodoroSettings>(defaultSettings);
  const [stats, setStats] = useState<PomodoroStats>({ sessionsToday: 0, totalMinutesToday: 0, currentStreak: 0 });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousState = useRef<PomodoroState>("idle");

  // Load stats on mount
  useEffect(() => {
    if (user) {
      loadTodayStats();
    }
  }, [user]);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2DgH15d4GJi4eEgHx5eX6EiIuJhoJ+fHx9gYWHh4WCgH5+fn+ChIWFhIKAf39/gIGDhISDgYB/f3+AgYKDg4KBgH9/f4CBgoKCgYGAf39/gIGBgoKBgYB/f3+AgYGBgYGBgH9/f4CAgYGBgYGAf39/gICBgYGBgICAf39/gICAgYGBgICAf39/gICAgYGBgICAf39/gICAgICAgICAf39/gICAgICAgIB/f39/gICAgICAgH9/f3+AgICAgICAgH9/f3+AgICAgICAgH9/f3+AgICAgICAgH9/f3+AgICAgICAgH9/f3+AgICAgICAgH9/f3+AgICAgICAgH9/f3+AgICAgICAgH9/f3+AgICAgICAgH9/f3+AgICAgICAgH9/f3+AgICAgICAgH9/f3+AgICAgICAgH9/f39/gICAgICAgH9/f39/gICAgICAgH9/f39/f4CAgICAgH9/f39/f4CAgICAgH9/f39/f4CAgICAgH9/f39/f4CAgICAgH9/f39/f4CAgICAgH9/f39/f4CAgICAgH9/f39/f4CAgICAgA==");
  }, []);

  const loadTodayStats = async () => {
    if (!user) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", true)
      .eq("session_type", "work")
      .gte("started_at", today.toISOString());
    
    if (!error && data) {
      setStats({
        sessionsToday: data.length,
        totalMinutesToday: data.reduce((acc, s) => acc + (s.duration_minutes || 0), 0),
        currentStreak: sessionsCompleted,
      });
    }
  };

  const playSound = useCallback(() => {
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [settings.soundEnabled]);

  const startSession = useCallback(async (type: SessionType = "work") => {
    if (!user) {
      toast.error("Faça login para usar o Pomodoro");
      return;
    }

    let duration: number;
    let newState: PomodoroState;
    
    switch (type) {
      case "work":
        duration = settings.workDuration;
        newState = "working";
        break;
      case "short_break":
        duration = settings.shortBreakDuration;
        newState = "shortBreak";
        break;
      case "long_break":
        duration = settings.longBreakDuration;
        newState = "longBreak";
        break;
    }

    // Create session in database
    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .insert({
        user_id: user.id,
        duration_minutes: duration,
        session_type: type,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating session:", error);
      toast.error("Erro ao iniciar sessão");
      return;
    }

    setCurrentSessionId(data.id);
    setTimeRemaining(duration * 60);
    setState(newState);
    previousState.current = newState;
    
    toast.success(type === "work" ? "🍅 Sessão de foco iniciada!" : "☕ Pausa iniciada!");
  }, [user, settings]);

  const pauseSession = useCallback(() => {
    if (state !== "idle" && state !== "paused") {
      previousState.current = state;
      setState("paused");
      toast.info("⏸️ Pomodoro pausado");
    }
  }, [state]);

  const resumeSession = useCallback(() => {
    if (state === "paused") {
      setState(previousState.current);
      toast.info("▶️ Pomodoro retomado");
    }
  }, [state]);

  const stopSession = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Mark session as incomplete
    if (currentSessionId) {
      await supabase
        .from("pomodoro_sessions")
        .update({ ended_at: new Date().toISOString(), completed: false })
        .eq("id", currentSessionId);
    }

    setState("idle");
    setTimeRemaining(settings.workDuration * 60);
    setCurrentSessionId(null);
    toast.info("🛑 Sessão cancelada");
  }, [currentSessionId, settings.workDuration]);

  const completeSession = useCallback(async () => {
    if (!currentSessionId) return;

    // Mark session as complete
    await supabase
      .from("pomodoro_sessions")
      .update({ ended_at: new Date().toISOString(), completed: true })
      .eq("id", currentSessionId);

    playSound();
    
    const wasWorking = state === "working";
    const newSessionsCompleted = wasWorking ? sessionsCompleted + 1 : sessionsCompleted;
    
    if (wasWorking) {
      setSessionsCompleted(newSessionsCompleted);
      await loadTodayStats();
      toast.success("🎉 Sessão de foco concluída!");
      
      // Determine next break type
      const nextIsLongBreak = newSessionsCompleted % settings.sessionsUntilLongBreak === 0;
      
      if (settings.autoStartBreaks) {
        startSession(nextIsLongBreak ? "long_break" : "short_break");
      } else {
        setState("idle");
        setTimeRemaining(settings.workDuration * 60);
        setCurrentSessionId(null);
      }
    } else {
      toast.success("☕ Pausa concluída!");
      
      if (settings.autoStartWork) {
        startSession("work");
      } else {
        setState("idle");
        setTimeRemaining(settings.workDuration * 60);
        setCurrentSessionId(null);
      }
    }
  }, [currentSessionId, state, sessionsCompleted, settings, playSound, loadTodayStats, startSession]);

  const skipSession = useCallback(() => {
    completeSession();
  }, [completeSession]);

  // Timer effect
  useEffect(() => {
    if (state === "working" || state === "shortBreak" || state === "longBreak") {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, completeSession]);

  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = (() => {
    let totalSeconds: number;
    switch (state) {
      case "working":
        totalSeconds = settings.workDuration * 60;
        break;
      case "shortBreak":
        totalSeconds = settings.shortBreakDuration * 60;
        break;
      case "longBreak":
        totalSeconds = settings.longBreakDuration * 60;
        break;
      default:
        totalSeconds = settings.workDuration * 60;
    }
    return ((totalSeconds - timeRemaining) / totalSeconds) * 100;
  })();

  return {
    state,
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    progress,
    sessionsCompleted,
    stats,
    settings,
    isActive: state !== "idle" && state !== "paused",
    isPaused: state === "paused",
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    skipSession,
    updateSettings,
  };
}
