import { useState, useRef, useCallback } from "react";

export function useIndexViewState() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Board keys for force refresh
  const [projectsBoardKey, setProjectsBoardKey] = useState(0);
  
  // View mode removed - always "all" now
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"by_category" | "all_tasks">("all_tasks");
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);

  // Refresh board functions
  const refreshProjectsBoard = useCallback(() => setProjectsBoardKey(k => k + 1), []);
  const refreshAllBoards = useCallback(() => {
    setProjectsBoardKey(k => k + 1);
  }, []);

  return {
    // Refs
    searchInputRef,
    
    // Board keys
    projectsBoardKey,
    refreshProjectsBoard,
    refreshAllBoards,
    
    // View state
    displayMode,
    setDisplayMode,
    
    // Modals
    showStats,
    setShowStats,
    showHistory,
    setShowHistory,
    showTemplates,
    setShowTemplates,
    showColumnManager,
    setShowColumnManager,
    showQuickTaskModal,
    setShowQuickTaskModal,
    selectedTaskForHistory,
    setSelectedTaskForHistory,
  };
}
