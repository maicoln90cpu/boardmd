import { useState, useEffect, useRef } from "react";
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

  // Use refs to read settings values without depending on them
  const settingsRef = useRef(settings);
  const updateSettingsRef = useRef(updateSettings);
  const saveSettingsRef = useRef(saveSettings);
  useEffect(() => {
    settingsRef.current = settings;
    updateSettingsRef.current = updateSettings;
    saveSettingsRef.current = saveSettings;
  }, [settings, updateSettings, saveSettings]);

  useEffect(() => {
    if (dailyReviewChecked) return;
    
    const currentSettings = settingsRef.current;
    
    // Se Daily Review está desabilitado, não mostrar
    if (!currentSettings.productivity.dailyReviewEnabled) {
      setDailyReviewChecked(true);
      return;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    
    if (!isInAllowedTimeWindow(currentHour)) {
      setDailyReviewChecked(true);
      return;
    }
    
    const lastShown = currentSettings.productivity.dailyReviewLastShown;
    if (lastShown) {
      const lastShownDate = new Date(lastShown);
      const hoursSinceLastShown = (now.getTime() - lastShownDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastShown < HOURS_BETWEEN_REVIEWS) {
        setDailyReviewChecked(true);
        return;
      }
    }
    
    // Aguardar tarefas carregarem e mostrar modal
    if (tasks.length > 0) {
      setShowDailyReview(true);
      setDailyReviewChecked(true);
      
      updateSettingsRef.current({
        productivity: {
          ...currentSettings.productivity,
          dailyReviewLastShown: now.toISOString()
        }
      });
      saveSettingsRef.current();
    }
  }, [tasks.length, dailyReviewChecked]);

  return {
    showDailyReview,
    setShowDailyReview,
  };
}
