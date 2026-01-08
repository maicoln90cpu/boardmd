import { useState, useEffect } from "react";
import { Task } from "@/hooks/tasks/useTasks";
import { AppSettings } from "@/hooks/data/useSettings";

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

// Horários permitidos para mostrar Daily Review: 00h, 06h, 12h, 18h
const ALLOWED_HOURS = [0, 6, 12, 18];
const HOURS_BETWEEN_REVIEWS = 6;

function isInAllowedTimeWindow(currentHour: number): boolean {
  // Verificar se está dentro de ±30 minutos de um horário permitido
  return ALLOWED_HOURS.some(hour => currentHour === hour);
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
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Verificar se está em janela de horário permitido (00h, 06h, 12h, 18h)
    if (!isInAllowedTimeWindow(currentHour)) {
      setDailyReviewChecked(true);
      return;
    }
    
    // Verificar última exibição (agora é timestamp ISO completo)
    const lastShown = settings.productivity.dailyReviewLastShown;
    if (lastShown) {
      const lastShownDate = new Date(lastShown);
      const hoursSinceLastShown = (now.getTime() - lastShownDate.getTime()) / (1000 * 60 * 60);
      
      // Se ainda não passaram 6 horas, não mostrar
      if (hoursSinceLastShown < HOURS_BETWEEN_REVIEWS) {
        setDailyReviewChecked(true);
        return;
      }
    }
    
    // Aguardar tarefas carregarem e mostrar modal
    if (tasks.length > 0) {
      setShowDailyReview(true);
      setDailyReviewChecked(true);
      
      // Atualizar última exibição com timestamp completo
      updateSettings({
        productivity: {
          ...settings.productivity,
          dailyReviewLastShown: now.toISOString() // Timestamp completo
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
