import { useState, useCallback } from "react";
import { useToast } from "@/hooks/ui/useToast";
import { FilterPreset, FilterPresetsData } from "@/types";

// Re-exportar tipos para compatibilidade
export type { FilterPreset, FilterPresetsData };

export type FilterPresetScope = "kanban" | "calendar";

const STORAGE_KEY_PREFIX = "filterPresets_";

function getStorageKey(scope: FilterPresetScope) {
  return `${STORAGE_KEY_PREFIX}${scope}`;
}

function loadFromStorage(scope: FilterPresetScope): FilterPresetsData {
  try {
    const raw = localStorage.getItem(getStorageKey(scope));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { presets: [], activePresetId: undefined };
}

function saveToStorage(scope: FilterPresetScope, data: FilterPresetsData) {
  try {
    localStorage.setItem(getStorageKey(scope), JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function useFilterPresets(scope: FilterPresetScope = "kanban") {
  const { toast } = useToast();
  const [data, setData] = useState<FilterPresetsData>(() => loadFromStorage(scope));

  const presets = data.presets || [];
  const activePresetId = data.activePresetId;

  const persist = useCallback((newData: FilterPresetsData) => {
    setData(newData);
    saveToStorage(scope, newData);
  }, [scope]);

  const savePreset = useCallback(async (
    name: string,
    filters: FilterPreset["filters"],
    icon?: string
  ): Promise<FilterPreset | null> => {
    const newPreset: FilterPreset = {
      id: crypto.randomUUID(),
      name,
      icon: icon || "🔖",
      filters,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persist({
      presets: [...presets, newPreset],
      activePresetId: newPreset.id,
    });
    toast({ title: "Preset salvo", description: `"${name}" foi salvo com sucesso` });
    return newPreset;
  }, [presets, persist, toast]);

  const updatePreset = useCallback(async (
    presetId: string,
    updates: Partial<Pick<FilterPreset, "name" | "icon" | "filters">>
  ): Promise<boolean> => {
    const idx = presets.findIndex((p) => p.id === presetId);
    if (idx === -1) return false;
    const updated = [...presets];
    updated[idx] = { ...updated[idx], ...updates, updatedAt: new Date().toISOString() };
    persist({ ...data, presets: updated });
    toast({ title: "Preset atualizado", description: `"${updated[idx].name}" foi atualizado` });
    return true;
  }, [presets, data, persist, toast]);

  const deletePreset = useCallback(async (presetId: string): Promise<boolean> => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return false;
    persist({
      presets: presets.filter((p) => p.id !== presetId),
      activePresetId: activePresetId === presetId ? undefined : activePresetId,
    });
    toast({ title: "Preset removido", description: `"${preset.name}" foi removido` });
    return true;
  }, [presets, activePresetId, persist, toast]);

  const applyPreset = useCallback(async (presetId: string): Promise<FilterPreset["filters"] | null> => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) {
      toast({ title: "Preset não encontrado", variant: "destructive" });
      return null;
    }
    persist({ ...data, activePresetId: presetId });
    toast({ title: "Preset aplicado", description: `Filtros de "${preset.name}" aplicados` });
    return preset.filters;
  }, [presets, data, persist, toast]);

  const clearActivePreset = useCallback(async () => {
    persist({ ...data, activePresetId: undefined });
  }, [data, persist]);

  const activePreset = activePresetId ? presets.find((p) => p.id === activePresetId) : undefined;

  return {
    presets,
    activePresetId,
    activePreset,
    savePreset,
    updatePreset,
    deletePreset,
    applyPreset,
    clearActivePreset,
    isLoading: false,
  };
}
