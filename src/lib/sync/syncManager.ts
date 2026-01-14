import { indexedDBSync, PendingOperation } from "./indexedDB";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

class SyncManager {
  private isSyncing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private onlineListener: (() => void) | null = null;

  async initialize() {
    await indexedDBSync.init();
    this.startPeriodicSync();
    this.setupOnlineListener();
    
    // Sync imediato se online
    if (navigator.onLine) {
      this.syncPendingOperations();
    }
  }

  private setupOnlineListener() {
    this.onlineListener = () => {
      logger.log("Back online, starting sync...");
      toast.info("Conexão restaurada. Sincronizando...");
      this.syncPendingOperations();
    };
    window.addEventListener("online", this.onlineListener);
  }

  private startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncPendingOperations();
      }
    }, SYNC_INTERVAL);
  }

  async queueOperation(
    type: PendingOperation["type"],
    action: PendingOperation["action"],
    data: Record<string, unknown>
  ): Promise<string> {
    const id = await indexedDBSync.addPendingOperation({ type, action, data });
    
    // Tentar sync imediato se online
    if (navigator.onLine) {
      this.syncPendingOperations();
    }
    
    return id;
  }

  async syncPendingOperations(): Promise<boolean> {
    if (this.isSyncing || !navigator.onLine) return false;
    
    this.isSyncing = true;
    let hasErrors = false;
    let successCount = 0;

    try {
      const operations = await indexedDBSync.getPendingOperations();
      
      if (operations.length === 0) {
        this.isSyncing = false;
        return true;
      }

      logger.log(`Syncing ${operations.length} pending operations...`);

      for (const operation of operations) {
        try {
          await this.processOperation(operation);
          await indexedDBSync.removePendingOperation(operation.id);
          successCount++;
        } catch (error) {
          logger.error("Sync operation failed:", error);
          
          if (operation.retryCount < MAX_RETRIES) {
            await indexedDBSync.updatePendingOperation({
              ...operation,
              retryCount: operation.retryCount + 1,
            });
          } else {
            // Max retries, remove operation
            await indexedDBSync.removePendingOperation(operation.id);
            logger.error("Operation discarded after max retries:", operation);
          }
          hasErrors = true;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} alterações sincronizadas!`);
        await indexedDBSync.setLastSync(Date.now());
      }

    } catch (error) {
      logger.error("Sync failed:", error);
      hasErrors = true;
    } finally {
      this.isSyncing = false;
    }

    return !hasErrors;
  }

  private async processOperation(operation: PendingOperation) {
    const { type, action, data } = operation;
    const id = data.id as string | undefined;

    switch (type) {
      case "task":
        return this.syncTask(action, data, id);
      case "note":
        return this.syncNote(action, data, id);
      case "category":
        return this.syncCategory(action, data, id);
    }
  }

  private async syncTask(action: string, data: Record<string, unknown>, id?: string) {
    switch (action) {
      case "create":
        const { error: createError } = await supabase
          .from("tasks")
          .insert(data as TablesInsert<"tasks">);
        if (createError) throw createError;
        break;
      case "update":
        if (!id) throw new Error("Task ID required for update");
        const { error: updateError } = await supabase
          .from("tasks")
          .update(data as TablesUpdate<"tasks">)
          .eq("id", id);
        if (updateError) throw updateError;
        break;
      case "delete":
        if (!id) throw new Error("Task ID required for delete");
        const { error: deleteError } = await supabase
          .from("tasks")
          .delete()
          .eq("id", id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  private async syncNote(action: string, data: Record<string, unknown>, id?: string) {
    switch (action) {
      case "create":
        const { error: createError } = await supabase
          .from("notes")
          .insert(data as TablesInsert<"notes">);
        if (createError) throw createError;
        break;
      case "update":
        if (!id) throw new Error("Note ID required for update");
        const { error: updateError } = await supabase
          .from("notes")
          .update(data as TablesUpdate<"notes">)
          .eq("id", id);
        if (updateError) throw updateError;
        break;
      case "delete":
        if (!id) throw new Error("Note ID required for delete");
        const { error: deleteError } = await supabase
          .from("notes")
          .delete()
          .eq("id", id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  private async syncCategory(action: string, data: Record<string, unknown>, id?: string) {
    switch (action) {
      case "create":
        const { error: createError } = await supabase
          .from("categories")
          .insert(data as TablesInsert<"categories">);
        if (createError) throw createError;
        break;
      case "update":
        if (!id) throw new Error("Category ID required for update");
        const { error: updateError } = await supabase
          .from("categories")
          .update(data as TablesUpdate<"categories">)
          .eq("id", id);
        if (updateError) throw updateError;
        break;
      case "delete":
        if (!id) throw new Error("Category ID required for delete");
        const { error: deleteError } = await supabase
          .from("categories")
          .delete()
          .eq("id", id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.onlineListener) {
      window.removeEventListener("online", this.onlineListener);
    }
  }
}

export const syncManager = new SyncManager();
