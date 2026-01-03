import { useState, useEffect, useCallback } from "react";
import { useSettings, AppSettings } from "./useSettings";
import { useToast } from "./useToast";
import { FilterPreset, FilterPresetsData } from "@/types";

// Re-exportar tipos para compatibilidade
export type { FilterPreset, FilterPresetsData };

// Extensão do AppSettings para incluir filterPresets
interface SettingsWithPresets extends AppSettings {
  filterPresets?: FilterPresetsData;
}

const defaultPresetsData: FilterPresetsData = {
  presets: [],
  activePresetId: undefined,
};

export function useFilterPresets() {
  const { settings, updateSettings, saveSettings, isLoading } = useSettings();
  const { toast } = useToast();
  const [activePresetId, setActivePresetId] = useState<string | undefined>(undefined);

  // Cast settings para incluir filterPresets
  const settingsWithPresets = settings as SettingsWithPresets;

  // Carregar presets do settings
  const presetsData: FilterPresetsData = settingsWithPresets.filterPresets || defaultPresetsData;
  const presets = presetsData.presets || [];

  // Sincronizar activePresetId com settings
  useEffect(() => {
    if (!isLoading && presetsData.activePresetId !== activePresetId) {
      setActivePresetId(presetsData.activePresetId);
    }
  }, [presetsData.activePresetId, isLoading]);

  // Salvar preset
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

    const updatedPresets = [...presets, newPreset];

    // Usar cast para extender settings com filterPresets
    updateSettings({
      ...settingsWithPresets,
      filterPresets: {
        presets: updatedPresets,
        activePresetId: newPreset.id,
      },
    } as Partial<AppSettings>);

    try {
      await saveSettings();
      toast({
        title: "Preset salvo",
        description: `"${name}" foi salvo com sucesso`,
      });
      setActivePresetId(newPreset.id);
      return newPreset;
    } catch (error) {
      toast({
        title: "Erro ao salvar preset",
        description: "Não foi possível salvar o preset",
        variant: "destructive",
      });
      return null;
    }
  }, [presets, settingsWithPresets, updateSettings, saveSettings, toast]);

  // Atualizar preset existente
  const updatePreset = useCallback(async (
    presetId: string,
    updates: Partial<Pick<FilterPreset, "name" | "icon" | "filters">>
  ): Promise<boolean> => {
    const presetIndex = presets.findIndex((p) => p.id === presetId);
    if (presetIndex === -1) return false;

    const updatedPresets = [...presets];
    updatedPresets[presetIndex] = {
      ...updatedPresets[presetIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    updateSettings({
      ...settingsWithPresets,
      filterPresets: {
        ...presetsData,
        presets: updatedPresets,
      },
    } as Partial<AppSettings>);

    try {
      await saveSettings();
      toast({
        title: "Preset atualizado",
        description: `"${updatedPresets[presetIndex].name}" foi atualizado`,
      });
      return true;
    } catch (error) {
      toast({
        title: "Erro ao atualizar preset",
        description: "Não foi possível atualizar o preset",
        variant: "destructive",
      });
      return false;
    }
  }, [presets, presetsData, settingsWithPresets, updateSettings, saveSettings, toast]);

  // Deletar preset
  const deletePreset = useCallback(async (presetId: string): Promise<boolean> => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return false;

    const updatedPresets = presets.filter((p) => p.id !== presetId);
    const newActiveId = activePresetId === presetId ? undefined : activePresetId;

    updateSettings({
      ...settingsWithPresets,
      filterPresets: {
        presets: updatedPresets,
        activePresetId: newActiveId,
      },
    } as Partial<AppSettings>);

    try {
      await saveSettings();
      toast({
        title: "Preset removido",
        description: `"${preset.name}" foi removido`,
      });
      if (activePresetId === presetId) {
        setActivePresetId(undefined);
      }
      return true;
    } catch (error) {
      toast({
        title: "Erro ao remover preset",
        description: "Não foi possível remover o preset",
        variant: "destructive",
      });
      return false;
    }
  }, [presets, activePresetId, settingsWithPresets, updateSettings, saveSettings, toast]);

  // Aplicar preset (retorna os filtros para o componente aplicar)
  const applyPreset = useCallback(async (presetId: string): Promise<FilterPreset["filters"] | null> => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) {
      toast({
        title: "Preset não encontrado",
        variant: "destructive",
      });
      return null;
    }

    // Atualizar activePresetId nos settings
    updateSettings({
      ...settingsWithPresets,
      filterPresets: {
        ...presetsData,
        activePresetId: presetId,
      },
    } as Partial<AppSettings>);

    try {
      await saveSettings();
      setActivePresetId(presetId);
      toast({
        title: "Preset aplicado",
        description: `Filtros de "${preset.name}" aplicados`,
      });
      return preset.filters;
    } catch (error) {
      return preset.filters; // Ainda retorna os filtros mesmo se falhar o save
    }
  }, [presets, presetsData, settingsWithPresets, updateSettings, saveSettings, toast]);

  // Limpar preset ativo
  const clearActivePreset = useCallback(async () => {
    updateSettings({
      ...settingsWithPresets,
      filterPresets: {
        ...presetsData,
        activePresetId: undefined,
      },
    } as Partial<AppSettings>);

    try {
      await saveSettings();
      setActivePresetId(undefined);
    } catch {
      // Ignora erro
    }
  }, [presetsData, settingsWithPresets, updateSettings, saveSettings]);

  // Obter preset ativo
  const getActivePreset = useCallback((): FilterPreset | undefined => {
    if (!activePresetId) return undefined;
    return presets.find((p) => p.id === activePresetId);
  }, [presets, activePresetId]);

  return {
    presets,
    activePresetId,
    activePreset: getActivePreset(),
    savePreset,
    updatePreset,
    deletePreset,
    applyPreset,
    clearActivePreset,
    isLoading,
  };
}
