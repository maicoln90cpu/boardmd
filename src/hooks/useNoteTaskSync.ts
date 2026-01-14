import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Editor } from "@tiptap/react";
import { logger } from "@/lib/logger";

interface TaskBlockNode {
  taskId: string;
  isCompleted: boolean;
}

/**
 * Hook para sincronização bidirecional entre blocos de tarefa nas notas e tarefas no Kanban
 * 
 * Funcionalidades:
 * 1. Quando checkbox na nota é marcado → atualiza is_completed da tarefa no banco
 * 2. Quando tarefa é atualizada no Kanban → atualiza checkbox na nota via Realtime
 */
export function useNoteTaskSync(editor: Editor | null) {
  const { user } = useAuth();
  const editorRef = useRef(editor);
  
  // Manter ref atualizada
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  /**
   * Atualiza is_completed da tarefa no banco de dados
   */
  const updateTaskCompletion = useCallback(async (taskId: string, isCompleted: boolean) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          is_completed: isCompleted,
          updated_at: new Date().toISOString()
        })
        .eq("id", taskId)
        .eq("user_id", user.id);

      if (error) {
        logger.error("Erro ao atualizar tarefa:", error);
        toast.error("Erro ao sincronizar tarefa");
        return false;
      }

      // Registrar no histórico
      await supabase.from("task_history").insert([{
        task_id: taskId,
        user_id: user.id,
        action: "updated",
        changes: { is_completed: isCompleted, source: "note" }
      }]);

      return true;
    } catch (err) {
      logger.error("Erro na sincronização:", err);
      return false;
    }
  }, [user]);

  /**
   * Busca todos os task blocks no editor atual
   */
  const getTaskBlocksFromEditor = useCallback((): TaskBlockNode[] => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return [];

    const taskBlocks: TaskBlockNode[] = [];
    
    currentEditor.state.doc.descendants((node) => {
      if (node.type.name === 'taskBlock' && node.attrs.taskId) {
        taskBlocks.push({
          taskId: node.attrs.taskId,
          isCompleted: node.attrs.isCompleted
        });
      }
    });

    return taskBlocks;
  }, []);

  /**
   * Atualiza um bloco de tarefa específico no editor
   */
  const updateTaskBlockInEditor = useCallback((taskId: string, updates: Partial<{ isCompleted: boolean; title: string; priority: string; dueDate: string }>) => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;

    const { state } = currentEditor;
    const { tr } = state;
    let updated = false;

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'taskBlock' && node.attrs.taskId === taskId) {
        const newAttrs = { ...node.attrs, ...updates };
        tr.setNodeMarkup(pos, undefined, newAttrs);
        updated = true;
      }
    });

    if (updated) {
      currentEditor.view.dispatch(tr);
    }
  }, []);

  /**
   * Subscreve às mudanças em tempo real das tarefas
   */
  useEffect(() => {
    if (!user || !editor) return;

    const channel = supabase
      .channel('task-sync-for-notes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedTask = payload.new as {
            id: string;
            is_completed: boolean;
            title: string;
            priority: string;
            due_date: string | null;
          };

          // Verificar se esta tarefa existe como bloco no editor
          const taskBlocks = getTaskBlocksFromEditor();
          const existingBlock = taskBlocks.find(tb => tb.taskId === updatedTask.id);

          if (existingBlock) {
            // Só atualizar se o estado for diferente (evita loops)
            if (existingBlock.isCompleted !== updatedTask.is_completed) {
              updateTaskBlockInEditor(updatedTask.id, {
                isCompleted: updatedTask.is_completed,
                title: updatedTask.title,
                priority: updatedTask.priority,
                dueDate: updatedTask.due_date || undefined
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, editor, getTaskBlocksFromEditor, updateTaskBlockInEditor]);

  return {
    updateTaskCompletion,
    updateTaskBlockInEditor,
    getTaskBlocksFromEditor
  };
}
