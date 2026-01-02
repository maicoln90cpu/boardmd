import { useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface RateLimiterConfig {
  /** Número máximo de requisições permitidas no período */
  maxRequests: number;
  /** Período de tempo em milissegundos */
  windowMs: number;
  /** Mensagem de erro personalizada */
  errorMessage?: string;
  /** Callback quando limite é atingido */
  onLimitReached?: () => void;
}

interface RateLimiterResult {
  /** Verifica se pode fazer a requisição e registra o timestamp */
  checkLimit: () => boolean;
  /** Tempo restante até poder fazer nova requisição (ms) */
  getTimeUntilReset: () => number;
  /** Número de requisições restantes */
  getRemainingRequests: () => number;
  /** Reseta o contador manualmente */
  reset: () => void;
}

/**
 * Hook para rate limiting no cliente
 * Previne abuso de endpoints críticos limitando chamadas por período
 * 
 * @example
 * const { checkLimit, getRemainingRequests } = useRateLimiter({
 *   maxRequests: 5,
 *   windowMs: 60000, // 1 minuto
 *   errorMessage: "Muitas requisições. Aguarde um momento."
 * });
 * 
 * const handleClick = async () => {
 *   if (!checkLimit()) return;
 *   await fetchData();
 * };
 */
export function useRateLimiter({
  maxRequests,
  windowMs,
  errorMessage = "Limite de requisições atingido. Aguarde um momento.",
  onLimitReached
}: RateLimiterConfig): RateLimiterResult {
  const timestamps = useRef<number[]>([]);

  const cleanOldTimestamps = useCallback(() => {
    const now = Date.now();
    timestamps.current = timestamps.current.filter(
      (timestamp) => now - timestamp < windowMs
    );
  }, [windowMs]);

  const checkLimit = useCallback((): boolean => {
    cleanOldTimestamps();
    
    if (timestamps.current.length >= maxRequests) {
      const oldestTimestamp = timestamps.current[0];
      const timeUntilReset = Math.ceil((oldestTimestamp + windowMs - Date.now()) / 1000);
      
      toast.error(`${errorMessage} (${timeUntilReset}s)`);
      onLimitReached?.();
      
      return false;
    }

    timestamps.current.push(Date.now());
    return true;
  }, [maxRequests, windowMs, errorMessage, onLimitReached, cleanOldTimestamps]);

  const getTimeUntilReset = useCallback((): number => {
    cleanOldTimestamps();
    
    if (timestamps.current.length === 0) return 0;
    
    const oldestTimestamp = timestamps.current[0];
    const timeRemaining = oldestTimestamp + windowMs - Date.now();
    
    return Math.max(0, timeRemaining);
  }, [windowMs, cleanOldTimestamps]);

  const getRemainingRequests = useCallback((): number => {
    cleanOldTimestamps();
    return Math.max(0, maxRequests - timestamps.current.length);
  }, [maxRequests, cleanOldTimestamps]);

  const reset = useCallback(() => {
    timestamps.current = [];
  }, []);

  return {
    checkLimit,
    getTimeUntilReset,
    getRemainingRequests,
    reset
  };
}

// Configurações pré-definidas para diferentes tipos de endpoints
export const RATE_LIMIT_CONFIGS = {
  /** Para IA/LLM - mais restritivo (5 req/min) */
  ai: {
    maxRequests: 5,
    windowMs: 60000,
    errorMessage: "Limite de IA atingido. Aguarde antes de tentar novamente."
  },
  /** Para operações normais (20 req/min) */
  standard: {
    maxRequests: 20,
    windowMs: 60000,
    errorMessage: "Muitas requisições. Aguarde um momento."
  },
  /** Para operações críticas como delete (3 req/min) */
  critical: {
    maxRequests: 3,
    windowMs: 60000,
    errorMessage: "Operação sensível. Aguarde antes de tentar novamente."
  }
} as const;
