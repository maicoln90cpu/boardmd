import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRateLimiter, RATE_LIMIT_CONFIGS } from '@/hooks/useRateLimiter';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('useRateLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkLimit', () => {
    it('deve permitir requisições dentro do limite', () => {
      const { result } = renderHook(() =>
        useRateLimiter({
          maxRequests: 3,
          windowMs: 60000,
        })
      );

      // Primeira requisição
      expect(result.current.checkLimit()).toBe(true);
      // Segunda requisição
      expect(result.current.checkLimit()).toBe(true);
      // Terceira requisição
      expect(result.current.checkLimit()).toBe(true);
    });

    it('deve bloquear requisições quando limite é atingido', async () => {
      const onLimitReached = vi.fn();
      const { result } = renderHook(() =>
        useRateLimiter({
          maxRequests: 2,
          windowMs: 60000,
          onLimitReached,
        })
      );

      // Usar as 2 requisições permitidas
      expect(result.current.checkLimit()).toBe(true);
      expect(result.current.checkLimit()).toBe(true);

      // Terceira requisição deve ser bloqueada
      expect(result.current.checkLimit()).toBe(false);
      expect(onLimitReached).toHaveBeenCalledTimes(1);
    });

    it('deve liberar requisições após o período expirar', () => {
      const { result } = renderHook(() =>
        useRateLimiter({
          maxRequests: 1,
          windowMs: 60000,
        })
      );

      // Usar a requisição permitida
      expect(result.current.checkLimit()).toBe(true);
      expect(result.current.checkLimit()).toBe(false);

      // Avançar o tempo além do período
      act(() => {
        vi.advanceTimersByTime(60001);
      });

      // Agora deve permitir novamente
      expect(result.current.checkLimit()).toBe(true);
    });
  });

  describe('getRemainingRequests', () => {
    it('deve retornar número correto de requisições restantes', () => {
      const { result } = renderHook(() =>
        useRateLimiter({
          maxRequests: 5,
          windowMs: 60000,
        })
      );

      expect(result.current.getRemainingRequests()).toBe(5);

      result.current.checkLimit();
      expect(result.current.getRemainingRequests()).toBe(4);

      result.current.checkLimit();
      result.current.checkLimit();
      expect(result.current.getRemainingRequests()).toBe(2);
    });

    it('deve retornar 0 quando limite atingido', () => {
      const { result } = renderHook(() =>
        useRateLimiter({
          maxRequests: 2,
          windowMs: 60000,
        })
      );

      result.current.checkLimit();
      result.current.checkLimit();
      expect(result.current.getRemainingRequests()).toBe(0);
    });
  });

  describe('getTimeUntilReset', () => {
    it('deve retornar 0 quando não há requisições', () => {
      const { result } = renderHook(() =>
        useRateLimiter({
          maxRequests: 5,
          windowMs: 60000,
        })
      );

      expect(result.current.getTimeUntilReset()).toBe(0);
    });

    it('deve retornar tempo restante corretamente', () => {
      const { result } = renderHook(() =>
        useRateLimiter({
          maxRequests: 5,
          windowMs: 60000,
        })
      );

      result.current.checkLimit();

      // Avançar 30 segundos
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      const timeRemaining = result.current.getTimeUntilReset();
      expect(timeRemaining).toBeLessThanOrEqual(30000);
      expect(timeRemaining).toBeGreaterThan(29000);
    });
  });

  describe('reset', () => {
    it('deve resetar o contador de requisições', () => {
      const { result } = renderHook(() =>
        useRateLimiter({
          maxRequests: 2,
          windowMs: 60000,
        })
      );

      // Usar todas as requisições
      result.current.checkLimit();
      result.current.checkLimit();
      expect(result.current.getRemainingRequests()).toBe(0);

      // Resetar
      act(() => {
        result.current.reset();
      });

      expect(result.current.getRemainingRequests()).toBe(2);
      expect(result.current.checkLimit()).toBe(true);
    });
  });

  describe('RATE_LIMIT_CONFIGS', () => {
    it('deve ter configuração para IA', () => {
      expect(RATE_LIMIT_CONFIGS.ai).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.ai.maxRequests).toBe(5);
      expect(RATE_LIMIT_CONFIGS.ai.windowMs).toBe(60000);
    });

    it('deve ter configuração padrão', () => {
      expect(RATE_LIMIT_CONFIGS.standard).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.standard.maxRequests).toBe(20);
    });

    it('deve ter configuração crítica', () => {
      expect(RATE_LIMIT_CONFIGS.critical).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.critical.maxRequests).toBe(3);
    });
  });

  describe('integração com configurações pré-definidas', () => {
    it('deve funcionar com configuração de IA', () => {
      const { result } = renderHook(() =>
        useRateLimiter(RATE_LIMIT_CONFIGS.ai)
      );

      // 5 requisições devem ser permitidas
      for (let i = 0; i < 5; i++) {
        expect(result.current.checkLimit()).toBe(true);
      }

      // 6ª deve ser bloqueada
      expect(result.current.checkLimit()).toBe(false);
    });

    it('deve funcionar com configuração crítica', () => {
      const { result } = renderHook(() =>
        useRateLimiter(RATE_LIMIT_CONFIGS.critical)
      );

      // 3 requisições devem ser permitidas
      for (let i = 0; i < 3; i++) {
        expect(result.current.checkLimit()).toBe(true);
      }

      // 4ª deve ser bloqueada
      expect(result.current.checkLimit()).toBe(false);
    });
  });
});
