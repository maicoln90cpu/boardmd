import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultDensity: 'comfortable' | 'compact' | 'ultra-compact';
  notifications: {
    dueDate: boolean;
    achievements: boolean;
    sound: boolean;
    dueDateHours: number;
    checkInterval: 5 | 15 | 30 | 60;
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
  };
  productivity: {
    dailyGoal: number;
    pomodoroEnabled: boolean;
    pomodoroDuration: number;
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
}

const defaultSettings: AppSettings = {
  theme: 'auto',
  defaultDensity: 'comfortable',
  notifications: {
    dueDate: true,
    achievements: true,
    sound: false,
    dueDateHours: 24,
    checkInterval: 15,
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
  },
  productivity: {
    dailyGoal: 5,
    pomodoroEnabled: false,
    pomodoroDuration: 25,
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
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

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
        // Deep merge with default settings to ensure all nested properties exist
        const loadedSettings = data.settings as Partial<AppSettings>;
        setSettings({
          ...defaultSettings,
          ...loadedSettings,
          notifications: {
            ...defaultSettings.notifications,
            ...(loadedSettings.notifications || {}),
          },
          kanban: {
            ...defaultSettings.kanban,
            ...(loadedSettings.kanban || {}),
          },
          productivity: {
            ...defaultSettings.productivity,
            ...(loadedSettings.productivity || {}),
          },
          interface: {
            ...defaultSettings.interface,
            ...(loadedSettings.interface || {}),
          },
          mobile: {
            ...defaultSettings.mobile,
            ...(loadedSettings.mobile || {}),
          },
        });
      } else {
        setSettings(defaultSettings);
      }
      setIsLoading(false);
    };

    loadSettings();

    // Item 1: Subscribe to realtime changes
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
            // Deep merge realtime updates
            const loadedSettings = payload.new.settings as Partial<AppSettings>;
            setSettings({
              ...defaultSettings,
              ...loadedSettings,
              notifications: {
                ...defaultSettings.notifications,
                ...(loadedSettings.notifications || {}),
              },
              kanban: {
                ...defaultSettings.kanban,
                ...(loadedSettings.kanban || {}),
              },
              productivity: {
                ...defaultSettings.productivity,
                ...(loadedSettings.productivity || {}),
              },
              interface: {
                ...defaultSettings.interface,
                ...(loadedSettings.interface || {}),
              },
              mobile: {
                ...defaultSettings.mobile,
                ...(loadedSettings.mobile || {}),
              },
            });
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

  return {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    isLoading,
    isDirty,
  };
}
