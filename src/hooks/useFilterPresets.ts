import { useState, useEffect, useCallback } from "react";
import { useSettings } from "./useSettings";
import { useToast } from "./useToast";

export interface FilterPreset {
  id: string;
  name: string;
  icon?: string;
  filters: {
    searchTerm?: string;
    priorityFilter?: string;
    tagFilter?: string;
    categoryFilter?: string[];
    displayMode?: string;
    sortOption?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FilterPresetsData {
  presets: FilterPreset[];
  activePresetId?: string;
}

const defaultPresetsData: FilterPresetsData = {
  presets: [],
  activePresetId: undefined,
};

export function useFilterPresets() {
  const { settings, updateSettings, saveSettings, isLoading } = useSettings();
  const { toast } = useToast();
  const [activePresetId, setActivePresetId] = useState<string | undefined>(undefined);

  // Carregar presets do settings
  const presetsData: FilterPresetsData = (settings as any).filterPresets || defaultPresetsData;
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
    
    updateSettings({
      ...(settings as any),
      filterPresets: {
        presets: updatedPresets,
        activePresetId: newPreset.id,
      },
    } as any);

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
  }, [presets, settings, updateSettings, saveSettings, toast]);

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
      ...(settings as any),
      filterPresets: {
        ...presetsData,
        presets: updatedPresets,
      },
    } as any);

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
  }, [presets, presetsData, settings, updateSettings, saveSettings, toast]);

  // Deletar preset
  const deletePreset = useCallback(async (presetId: string): Promise<boolean> => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return false;

    const updatedPresets = presets.filter((p) => p.id !== presetId);
    const newActiveId = activePresetId === presetId ? undefined : activePresetId;

    updateSettings({
      ...(settings as any),
      filterPresets: {
        presets: updatedPresets,
        activePresetId: newActiveId,
      },
    } as any);

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
  }, [presets, activePresetId, settings, updateSettings, saveSettings, toast]);

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
      ...(settings as any),
      filterPresets: {
        ...presetsData,
        activePresetId: presetId,
      },
    } as any);

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
  }, [presets, presetsData, settings, updateSettings, saveSettings, toast]);

  // Limpar preset ativo
  const clearActivePreset = useCallback(async () => {
    updateSettings({
      ...(settings as any),
      filterPresets: {
        ...presetsData,
        activePresetId: undefined,
      },
    } as any);

    try {
      await saveSettings();
      setActivePresetId(undefined);
    } catch (error) {
      // Ignora erro
    }
  }, [presetsData, settings, updateSettings, saveSettings]);

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
