import { offlineSync } from './offlineSync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SYNC_TAG = 'supabase-sync';

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

  async processOperation(operation: any) {
    const { type, action, data } = operation;

    switch (type) {
      case 'task':
        return this.syncTask(action, data);
      case 'note':
        return this.syncNote(action, data);
      case 'category':
        return this.syncCategory(action, data);
    }
  },

  async syncTask(action: string, data: any) {
    switch (action) {
      case 'create':
        return supabase.from('tasks').insert(data);
      case 'update':
        return supabase.from('tasks').update(data).eq('id', data.id);
      case 'delete':
        return supabase.from('tasks').delete().eq('id', data.id);
    }
  },

  async syncNote(action: string, data: any) {
    switch (action) {
      case 'create':
        return supabase.from('notes').insert(data);
      case 'update':
        return supabase.from('notes').update(data).eq('id', data.id);
      case 'delete':
        return supabase.from('notes').delete().eq('id', data.id);
    }
  },

  async syncCategory(action: string, data: any) {
    switch (action) {
      case 'create':
        return supabase.from('categories').insert(data);
      case 'update':
        return supabase.from('categories').update(data).eq('id', data.id);
      case 'delete':
        return supabase.from('categories').delete().eq('id', data.id);
    }
  }
};
