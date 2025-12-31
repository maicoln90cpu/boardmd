import { useCallback } from "react";
import { useSettings } from "@/hooks/useSettings";

export function useSettingsUpdaters() {
  const { settings, updateSettings, saveSettings } = useSettings();

  const setSimplifiedMode = useCallback(async (value: boolean) => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        simplifiedMode: value
      }
    });
    await saveSettings();
  }, [settings.kanban, updateSettings, saveSettings]);

  const setDailySortOption = useCallback(async (value: "time" | "name" | "priority") => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        dailySortOption: value
      }
    });
    await saveSettings();
  }, [settings.kanban, updateSettings, saveSettings]);

  const setDailySortOrder = useCallback(async (value: "asc" | "desc") => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        dailySortOrder: value
      }
    });
    await saveSettings();
  }, [settings.kanban, updateSettings, saveSettings]);

  const setDensityMode = useCallback(async (value: "comfortable" | "compact" | "ultra-compact") => {
    updateSettings({
      defaultDensity: value
    });
    await saveSettings();
  }, [updateSettings, saveSettings]);

  const setShowFavoritesPanel = useCallback(async (value: boolean) => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        showFavoritesPanel: value
      }
    });
    await saveSettings();
  }, [settings.kanban, updateSettings, saveSettings]);

  const setHideBadgesMobile = useCallback(async (value: boolean) => {
    updateSettings({
      mobile: {
        ...settings.mobile,
        hideBadges: value
      }
    });
    await saveSettings();
  }, [settings.mobile, updateSettings, saveSettings]);

  const setDailyGridColumnsMobile = useCallback(async (value: 1 | 2) => {
    updateSettings({
      mobile: {
        ...settings.mobile,
        dailyGridColumns: value
      }
    });
    await saveSettings();
  }, [settings.mobile, updateSettings, saveSettings]);

  const setProjectsGridColumnsMobile = useCallback(async (value: 1 | 2) => {
    updateSettings({
      mobile: {
        ...settings.mobile,
        projectsGridColumns: value
      }
    });
    await saveSettings();
  }, [settings.mobile, updateSettings, saveSettings]);

  const setDailyDueDateFilter = useCallback(async (value: string) => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        dailyDueDateFilter: value
      }
    });
    await saveSettings();
  }, [settings.kanban, updateSettings, saveSettings]);

  const setProjectsDueDateFilter = useCallback(async (value: string) => {
    updateSettings({
      kanban: {
        ...settings.kanban,
        projectsDueDateFilter: value
      }
    });
    await saveSettings();
  }, [settings.kanban, updateSettings, saveSettings]);

  return {
    setSimplifiedMode,
    setDailySortOption,
    setDailySortOrder,
    setDensityMode,
    setShowFavoritesPanel,
    setHideBadgesMobile,
    setDailyGridColumnsMobile,
    setProjectsGridColumnsMobile,
    setDailyDueDateFilter,
    setProjectsDueDateFilter,
  };
}
