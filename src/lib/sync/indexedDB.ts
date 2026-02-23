const DB_NAME = "taskflow_offline";
const DB_VERSION = 1;

// Tipos genéricos para dados offline
type OfflineTask = Record<string, unknown> & { id: string };
type OfflineNote = Record<string, unknown> & { id: string };
type OfflineCategory = Record<string, unknown> & { id: string };

export interface PendingOperation {
  id: string;
  type: "task" | "note" | "category";
  action: "create" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

class IndexedDBSync {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para dados offline
        if (!db.objectStoreNames.contains("tasks")) {
          db.createObjectStore("tasks", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("notes")) {
          db.createObjectStore("notes", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("pendingOperations")) {
          const store = db.createObjectStore("pendingOperations", { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" });
        }
      };
    });

    return this.dbPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = "readonly") {
    const db = await this.init();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Tasks
  async saveTasks(tasks: OfflineTask[]): Promise<void> {
    const store = await this.getStore("tasks", "readwrite");
    const clearRequest = store.clear();
    
    await new Promise((resolve, reject) => {
      clearRequest.onsuccess = resolve;
      clearRequest.onerror = reject;
    });

    for (const task of tasks) {
      store.put(task);
    }
  }

  async getTasks(): Promise<OfflineTask[]> {
    const store = await this.getStore("tasks");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTask(task: OfflineTask): Promise<void> {
    const store = await this.getStore("tasks", "readwrite");
    store.put(task);
  }

  async deleteTask(taskId: string): Promise<void> {
    const store = await this.getStore("tasks", "readwrite");
    store.delete(taskId);
  }

  // Notes
  async saveNotes(notes: OfflineNote[]): Promise<void> {
    const store = await this.getStore("notes", "readwrite");
    const clearRequest = store.clear();
    
    await new Promise((resolve, reject) => {
      clearRequest.onsuccess = resolve;
      clearRequest.onerror = reject;
    });

    for (const note of notes) {
      store.put(note);
    }
  }

  async getNotes(): Promise<OfflineNote[]> {
    const store = await this.getStore("notes");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Categories
  async saveCategories(categories: OfflineCategory[]): Promise<void> {
    const store = await this.getStore("categories", "readwrite");
    const clearRequest = store.clear();
    
    await new Promise((resolve, reject) => {
      clearRequest.onsuccess = resolve;
      clearRequest.onerror = reject;
    });

    for (const category of categories) {
      store.put(category);
    }
  }

  async getCategories(): Promise<OfflineCategory[]> {
    const store = await this.getStore("categories");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Pending Operations
  async addPendingOperation(operation: Omit<PendingOperation, "id" | "timestamp" | "retryCount">): Promise<string> {
    const store = await this.getStore("pendingOperations", "readwrite");
    const newOp: PendingOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };
    store.put(newOp);
    return newOp.id;
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    const store = await this.getStore("pendingOperations");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const ops = request.result || [];
        ops.sort((a, b) => a.timestamp - b.timestamp);
        resolve(ops);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingOperation(id: string): Promise<void> {
    const store = await this.getStore("pendingOperations", "readwrite");
    store.delete(id);
  }

  async updatePendingOperation(operation: PendingOperation): Promise<void> {
    const store = await this.getStore("pendingOperations", "readwrite");
    store.put(operation);
  }

  async clearPendingOperations(): Promise<void> {
    const store = await this.getStore("pendingOperations", "readwrite");
    store.clear();
  }

  async hasPendingOperations(): Promise<boolean> {
    const ops = await this.getPendingOperations();
    return ops.length > 0;
  }

  // Metadata
  async setLastSync(timestamp: number): Promise<void> {
    const store = await this.getStore("metadata", "readwrite");
    store.put({ key: "lastSync", value: timestamp });
  }

  async getLastSync(): Promise<number | null> {
    const store = await this.getStore("metadata");
    return new Promise((resolve, reject) => {
      const request = store.get("lastSync");
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }
}

export const indexedDBSync = new IndexedDBSync();
