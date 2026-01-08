import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface SavingTasksContextType {
  savingTaskIds: Set<string>;
  addSavingTask: (taskId: string) => void;
  removeSavingTask: (taskId: string) => void;
  isTaskSaving: (taskId: string) => boolean;
}

const SavingTasksContext = createContext<SavingTasksContextType | null>(null);

export function SavingTasksProvider({ children }: { children: React.ReactNode }) {
  const [savingTaskIds, setSavingTaskIds] = useState<Set<string>>(new Set());

  const addSavingTask = useCallback((taskId: string) => {
    setSavingTaskIds(prev => new Set(prev).add(taskId));
  }, []);

  const removeSavingTask = useCallback((taskId: string) => {
    setSavingTaskIds(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  }, []);

  const isTaskSaving = useCallback((taskId: string) => {
    return savingTaskIds.has(taskId);
  }, [savingTaskIds]);

  // Listen for saving events from useTasks hook
  useEffect(() => {
    const handleSavingEvent = (event: CustomEvent<{ taskId: string; isSaving: boolean }>) => {
      const { taskId, isSaving } = event.detail;
      if (isSaving) {
        addSavingTask(taskId);
      } else {
        removeSavingTask(taskId);
      }
    };

    window.addEventListener('task-saving', handleSavingEvent as EventListener);
    return () => {
      window.removeEventListener('task-saving', handleSavingEvent as EventListener);
    };
  }, [addSavingTask, removeSavingTask]);

  return (
    <SavingTasksContext.Provider value={{ savingTaskIds, addSavingTask, removeSavingTask, isTaskSaving }}>
      {children}
    </SavingTasksContext.Provider>
  );
}

export function useSavingTasks() {
  const context = useContext(SavingTasksContext);
  if (!context) {
    throw new Error("useSavingTasks must be used within SavingTasksProvider");
  }
  return context;
}
