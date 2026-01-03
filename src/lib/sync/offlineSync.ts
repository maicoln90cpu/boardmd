import { QueuedOperation } from "@/types";

export type { QueuedOperation };

const QUEUE_KEY = 'offline_operations_queue';

export const offlineSync = {
  queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp'>) {
    const queue = this.getQueue();
    const newOperation: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    queue.push(newOperation);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return newOperation.id;
  },

  getQueue(): QueuedOperation[] {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  removeOperation(id: string) {
    const queue = this.getQueue().filter(op => op.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  clearQueue() {
    localStorage.removeItem(QUEUE_KEY);
  },

  hasQueuedOperations(): boolean {
    return this.getQueue().length > 0;
  }
};
