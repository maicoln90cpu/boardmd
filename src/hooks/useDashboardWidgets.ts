import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export interface WidgetConfig {
  id: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_WIDGET_CONFIG: WidgetConfig[] = [
  { id: "hero", enabled: true, order: 0 },
  { id: "goals", enabled: true, order: 1 },
  { id: "stats", enabled: true, order: 2 },
  { id: "insights", enabled: true, order: 3 },
  { id: "productivity-chart", enabled: true, order: 4 },
  { id: "performance-metrics", enabled: true, order: 5 },
  { id: "weekly-progress", enabled: true, order: 6 },
  { id: "gamification", enabled: true, order: 7 },
  { id: "highlights", enabled: true, order: 8 },
  { id: "system-health", enabled: true, order: 9 },
];

export function useDashboardWidgets() {
  const [storedConfig, setStoredConfig] = useLocalStorage<WidgetConfig[]>(
    "dashboard-widget-config",
    DEFAULT_WIDGET_CONFIG
  );
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig[]>(storedConfig);

  // Sync with localStorage
  useEffect(() => {
    // Merge with defaults to handle new widgets
    const mergedConfig = DEFAULT_WIDGET_CONFIG.map((defaultWidget) => {
      const saved = storedConfig.find((w) => w.id === defaultWidget.id);
      return saved || defaultWidget;
    }).sort((a, b) => a.order - b.order);
    setWidgetConfig(mergedConfig);
  }, [storedConfig]);

  // Update widget config
  const updateWidgetConfig = useCallback((newWidgets: Array<{ id: string; enabled: boolean }>) => {
    const newConfig = newWidgets.map((w, index) => ({
      id: w.id,
      enabled: w.enabled,
      order: index,
    }));
    setWidgetConfig(newConfig);
    setStoredConfig(newConfig);
  }, [setStoredConfig]);

  // Get enabled widgets in order
  const getEnabledWidgets = useCallback(() => {
    return widgetConfig
      .filter((w) => w.enabled)
      .sort((a, b) => a.order - b.order);
  }, [widgetConfig]);

  // Check if a specific widget is enabled
  const isWidgetEnabled = useCallback((widgetId: string) => {
    const widget = widgetConfig.find((w) => w.id === widgetId);
    return widget?.enabled ?? true;
  }, [widgetConfig]);

  return {
    widgetConfig,
    updateWidgetConfig,
    getEnabledWidgets,
    isWidgetEnabled,
  };
}
