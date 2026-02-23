import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { defaultNotificationTemplates, NotificationTemplate } from "@/lib/defaultNotificationTemplates";
import { getDefaultPrompt } from "@/lib/defaultAIPrompts";
import { logger, prodLogger } from "@/lib/logger";

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultDensity: 'comfortable' | 'compact' | 'ultra-compact';
  timezone: string; // Timezone do usuário (ex: "America/Sao_Paulo")
  // Paleta de cores sincronizada (migrada de localStorage)
  colorPalette?: 'default' | 'ocean' | 'forest' | 'sunset' | 'lavender';
  notifications: {
    dueDate: boolean;
    achievements: boolean;
    sound: boolean;
    dueDateHours: number;
    dueDateHours2: number | null;
    checkInterval: 5 | 15 | 30 | 60;
    snoozeMinutes: number;
    excludedPushColumnIds: string[];
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
    projectsSortOption: 'manual' | 'date_asc' | 'date_desc' | 'name_asc' | 'name_desc' | 'priority_asc' | 'priority_desc';
    projectsSortOrder: 'asc' | 'desc';
    simplifiedMode: boolean;
    hideCompletedTasks: boolean;
    // Filtros de data persistidos - agora suportam array
    dailyDueDateFilter: string | string[];
    projectsDueDateFilter: string | string[];
    // View padrão ao fazer login
    defaultView: 'daily' | 'projects';
    // Automação: mover tarefas da semana atual automaticamente
    autoMoveToCurrentWeek: boolean;
    // Colunas excluídas da automação Semana Atual
    excludeFromWeeklyAutomation: string[];
    // Tamanhos das colunas por categoria (sincronizado)
    columnSizes?: Record<string, number[]>;
    // Reset imediato de tarefas recorrentes ao concluir
    immediateRecurrentReset: boolean;
  };
  productivity: {
    dailyGoal: number;
    pomodoroEnabled: boolean;
    pomodoroDuration: number;
    // Daily Review
    dailyReviewEnabled: boolean;
    dailyReviewLastShown: string | null; // ISO date string
    autoResetDailyStats: boolean;
  };
  interface: {
    sidebarPosition: 'left' | 'right';
    language: 'pt-BR' | 'en' | 'es';
    sidebarPinned: boolean;
    sidebarExpandedWhenPinned: boolean;
    autoDataIntegrityMonitor: boolean;
  };
  // Colunas ocultas no kanban (sincronizar entre dispositivos)
  hiddenColumns: string[];
  mobile: {
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
  // Configurações de IA
  ai?: {
    model: string;
  };
  aiPrompts?: Record<string, string>;
  notificationTemplates?: NotificationTemplate[];
  // Filtros de data do calendário persistidos
  calendarDueDateFilter?: string;
  // Filtros do Kanban sincronizados (migrados de localStorage) - agora suportam arrays
  filters?: {
    search: string;
    priority: string | string[];
    tag: string | string[];
    dailyPriority: string;
    dailyTag: string;
    dailySearch: string;
    recurrence: "all" | "recurring" | "non-recurring";
  };
  // Filtros do Calendário sincronizados entre dispositivos
  calendarFilters?: {
    priority: string[];
    tag: string[];
    dueDate: string[];
    categories: string[];
    columns: string[];
    search: string;
  };
}

const defaultSettings: AppSettings = {
  theme: 'auto',
  defaultDensity: 'compact',
  timezone: 'America/Sao_Paulo',
  notifications: {
    dueDate: true,
    achievements: true,
    sound: false,
    dueDateHours: 4,
    dueDateHours2: null,
    checkInterval: 15,
    snoozeMinutes: 30,
    excludedPushColumnIds: [],
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
    projectsSortOption: 'date_asc',
    projectsSortOrder: 'asc',
    simplifiedMode: false,
    hideCompletedTasks: true,
    dailyDueDateFilter: 'all',
    projectsDueDateFilter: 'all',
    autoMoveToCurrentWeek: false,
    defaultView: 'projects',
    excludeFromWeeklyAutomation: ['recorrente', 'recorrentes', 'arquivado'],
    columnSizes: {},
    immediateRecurrentReset: false,
  },
  productivity: {
    dailyGoal: 5,
    pomodoroEnabled: false,
    pomodoroDuration: 25,
    autoResetDailyStats: true,
    dailyReviewEnabled: false, // Desativado por padrão (era true)
    dailyReviewLastShown: null,
  },
  interface: {
    sidebarPosition: 'left',
    language: 'pt-BR',
    sidebarPinned: true,
    sidebarExpandedWhenPinned: true,
    autoDataIntegrityMonitor: false,
  },
  hiddenColumns: [],
  mobile: {
    projectsGridColumns: 1, // 1 coluna por padrão (era 2)
    hideBadges: false,
  },
  customization: {
    priorityColors: {
      high: { background: '#fee2e2', text: '#dc2626' },
      medium: { background: '#fef3c7', text: '#d97706' },
      low: { background: '#dcfce7', text: '#16a34a' },
    },
  },
  calendarDueDateFilter: 'all',
  filters: {
    search: '',
    priority: 'all',
    tag: 'all',
    dailyPriority: 'all',
    dailyTag: 'all',
    dailySearch: '',
    recurrence: 'all',
  },
};

// Batching configuration
const BATCH_DEBOUNCE_MS = 500; // Wait 500ms before saving
const BATCH_MAX_WAIT_MS = 2000; // Force save after 2 seconds max

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Ref to always have fresh settings (fixes stale closure in batched saves)
  const settingsRef = useRef<AppSettings>(defaultSettings);
  
  // Batching state
  const pendingChangesRef = useRef<Partial<AppSettings>>({});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);

  // Deep merge helper for settings
  const deepMergeSettings = useCallback((loaded: Partial<AppSettings>): AppSettings => ({
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
    customization: {
      ...defaultSettings.customization,
      ...(loaded.customization || {}),
      priorityColors: {
        ...defaultSettings.customization?.priorityColors,
        ...(loaded.customization?.priorityColors || {}),
      },
    },
    filters: {
      ...defaultSettings.filters,
      ...(loaded.filters || {}),
    },
  }), []);

  // Deep merge two partial settings objects
  const deepMergePartial = useCallback((target: Partial<AppSettings>, source: Partial<AppSettings>): Partial<AppSettings> => {
    const result = { ...target };
    
    for (const key of Object.keys(source) as (keyof AppSettings)[]) {
      const sourceValue = source[key];
      const targetValue = result[key];
      
      if (sourceValue !== undefined && typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
        (result as any)[key] = {
          ...(typeof targetValue === 'object' && targetValue !== null ? targetValue : {}),
          ...sourceValue,
        };
      } else if (sourceValue !== undefined) {
        (result as any)[key] = sourceValue;
      }
    }
    
    return result;
  }, []);

  // Flush pending changes to database
  const flushPendingChanges = useCallback(async () => {
    if (!user || Object.keys(pendingChangesRef.current).length === 0) return;
    if (!isMountedRef.current) return;

    // Clear timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (maxWaitTimerRef.current) {
      clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }

    // Capture and clear pending changes
    const changesToSave = pendingChangesRef.current;
    pendingChangesRef.current = {};

    setIsSaving(true);
    logger.log('[useSettings] Flushing batched changes:', Object.keys(changesToSave));

    try {
      // Use ref to always get fresh settings (fixes stale closure bug)
      const currentSettings = settingsRef.current;
      
      // Merge pending changes into current settings
      const mergedSettings = {
        ...currentSettings,
        ...changesToSave,
        notifications: {
          ...currentSettings.notifications,
          ...(changesToSave.notifications || {}),
        },
        kanban: {
          ...currentSettings.kanban,
          ...(changesToSave.kanban || {}),
        },
        productivity: {
          ...currentSettings.productivity,
          ...(changesToSave.productivity || {}),
        },
        interface: {
          ...currentSettings.interface,
          ...(changesToSave.interface || {}),
        },
        mobile: {
          ...currentSettings.mobile,
          ...(changesToSave.mobile || {}),
        },
        customization: {
          ...currentSettings.customization,
          ...(changesToSave.customization || {}),
          priorityColors: {
            ...currentSettings.customization?.priorityColors,
            ...(changesToSave.customization?.priorityColors || {}),
          },
        },
        filters: {
          ...currentSettings.filters,
          ...(changesToSave.filters || {}),
        },
      };

      // Upsert to database
      const { error } = await supabase
        .from("user_settings")
        .upsert(
          { user_id: user.id, settings: mergedSettings as any },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      lastSaveRef.current = Date.now();
      if (isMountedRef.current) {
        setIsDirty(false);
      }
      logger.log('[useSettings] Batch save successful');
    } catch (error) {
      prodLogger.error('[useSettings] Batch save error:', error);
      // Re-queue failed changes
      pendingChangesRef.current = deepMergePartial(changesToSave, pendingChangesRef.current);
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [user, deepMergePartial]);

  // Schedule a batched save
  const scheduleBatchSave = useCallback(() => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      flushPendingChanges();
    }, BATCH_DEBOUNCE_MS);

    // Set max wait timer if not already set
    if (!maxWaitTimerRef.current) {
      maxWaitTimerRef.current = setTimeout(() => {
        flushPendingChanges();
      }, BATCH_MAX_WAIT_MS);
    }
  }, [flushPendingChanges]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Flush any pending changes before unmount
      if (Object.keys(pendingChangesRef.current).length > 0) {
        flushPendingChanges();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (maxWaitTimerRef.current) {
        clearTimeout(maxWaitTimerRef.current);
      }
    };
  }, [flushPendingChanges]);

  // Load settings from database + Realtime sync
  // Helper to set settings and keep ref in sync
  const setSettingsWithRef = useCallback((value: AppSettings | ((prev: AppSettings) => AppSettings)) => {
    setSettings((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      settingsRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setSettingsWithRef(defaultSettings);
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
        logger.error("Error loading settings:", error);
        setSettingsWithRef(defaultSettings);
      } else if (data?.settings) {
        const loadedSettings = data.settings as Partial<AppSettings>;
        setSettingsWithRef(deepMergeSettings(loadedSettings));
      } else {
        setSettingsWithRef(defaultSettings);
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
            // Only update from Realtime if there are NO pending local changes
            if (Object.keys(pendingChangesRef.current).length === 0) {
              setSettingsWithRef(deepMergeSettings(loadedSettings));
              setIsDirty(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, deepMergeSettings, setSettingsWithRef]);

  // Batched update function - queues changes and schedules save
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    // Update local state immediately (optimistic update)
    setSettings((prev) => {
      const updated = {
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
        customization: {
          ...prev.customization,
          ...(newSettings.customization || {}),
          priorityColors: {
            ...prev.customization?.priorityColors,
            ...(newSettings.customization?.priorityColors || {}),
          },
        },
        filters: {
          ...prev.filters,
          ...(newSettings.filters || {}),
        },
      };
      // Keep ref in sync for flushPendingChanges
      settingsRef.current = updated;
      return updated;
    });
    
    // Queue changes for batched save
    pendingChangesRef.current = deepMergePartial(pendingChangesRef.current, newSettings);
    setIsDirty(true);
    
    // Schedule batched save
    scheduleBatchSave();
  }, [deepMergePartial, scheduleBatchSave]);

  // Immediate save (bypass batching) - for critical saves
  const saveSettings = useCallback(async () => {
    if (!user) return;

    // flushPendingChanges uses settingsRef.current (always fresh)
    await flushPendingChanges();
    setIsDirty(false);
  }, [user, flushPendingChanges]);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    pendingChangesRef.current = defaultSettings;
    setIsDirty(true);
    scheduleBatchSave();
  }, [scheduleBatchSave]);

  const getAIPrompt = useCallback((key: string): string => {
    return settings?.aiPrompts?.[key] || '';
  }, [settings?.aiPrompts]);

  const updateAIPrompt = useCallback((key: string, value: string) => {
    updateSettings({
      aiPrompts: {
        ...(settings.aiPrompts || {}),
        [key]: value,
      },
    });
  }, [settings.aiPrompts, updateSettings]);

  const resetAIPrompt = useCallback((key: string) => {
    updateAIPrompt(key, getDefaultPrompt(key));
  }, [updateAIPrompt]);

  const resetAllAIPrompts = useCallback(() => {
    updateSettings({ aiPrompts: undefined });
  }, [updateSettings]);

  return {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    isLoading,
    isDirty,
    isSaving,
    getAIPrompt,
    updateAIPrompt,
    resetAIPrompt,
    resetAllAIPrompts,
    // Expose flush for manual trigger if needed
    flushPendingChanges,
  };
}
