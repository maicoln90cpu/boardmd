import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Helper para aguardar condição assíncrona
const waitForCondition = async (callback: () => boolean, timeout = 1000) => {
  const start = Date.now();
  while (!callback() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};

// Mock Audio
class MockAudio {
  src = '';
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  load = vi.fn();
}
global.Audio = MockAudio as any;

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'session-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    loading: false,
  })),
}));

vi.mock('@/hooks/ui/useToast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

import { usePomodoro, PomodoroState, SessionType } from '@/hooks/usePomodoro';
import { supabase } from '@/integrations/supabase/client';

describe('usePomodoro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup mock para sessões de pomodoro
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'session-id' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Estado inicial', () => {
    it('deve iniciar com estado IDLE', () => {
      const { result } = renderHook(() => usePomodoro());
      expect(result.current.state).toBe(PomodoroState.IDLE);
    });

    it('deve iniciar com tipo de sessão WORK', () => {
      const { result } = renderHook(() => usePomodoro());
      expect(result.current.sessionType).toBe(SessionType.WORK);
    });

    it('deve iniciar com tempo padrão de 25 minutos', () => {
      const { result } = renderHook(() => usePomodoro());
      expect(result.current.timeRemaining).toBe(25 * 60);
    });

    it('deve iniciar com 0 sessões completadas', () => {
      const { result } = renderHook(() => usePomodoro());
      expect(result.current.completedSessions).toBe(0);
    });
  });

  describe('Settings padrão', () => {
    it('deve ter duração de trabalho configurável', () => {
      const { result } = renderHook(() => usePomodoro());
      expect(result.current.settings.workDuration).toBe(25);
    });

    it('deve ter pausa curta configurável', () => {
      const { result } = renderHook(() => usePomodoro());
      expect(result.current.settings.shortBreakDuration).toBe(5);
    });

    it('deve ter pausa longa configurável', () => {
      const { result } = renderHook(() => usePomodoro());
      expect(result.current.settings.longBreakDuration).toBe(15);
    });

    it('deve ter sessões até pausa longa configurável', () => {
      const { result } = renderHook(() => usePomodoro());
      expect(result.current.settings.sessionsUntilLongBreak).toBe(4);
    });
  });

  describe('startSession', () => {
    it('deve iniciar sessão de trabalho', async () => {
      const { result } = renderHook(() => usePomodoro());

      await act(async () => {
        await result.current.startSession(SessionType.WORK);
      });

      expect(result.current.state).toBe(PomodoroState.RUNNING);
      expect(result.current.sessionType).toBe(SessionType.WORK);
    });

    it('deve criar registro no banco', async () => {
      const { result } = renderHook(() => usePomodoro());

      await act(async () => {
        await result.current.startSession(SessionType.WORK);
      });

      expect(supabase.from).toHaveBeenCalledWith('pomodoro_sessions');
    });

    it('deve iniciar sessão de pausa curta', async () => {
      const { result } = renderHook(() => usePomodoro());

      await act(async () => {
        await result.current.startSession(SessionType.SHORT_BREAK);
      });

      expect(result.current.sessionType).toBe(SessionType.SHORT_BREAK);
      expect(result.current.timeRemaining).toBe(5 * 60);
    });

    it('deve iniciar sessão de pausa longa', async () => {
      const { result } = renderHook(() => usePomodoro());

      await act(async () => {
        await result.current.startSession(SessionType.LONG_BREAK);
      });

      expect(result.current.sessionType).toBe(SessionType.LONG_BREAK);
      expect(result.current.timeRemaining).toBe(15 * 60);
    });
  });

  describe('pauseSession', () => {
    it('deve pausar sessão em andamento', async () => {
      const { result } = renderHook(() => usePomodoro());

      await act(async () => {
        await result.current.startSession(SessionType.WORK);
      });

      act(() => {
        result.current.pauseSession();
      });

      expect(result.current.state).toBe(PomodoroState.PAUSED);
    });
  });

  describe('resumeSession', () => {
    it('deve retomar sessão pausada', async () => {
      const { result } = renderHook(() => usePomodoro());

      await act(async () => {
        await result.current.startSession(SessionType.WORK);
      });

      act(() => {
        result.current.pauseSession();
      });

      act(() => {
        result.current.resumeSession();
      });

      expect(result.current.state).toBe(PomodoroState.RUNNING);
    });
  });

  describe('stopSession', () => {
    it('deve parar sessão e voltar para IDLE', async () => {
      const { result } = renderHook(() => usePomodoro());

      await act(async () => {
        await result.current.startSession(SessionType.WORK);
      });

      await act(async () => {
        await result.current.stopSession();
      });

      expect(result.current.state).toBe(PomodoroState.IDLE);
    });

    it('deve atualizar registro no banco como incompleto', async () => {
      const { result } = renderHook(() => usePomodoro());

      await act(async () => {
        await result.current.startSession(SessionType.WORK);
      });

      await act(async () => {
        await result.current.stopSession();
      });

      expect(supabase.from).toHaveBeenCalledWith('pomodoro_sessions');
    });
  });

  describe('skipSession', () => {
    it('deve pular para próxima sessão', async () => {
      const { result } = renderHook(() => usePomodoro());

      await act(async () => {
        await result.current.startSession(SessionType.WORK);
      });

      await act(async () => {
        await result.current.skipSession();
      });

      // Após pular sessão de trabalho, deve ir para pausa
      expect(result.current.sessionType).not.toBe(SessionType.WORK);
    });
  });

  describe('updateSettings', () => {
    it('deve atualizar duração de trabalho', () => {
      const { result } = renderHook(() => usePomodoro());

      act(() => {
        result.current.updateSettings({ workDuration: 30 });
      });

      expect(result.current.settings.workDuration).toBe(30);
    });

    it('deve atualizar tempo restante quando IDLE', () => {
      const { result } = renderHook(() => usePomodoro());

      act(() => {
        result.current.updateSettings({ workDuration: 30 });
      });

      expect(result.current.timeRemaining).toBe(30 * 60);
    });
  });

  describe('formatTime', () => {
    it('deve formatar tempo corretamente', () => {
      const { result } = renderHook(() => usePomodoro());
      
      expect(result.current.formatTime(1500)).toBe('25:00');
      expect(result.current.formatTime(300)).toBe('05:00');
      expect(result.current.formatTime(65)).toBe('01:05');
      expect(result.current.formatTime(0)).toBe('00:00');
    });
  });

  describe('progress', () => {
    it('deve calcular progresso corretamente', async () => {
      const { result } = renderHook(() => usePomodoro());

      // Estado inicial: 100%
      expect(result.current.progress).toBe(100);

      await act(async () => {
        await result.current.startSession(SessionType.WORK);
      });

      // Após iniciar, ainda 100%
      expect(result.current.progress).toBe(100);
    });
  });

  describe('Stats', () => {
    it('deve iniciar com stats zeradas', () => {
      const { result } = renderHook(() => usePomodoro());

      expect(result.current.stats.sessionsToday).toBe(0);
      expect(result.current.stats.totalMinutesToday).toBe(0);
    });
  });

  describe('Timer countdown', () => {
    it('deve decrementar tempo quando rodando', async () => {
      const { result } = renderHook(() => usePomodoro());

      await act(async () => {
        await result.current.startSession(SessionType.WORK);
      });

      const initialTime = result.current.timeRemaining;

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.timeRemaining).toBe(initialTime - 1);
    });

    it('não deve decrementar quando pausado', async () => {
      const { result } = renderHook(() => usePomodoro());

      await act(async () => {
        await result.current.startSession(SessionType.WORK);
      });

      act(() => {
        result.current.pauseSession();
      });

      const pausedTime = result.current.timeRemaining;

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.timeRemaining).toBe(pausedTime);
    });
  });

  describe('Retorno do hook', () => {
    it('deve retornar todas as funções esperadas', () => {
      const { result } = renderHook(() => usePomodoro());

      expect(typeof result.current.startSession).toBe('function');
      expect(typeof result.current.pauseSession).toBe('function');
      expect(typeof result.current.resumeSession).toBe('function');
      expect(typeof result.current.stopSession).toBe('function');
      expect(typeof result.current.skipSession).toBe('function');
      expect(typeof result.current.updateSettings).toBe('function');
      expect(typeof result.current.formatTime).toBe('function');
    });

    it('deve retornar todas as propriedades esperadas', () => {
      const { result } = renderHook(() => usePomodoro());

      expect(result.current).toHaveProperty('state');
      expect(result.current).toHaveProperty('sessionType');
      expect(result.current).toHaveProperty('timeRemaining');
      expect(result.current).toHaveProperty('completedSessions');
      expect(result.current).toHaveProperty('settings');
      expect(result.current).toHaveProperty('stats');
      expect(result.current).toHaveProperty('progress');
    });
  });
});
