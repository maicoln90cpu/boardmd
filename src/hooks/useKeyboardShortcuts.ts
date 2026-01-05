import { useEffect } from "react";

interface KeyboardShortcutsConfig {
  onNewTask?: () => void;
  onSearch?: () => void;
  onDuplicate?: () => void;
  onCloseModal?: () => void;
  onClearSelection?: () => void;
  hasActiveSelection?: boolean;
}

export function useKeyboardShortcuts({
  onNewTask,
  onSearch,
  onDuplicate,
  onCloseModal,
  onClearSelection,
  hasActiveSelection,
}: KeyboardShortcutsConfig) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N - Nova tarefa
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        onNewTask?.();
        return;
      }

      // Ctrl/Cmd + F - Focar busca
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Ctrl/Cmd + D - Duplicar tarefa selecionada
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        onDuplicate?.();
        return;
      }

      // Esc - Limpar seleção de projeto ou fechar modal
      if (e.key === "Escape") {
        // Prioriza limpar seleção de projeto se houver uma ativa
        if (hasActiveSelection && onClearSelection) {
          onClearSelection();
          return;
        }
        onCloseModal?.();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onNewTask, onSearch, onDuplicate, onCloseModal, onClearSelection, hasActiveSelection]);
}
