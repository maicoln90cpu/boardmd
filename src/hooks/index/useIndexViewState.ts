import { useState, useRef, useCallback } from "react";

export function useIndexViewState() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Board keys for force refresh
  const [dailyBoardKey, setDailyBoardKey] = useState(0);
  const [projectsBoardKey, setProjectsBoardKey] = useState(0);
  
  // View mode and modals
  const [viewMode, setViewMode] = useState<"daily" | "all">("daily");
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"by_category" | "all_tasks">("all_tasks");
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);

  // Refresh board functions
  const refreshDailyBoard = useCallback(() => setDailyBoardKey(k => k + 1), []);
  const refreshProjectsBoard = useCallback(() => setProjectsBoardKey(k => k + 1), []);
  const refreshAllBoards = useCallback(() => {
    setDailyBoardKey(k => k + 1);
    setProjectsBoardKey(k => k + 1);
  }, []);

  return {
    // Refs
    searchInputRef,
    
    // Board keys
    dailyBoardKey,
    projectsBoardKey,
    refreshDailyBoard,
    refreshProjectsBoard,
    refreshAllBoards,
    
    // View state
    viewMode,
    setViewMode,
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
