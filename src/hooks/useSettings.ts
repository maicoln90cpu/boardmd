import { useLocalStorage } from "./useLocalStorage";

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultDensity: 'comfortable' | 'compact' | 'ultra-compact';
  notifications: {
    dueDate: boolean;
    achievements: boolean;
    sound: boolean;
    dueDateHours: number; // Horas antes do prazo para notificar
  };
  kanban: {
    autoReset: boolean;
    resetTime: string; // "00:00"
    defaultColumn: string;
    maxTasksPerColumn: number;
  };
  productivity: {
    dailyGoal: number;
    pomodoroEnabled: boolean;
    pomodoroDuration: number; // minutos
  };
  interface: {
    sidebarPosition: 'left' | 'right';
    language: 'pt-BR' | 'en' | 'es';
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
