import { useRef, useCallback } from "react";

/**
 * Hook para criar um callback com debounce
 * @param callback Função a ser executada após o debounce
 * @param delay Tempo de espera em ms (default: 500ms)
 */
export function useDebounceCallback(
  callback: () => void,
  delay: number = 500
): () => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  
  // Manter callback atualizado
  callbackRef.current = callback;

  return useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current();
    }, delay);
  }, [delay]);
}
