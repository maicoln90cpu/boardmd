import { useLocalStorage } from "./useLocalStorage";

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultDensity: 'comfortable' | 'compact' | 'ultra-compact';
  notifications: {
    dueDate: boolean;
    achievements: boolean;
    sound: boolean;
    dueDateHours: number;
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
    gridColumns: 1 | 2;
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
    gridColumns: 2,
    hideBadges: false,
  },
};

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    'app-settings',
    defaultSettings
  );

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
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
