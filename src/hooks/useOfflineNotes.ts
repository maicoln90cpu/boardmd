import { useEffect, useCallback, useRef } from "react";
import { indexedDBSync } from "@/lib/sync/indexedDB";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Note } from "@/hooks/useNotes";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

/**
 * Hook para sincronizar notas com IndexedDB para suporte offline.
 * Salva notas localmente quando online (cache) e serve do cache quando offline.
 */
export function useOfflineNotes(notes: Note[], fetchNotes: () => Promise<void>) {
  const { isOnline } = useOnlineStatus();
  const lastSyncRef = useRef<number>(0);

  // Salvar notas no IndexedDB quando recebidas do servidor
  useEffect(() => {
    if (notes.length > 0 && isOnline) {
      const now = Date.now();
      // Debounce: só salvar se passou pelo menos 5s desde o último save
      if (now - lastSyncRef.current > 5000) {
        lastSyncRef.current = now;
        indexedDBSync.saveNotes(notes as unknown as Array<Record<string, unknown> & { id: string }>)
          .catch(err => logger.error("Failed to cache notes in IndexedDB:", err));
      }
    }
  }, [notes, isOnline]);

  // Carregar notas do cache quando offline
  const loadOfflineNotes = useCallback(async (): Promise<Note[]> => {
    try {
      const cached = await indexedDBSync.getNotes();
      if (cached.length > 0) {
        toast.info(`${cached.length} notas carregadas do cache offline`);
      }
      return cached as unknown as Note[];
    } catch (err) {
      logger.error("Failed to load offline notes:", err);
      return [];
    }
  }, []);

  // Quando voltar online, sincronizar
  useEffect(() => {
    if (isOnline) {
      const syncPending = async () => {
        const hasPending = await indexedDBSync.hasPendingOperations();
        if (hasPending) {
          logger.log("Online again, pending operations will sync via SyncManager");
        }
      };
      syncPending();
    }
  }, [isOnline]);

  return {
    loadOfflineNotes,
    isOnline,
  };
}
