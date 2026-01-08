import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// Helper para aguardar condição assíncrona
const waitForCondition = async (callback: () => boolean, timeout = 1000) => {
  const start = Date.now();
  while (!callback() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({})),
      })),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    loading: false,
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useSettings, AppSettings, defaultSettings } from '@/hooks/data/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock para retornar settings vazias (usa defaults)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    } as any);
  });

  describe('Estado inicial', () => {
    it('deve iniciar com loading true', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.isLoading).toBe(true);
    });

    it('deve iniciar com settings padrão', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.settings).toBeDefined();
      expect(result.current.settings.theme).toBe('system');
    });

    it('deve iniciar com isDirty false', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('defaultSettings', () => {
    it('deve ter todas as propriedades esperadas', () => {
      expect(defaultSettings).toHaveProperty('theme');
      expect(defaultSettings).toHaveProperty('notifications');
      expect(defaultSettings).toHaveProperty('kanban');
      expect(defaultSettings).toHaveProperty('productivity');
      expect(defaultSettings).toHaveProperty('interface');
      expect(defaultSettings).toHaveProperty('mobile');
      expect(defaultSettings).toHaveProperty('aiPrompts');
    });

    it('deve ter valores padrão corretos para tema', () => {
      expect(defaultSettings.theme).toBe('system');
    });

    it('deve ter notificações habilitadas por padrão', () => {
      expect(defaultSettings.notifications.enabled).toBe(true);
    });

    it('deve ter metas de produtividade definidas', () => {
      expect(defaultSettings.productivity.dailyGoal).toBeGreaterThan(0);
      expect(defaultSettings.productivity.weeklyGoal).toBeGreaterThan(0);
    });
  });

  describe('updateSettings', () => {
    it('deve atualizar settings parcialmente', async () => {
      const { result } = renderHook(() => useSettings());

      await waitForCondition(() => result.current.isLoading === false);

      await act(async () => {
        result.current.updateSettings({ theme: 'dark' });
      });

      expect(result.current.settings.theme).toBe('dark');
      expect(result.current.isDirty).toBe(true);
    });

    it('deve manter outras settings ao atualizar parcialmente', async () => {
      const { result } = renderHook(() => useSettings());

      await waitForCondition(() => result.current.isLoading === false);

      const originalNotifications = result.current.settings.notifications;

      await act(async () => {
        result.current.updateSettings({ theme: 'light' });
      });

      expect(result.current.settings.notifications).toEqual(originalNotifications);
    });
  });

  describe('saveSettings', () => {
    it('deve chamar upsert no banco', async () => {
      const { result } = renderHook(() => useSettings());

      await waitForCondition(() => result.current.isLoading === false);

      await act(async () => {
        result.current.updateSettings({ theme: 'dark' });
      });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(supabase.from).toHaveBeenCalledWith('user_settings');
    });

    it('deve limpar isDirty após salvar', async () => {
      const { result } = renderHook(() => useSettings());

      await waitForCondition(() => result.current.isLoading === false);

      await act(async () => {
        result.current.updateSettings({ theme: 'dark' });
      });

      expect(result.current.isDirty).toBe(true);

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('resetSettings', () => {
    it('deve restaurar settings padrão', async () => {
      const { result } = renderHook(() => useSettings());

      await waitForCondition(() => result.current.isLoading === false);

      await act(async () => {
        result.current.updateSettings({ theme: 'dark' });
      });

      expect(result.current.settings.theme).toBe('dark');

      await act(async () => {
        result.current.resetSettings();
      });

      expect(result.current.settings.theme).toBe('system');
    });
  });

  describe('AI Prompts', () => {
    it('deve retornar prompt padrão quando não customizado', async () => {
      const { result } = renderHook(() => useSettings());

      await waitForCondition(() => result.current.isLoading === false);

      const prompt = result.current.getAIPrompt('taskSuggestion');
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
    });

    it('deve atualizar prompt específico', async () => {
      const { result } = renderHook(() => useSettings());

      await waitForCondition(() => result.current.isLoading === false);

      const newPrompt = 'Novo prompt customizado';

      await act(async () => {
        result.current.updateAIPrompt('taskSuggestion', newPrompt);
      });

      expect(result.current.getAIPrompt('taskSuggestion')).toBe(newPrompt);
    });

    it('deve resetar prompt específico para padrão', async () => {
      const { result } = renderHook(() => useSettings());

      await waitForCondition(() => result.current.isLoading === false);

      // Primeiro customiza
      await act(async () => {
        result.current.updateAIPrompt('taskSuggestion', 'Custom');
      });

      // Depois reseta
      await act(async () => {
        result.current.resetAIPrompt('taskSuggestion');
      });

      const defaultPrompt = defaultSettings.aiPrompts?.taskSuggestion;
      expect(result.current.getAIPrompt('taskSuggestion')).toBe(defaultPrompt);
    });
  });

  describe('Retorno do hook', () => {
    it('deve retornar todas as funções esperadas', () => {
      const { result } = renderHook(() => useSettings());

      expect(typeof result.current.updateSettings).toBe('function');
      expect(typeof result.current.saveSettings).toBe('function');
      expect(typeof result.current.resetSettings).toBe('function');
      expect(typeof result.current.getAIPrompt).toBe('function');
      expect(typeof result.current.updateAIPrompt).toBe('function');
      expect(typeof result.current.resetAIPrompt).toBe('function');
      expect(typeof result.current.resetAllAIPrompts).toBe('function');
    });
  });

  describe('Tratamento de erros', () => {
    it('deve lidar com erro ao carregar settings', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Network error' } 
            }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const { result } = renderHook(() => useSettings());

      await waitForCondition(() => result.current.isLoading === false);

      // Deve usar settings padrão em caso de erro
      expect(result.current.settings).toBeDefined();
    });

    it('deve exibir erro ao falhar ao salvar', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Save failed' } }),
      } as any);

      const { result } = renderHook(() => useSettings());

      await waitForCondition(() => result.current.isLoading === false);

      await act(async () => {
        result.current.updateSettings({ theme: 'dark' });
      });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });
});
