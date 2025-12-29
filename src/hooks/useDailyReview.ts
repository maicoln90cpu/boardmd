import { useState, useEffect } from "react";
import { Task } from "./useTasks";
import { AppSettings } from "./useSettings";

interface UseDailyReviewOptions {
  tasks: Task[];
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  saveSettings: () => Promise<void>;
}

interface UseDailyReviewReturn {
  showDailyReview: boolean;
  setShowDailyReview: (show: boolean) => void;
}

export function useDailyReview({
  tasks,
  settings,
  updateSettings,
  saveSettings,
}: UseDailyReviewOptions): UseDailyReviewReturn {
  const [showDailyReview, setShowDailyReview] = useState(false);
  const [dailyReviewChecked, setDailyReviewChecked] = useState(false);

  useEffect(() => {
    if (dailyReviewChecked) return;
    
    // Se Daily Review está desabilitado, não mostrar
    if (!settings.productivity.dailyReviewEnabled) {
      setDailyReviewChecked(true);
      return;
    }
    
    const lastShown = settings.productivity.dailyReviewLastShown;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Verificar se já foi mostrado hoje
    if (lastShown === today) {
      setDailyReviewChecked(true);
      return;
    }
    
    // Aguardar tarefas carregarem e mostrar modal
    if (tasks.length > 0) {
      setShowDailyReview(true);
      setDailyReviewChecked(true);
      
      // Atualizar última exibição
      updateSettings({
        productivity: {
          ...settings.productivity,
          dailyReviewLastShown: today
        }
      });
      saveSettings();
    }
  }, [
    tasks.length, 
    settings.productivity.dailyReviewEnabled, 
    settings.productivity.dailyReviewLastShown, 
    dailyReviewChecked,
    updateSettings,
    saveSettings,
    settings.productivity
  ]);

  return {
    showDailyReview,
    setShowDailyReview,
  };
}
