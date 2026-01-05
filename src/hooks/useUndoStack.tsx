import { useState, useCallback, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/useToast";
import { Button } from "@/components/ui/button";

/**
 * Sistema de Undo Global
 * 
 * Gerencia uma pilha de ações recentes que podem ser desfeitas com Ctrl+Z
 * ou clicando no botão "Desfazer" no toast.
 * 
 * Ações suportadas:
 * - DELETE_TASK: Restaura tarefa deletada
 * - MOVE_TASK: Move tarefa de volta para coluna original
 * - COMPLETE_TASK: Reverte estado de conclusão
 * - UPDATE_TASK: Restaura dados anteriores da tarefa
 */

export type UndoActionType = 
  | "DELETE_TASK" 
  | "MOVE_TASK" 
  | "COMPLETE_TASK" 
  | "UPDATE_TASK"
  | "DELETE_NOTE"
  | "DELETE_NOTEBOOK";

export interface UndoAction {
  id: string;
  type: UndoActionType;
  description: string;
  timestamp: number;
  payload: {
    taskId?: string;
    noteId?: string;
    notebookId?: string;
    previousData?: Record<string, unknown>;
    previousColumnId?: string;
    previousPosition?: number;
    wasCompleted?: boolean;
    fullData?: Record<string, unknown>;
  };
}

const MAX_UNDO_STACK = 20;
const UNDO_TIMEOUT_MS = 30000;

interface UndoContextValue {
  pushAction: (action: Omit<UndoAction, "id" | "timestamp">) => string;
  undoLastAction: () => Promise<boolean>;
  canUndo: boolean;
}

const UndoContext = createContext<UndoContextValue | null>(null);

export function UndoProvider({ children }: { children: ReactNode }) {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const undoFnRef = useRef<() => Promise<boolean>>();

  // Desfaz a última ação
  const undoLastAction = useCallback(async (): Promise<boolean> => {
    if (isProcessing || undoStack.length === 0) return false;

    const action = undoStack[0];
    
    if (Date.now() - action.timestamp > UNDO_TIMEOUT_MS) {
      setUndoStack((prev) => prev.slice(1));
      toast({
        title: "Ação expirada",
        description: "O tempo para desfazer esta ação expirou",
        variant: "destructive",
      });
      return false;
    }

    setIsProcessing(true);

    try {
      switch (action.type) {
        case "DELETE_TASK":
          if (action.payload.fullData) {
            await supabase
              .from("trash")
              .delete()
              .eq("item_id", action.payload.taskId);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await supabase
              .from("tasks")
              .insert(action.payload.fullData as any);
            
            if (error) throw error;
          }
          break;

        case "MOVE_TASK":
          if (action.payload.taskId && action.payload.previousColumnId !== undefined) {
            const { error } = await supabase
              .from("tasks")
              .update({ 
                column_id: action.payload.previousColumnId,
                position: action.payload.previousPosition ?? 0,
              })
              .eq("id", action.payload.taskId);
            
            if (error) throw error;
          }
          break;

        case "COMPLETE_TASK":
          if (action.payload.taskId !== undefined) {
            const { error } = await supabase
              .from("tasks")
              .update({ is_completed: action.payload.wasCompleted ?? false })
              .eq("id", action.payload.taskId);
            
            if (error) throw error;
          }
          break;

        case "UPDATE_TASK":
          if (action.payload.taskId && action.payload.previousData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await supabase
              .from("tasks")
              .update(action.payload.previousData as any)
              .eq("id", action.payload.taskId);
            
            if (error) throw error;
          }
          break;

        case "DELETE_NOTE":
          if (action.payload.fullData) {
            await supabase
              .from("trash")
              .delete()
              .eq("item_id", action.payload.noteId);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await supabase
              .from("notes")
              .insert(action.payload.fullData as any);
            
            if (error) throw error;
          }
          break;

        case "DELETE_NOTEBOOK":
          if (action.payload.fullData) {
            await supabase
              .from("trash")
              .delete()
              .eq("item_id", action.payload.notebookId);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await supabase
              .from("notebooks")
              .insert(action.payload.fullData as any);
            
            if (error) throw error;
          }
          break;
      }

      setUndoStack((prev) => prev.slice(1));

      window.dispatchEvent(new CustomEvent("task-updated"));
      window.dispatchEvent(new CustomEvent("note-updated"));
      window.dispatchEvent(new CustomEvent("notebook-updated"));

      toast({
        title: "Ação desfeita",
        description: `"${action.description}" foi revertido`,
        duration: 2000,
      });

      return true;
    } catch (error) {
      console.error("Erro ao desfazer ação:", error);
      toast({
        title: "Erro ao desfazer",
        description: "Não foi possível reverter a ação",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [undoStack, isProcessing, toast]);

  // Keep ref updated
  undoFnRef.current = undoLastAction;

  // Adiciona ação à pilha
  const pushAction = useCallback((action: Omit<UndoAction, "id" | "timestamp">): string => {
    const newAction: UndoAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setUndoStack((prev) => {
      const now = Date.now();
      const validActions = prev.filter(a => now - a.timestamp < UNDO_TIMEOUT_MS);
      return [newAction, ...validActions].slice(0, MAX_UNDO_STACK);
    });

    toast({
      title: action.description,
      description: "Pressione Ctrl+Z para desfazer",
      duration: 5000,
      action: (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => undoFnRef.current?.()}
          className="shrink-0"
        >
          Desfazer
        </Button>
      ),
    });

    return newAction.id;
  }, [toast]);

  // Listener para Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
          return;
        }

        e.preventDefault();
        undoFnRef.current?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Limpa ações expiradas periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUndoStack((prev) => prev.filter(a => now - a.timestamp < UNDO_TIMEOUT_MS));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <UndoContext.Provider
      value={{
        pushAction,
        undoLastAction,
        canUndo: undoStack.length > 0 && !isProcessing,
      }}
    >
      {children}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error("useUndo must be used within an UndoProvider");
  }
  return context;
}
