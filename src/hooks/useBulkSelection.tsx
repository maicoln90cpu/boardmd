import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { Task } from "@/hooks/useTasks";

interface BulkSelectionContextType {
  selectedTaskIds: Set<string>;
  isSelectionMode: boolean;
  toggleSelection: (taskId: string) => void;
  selectAll: (taskIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (taskId: string) => boolean;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  selectedCount: number;
}

const BulkSelectionContext = createContext<BulkSelectionContextType | null>(null);

export function BulkSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((taskIds: string[]) => {
    setSelectedTaskIds(new Set(taskIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
    setIsSelectionMode(false);
  }, []);

  const isSelected = useCallback(
    (taskId: string) => selectedTaskIds.has(taskId),
    [selectedTaskIds]
  );

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedTaskIds(new Set());
  }, []);

  const selectedCount = useMemo(() => selectedTaskIds.size, [selectedTaskIds]);

  const value = useMemo(
    () => ({
      selectedTaskIds,
      isSelectionMode,
      toggleSelection,
      selectAll,
      clearSelection,
      isSelected,
      enterSelectionMode,
      exitSelectionMode,
      selectedCount,
    }),
    [
      selectedTaskIds,
      isSelectionMode,
      toggleSelection,
      selectAll,
      clearSelection,
      isSelected,
      enterSelectionMode,
      exitSelectionMode,
      selectedCount,
    ]
  );

  return (
    <BulkSelectionContext.Provider value={value}>
      {children}
    </BulkSelectionContext.Provider>
  );
}

export function useBulkSelection() {
  const context = useContext(BulkSelectionContext);
  if (!context) {
    throw new Error("useBulkSelection must be used within BulkSelectionProvider");
  }
  return context;
}
