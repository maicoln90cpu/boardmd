import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { defaultNotificationTemplates, NotificationTemplate } from "@/lib/defaultNotificationTemplates";
import { getDefaultPrompt } from "@/lib/defaultAIPrompts";

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultDensity: 'comfortable' | 'compact' | 'ultra-compact';
  timezone: string; // Timezone do usuário (ex: "America/Sao_Paulo")
  notifications: {
    dueDate: boolean;
    achievements: boolean;
    sound: boolean;
    dueDateHours: number;
    checkInterval: 5 | 15 | 30 | 60;
    snoozeMinutes: number;
  };
  kanban: {
    autoReset: boolean;
    resetTime: string;
    defaultColumn: string;
    maxTasksPerColumn: number;
    allowCrossCategoryDrag: boolean;
    showFavoritesPanel: boolean;
    dailySortOption: 'time' | 'name' | 'priority';
    dailySortOrder: 'asc' | 'desc';
    simplifiedMode: boolean;
    hideCompletedTasks: boolean;
  };
  productivity: {
    dailyGoal: number;
    pomodoroEnabled: boolean;
    pomodoroDuration: number;
    autoResetDailyStats: boolean;
  };
  interface: {
    sidebarPosition: 'left' | 'right';
    language: 'pt-BR' | 'en' | 'es';
  };
  mobile: {
    dailyGridColumns: 1 | 2;
    projectsGridColumns: 1 | 2;
    hideBadges: boolean;
  };
  customization?: {
    priorityColors?: {
      high: { background: string; text: string };
      medium: { background: string; text: string };
      low: { background: string; text: string };
    };
  };
  aiPrompts?: Record<string, string>;
  notificationTemplates?: NotificationTemplate[];
}

const defaultSettings: AppSettings = {
  theme: 'auto',
  defaultDensity: 'comfortable',
  timezone: 'America/Sao_Paulo', // Padrão Brasil
  notifications: {
    dueDate: true,
    achievements: true,
    sound: false,
    dueDateHours: 24,
    checkInterval: 15,
    snoozeMinutes: 30,
  },
  kanban: {
    autoReset: false,
    resetTime: '00:00',
    defaultColumn: '',
    maxTasksPerColumn: 20,
    allowCrossCategoryDrag: false,
    showFavoritesPanel: true,
    dailySortOption: 'time',
    dailySortOrder: 'asc',
    simplifiedMode: false,
    hideCompletedTasks: false,
  },
  productivity: {
    dailyGoal: 5,
    pomodoroEnabled: false,
    pomodoroDuration: 25,
    autoResetDailyStats: true,
  },
  interface: {
    sidebarPosition: 'left',
    language: 'pt-BR',
  },
  mobile: {
    dailyGridColumns: 2,
    projectsGridColumns: 2,
    hideBadges: false,
  },
  customization: {
    priorityColors: {
      high: { background: '#fee2e2', text: '#dc2626' },
      medium: { background: '#fef3c7', text: '#d97706' },
      low: { background: '#dcfce7', text: '#16a34a' },
    },
  },
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  // Deep merge helper for settings
  const deepMergeSettings = (loaded: Partial<AppSettings>): AppSettings => ({
    ...defaultSettings,
    ...loaded,
    notifications: {
      ...defaultSettings.notifications,
      ...(loaded.notifications || {}),
    },
    kanban: {
      ...defaultSettings.kanban,
      ...(loaded.kanban || {}),
    },
    productivity: {
      ...defaultSettings.productivity,
      ...(loaded.productivity || {}),
    },
    interface: {
      ...defaultSettings.interface,
      ...(loaded.interface || {}),
    },
    mobile: {
      ...defaultSettings.mobile,
      ...(loaded.mobile || {}),
    },
    // BUG 1 FIX: Deep merge customization.priorityColors
    customization: {
      ...defaultSettings.customization,
      ...(loaded.customization || {}),
      priorityColors: {
        ...defaultSettings.customization?.priorityColors,
        ...(loaded.customization?.priorityColors || {}),
      },
    },
  });

  // Load settings from database + Realtime sync
  useEffect(() => {
    if (!user) {
      setSettings(defaultSettings);
      setIsLoading(false);
      return;
    }

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading settings:", error);
        setSettings(defaultSettings);
      } else if (data?.settings) {
        const loadedSettings = data.settings as Partial<AppSettings>;
        setSettings(deepMergeSettings(loadedSettings));
      } else {
        setSettings(defaultSettings);
      }
      setIsLoading(false);
    };

    loadSettings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('user_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new?.settings) {
            const loadedSettings = payload.new.settings as Partial<AppSettings>;
            setSettings(deepMergeSettings(loadedSettings));
            setIsDirty(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
      notifications: {
        ...prev.notifications,
        ...(newSettings.notifications || {}),
      },
      kanban: {
        ...prev.kanban,
        ...(newSettings.kanban || {}),
      },
      productivity: {
        ...prev.productivity,
        ...(newSettings.productivity || {}),
      },
      interface: {
        ...prev.interface,
        ...(newSettings.interface || {}),
      },
      mobile: {
        ...prev.mobile,
        ...(newSettings.mobile || {}),
      },
      // BUG 1 FIX: Deep merge customization.priorityColors
      customization: {
        ...prev.customization,
        ...(newSettings.customization || {}),
        priorityColors: {
          ...prev.customization?.priorityColors,
          ...(newSettings.customization?.priorityColors || {}),
        },
      },
    }));
    setIsDirty(true);
  };

  const saveSettings = async () => {
    if (!user) return;

    const { data: existingSettings } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSettings) {
      const { error } = await supabase
        .from("user_settings")
        .update({ settings: settings as any })
        .eq("user_id", user.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("user_settings")
        .insert({ user_id: user.id, settings: settings as any });

      if (error) throw error;
    }

    setIsDirty(false);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setIsDirty(true);
  };

  const getAIPrompt = (key: string): string => {
    return settings?.aiPrompts?.[key] || '';
  };

  const updateAIPrompt = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      aiPrompts: {
        ...(prev.aiPrompts || {}),
        [key]: value,
      },
    }));
    setIsDirty(true);
  };

  const resetAIPrompt = (key: string) => {
    updateAIPrompt(key, getDefaultPrompt(key));
  };

  const resetAllAIPrompts = () => {
    setSettings((prev) => ({
      ...prev,
      aiPrompts: undefined,
    }));
    setIsDirty(true);
  };

  return {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    isLoading,
    isDirty,
    getAIPrompt,
    updateAIPrompt,
    resetAIPrompt,
    resetAllAIPrompts,
  };
}
