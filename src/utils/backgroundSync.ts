import { offlineSync, QueuedOperation } from "./offlineSync";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

const SYNC_TAG = "supabase-sync";

export const backgroundSync = {
  async register() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register(SYNC_TAG);
        if (import.meta.env.DEV) console.log('Background sync registered');
      } catch (error) {
        if (import.meta.env.DEV) console.log('Background sync not supported, using fallback');
        this.startPolling();
      }
    } else {
      this.startPolling();
    }
  },

  startPolling() {
    let retryCount = 0;
    const maxRetries = 5;
    
    const poll = async () => {
      if (navigator.onLine && offlineSync.hasQueuedOperations()) {
        const success = await this.syncQueue();
        if (success) {
          retryCount = 0;
        } else {
          retryCount++;
        }
      }
      
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      setTimeout(poll, delay);
    };
    
    poll();
  },

  async syncQueue(): Promise<boolean> {
    const queue = offlineSync.getQueue();
    if (queue.length === 0) return true;

    let hasErrors = false;
    let successCount = 0;

    toast.info(`Sincronizando ${queue.length} alterações pendentes...`);

    for (const operation of queue) {
      try {
        await this.processOperation(operation);
        offlineSync.removeOperation(operation.id);
        successCount++;
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to sync operation:', error);
        hasErrors = true;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} alterações sincronizadas com sucesso!`);
    }

    if (hasErrors) {
      const remaining = offlineSync.getQueue().length;
      if (remaining > 0) {
        toast.error(`${remaining} alterações não puderam ser sincronizadas. Tentando novamente...`);
      }
    }

    return !hasErrors;
  },

  async processOperation(operation: QueuedOperation) {
    const { type, action, data } = operation;

    switch (type) {
      case "task":
        return this.syncTask(action, data);
      case "note":
        return this.syncNote(action, data);
      case "category":
        return this.syncCategory(action, data);
    }
  },

  async syncTask(action: string, data: Record<string, unknown>) {
    const id = data.id as string | undefined;
    switch (action) {
      case "create":
        return supabase.from("tasks").insert(data as TablesInsert<"tasks">);
      case "update":
        if (!id) throw new Error("Task ID is required for update");
        return supabase.from("tasks").update(data as TablesUpdate<"tasks">).eq("id", id);
      case "delete":
        if (!id) throw new Error("Task ID is required for delete");
        return supabase.from("tasks").delete().eq("id", id);
    }
  },

  async syncNote(action: string, data: Record<string, unknown>) {
    const id = data.id as string | undefined;
    switch (action) {
      case "create":
        return supabase.from("notes").insert(data as TablesInsert<"notes">);
      case "update":
        if (!id) throw new Error("Note ID is required for update");
        return supabase.from("notes").update(data as TablesUpdate<"notes">).eq("id", id);
      case "delete":
        if (!id) throw new Error("Note ID is required for delete");
        return supabase.from("notes").delete().eq("id", id);
    }
  },

  async syncCategory(action: string, data: Record<string, unknown>) {
    const id = data.id as string | undefined;
    switch (action) {
      case "create":
        return supabase.from("categories").insert(data as TablesInsert<"categories">);
      case "update":
        if (!id) throw new Error("Category ID is required for update");
        return supabase.from("categories").update(data as TablesUpdate<"categories">).eq("id", id);
      case "delete":
        if (!id) throw new Error("Category ID is required for delete");
        return supabase.from("categories").delete().eq("id", id);
    }
  },
};
