import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Note } from "@/hooks/useNotes";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, Task } from "@/hooks/tasks/useTasks";
import { useWebShare } from "@/hooks/useWebShare";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Editor } from "@tiptap/react";

interface UseNoteEditorStateProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onSave?: () => void;
}

export function useNoteEditorState({ note, onUpdate, onSave }: UseNoteEditorStateProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || "");
  const [color, setColor] = useState(note.color || null);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(note.linked_task_id || null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [taskSearchOpen, setTaskSearchOpen] = useState(false);
  const [showTaskSelectorShortcut, setShowTaskSelectorShortcut] = useState(false);
  
  const linkedTaskIdRef = useRef(linkedTaskId);
  const hasUnsavedChanges = useRef(false);
  const currentNoteRef = useRef(note);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const colorRef = useRef(color);
  const onUpdateRef = useRef(onUpdate);

  const { tasks, fetchTasks: refetchTasks } = useTasks("all");
  const { share } = useWebShare();
  const { user } = useAuth();

  // Word and character counter
  const wordCount = useMemo(() => {
    if (!content) return 0;
    const stripped = content.replace(/<[^>]*>/g, '').trim();
    if (!stripped) return 0;
    return stripped.split(/\s+/).filter(word => word.length > 0).length;
  }, [content]);

  const charCount = useMemo(() => {
    if (!content) return 0;
    return content.replace(/<[^>]*>/g, '').length;
  }, [content]);

  // Sync refs with current state
  useEffect(() => {
    titleRef.current = title;
    contentRef.current = content;
    colorRef.current = color;
    linkedTaskIdRef.current = linkedTaskId;
    onUpdateRef.current = onUpdate;
  }, [title, content, color, linkedTaskId, onUpdate]);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save function (silent)
  const autoSave = useCallback(() => {
    if (!hasUnsavedChanges.current) return;
    const currentTitle = titleRef.current;
    const currentContent = contentRef.current;
    const currentColor = colorRef.current;
    const currentLinkedTaskId = linkedTaskIdRef.current;
    if (!currentTitle.trim() && !currentContent.trim()) return;
    
    setIsSaving(true);
    onUpdateRef.current(currentNoteRef.current.id, {
      title: currentTitle.trim() || "Sem título",
      content: currentContent.trim(),
      color: currentColor,
      linked_task_id: currentLinkedTaskId
    });
    hasUnsavedChanges.current = false;
    
    // Update saved indicator
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 300);
  }, []);

  // Track changes for auto-save with 3-second debounce
  useEffect(() => {
    if (title !== note.title || content !== note.content || color !== note.color || linkedTaskId !== note.linked_task_id) {
      hasUnsavedChanges.current = true;
      
      // Clear previous timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // Schedule auto-save after 3 seconds of inactivity
      autoSaveTimerRef.current = setTimeout(() => {
        if (hasUnsavedChanges.current) {
          autoSave();
        }
      }, 3000);
    }
  }, [title, content, color, linkedTaskId, note.title, note.content, note.color, note.linked_task_id, autoSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Sync with external note changes
  const syncWithNote = useCallback((editor: Editor | null) => {
    setTitle(note.title);
    setColor(note.color || null);
    setLinkedTaskId(note.linked_task_id || null);
    if (editor && note.content !== editor.getHTML()) {
      editor.commands.setContent(note.content || "");
    }
    currentNoteRef.current = note;
    hasUnsavedChanges.current = false;
  }, [note]);

  const handleSave = useCallback(() => {
    if (!title.trim() && !content.trim()) {
      toast.error("Adicione um título ou conteúdo");
      return;
    }
    
    const previousTaskId = note.linked_task_id;
    const newTaskId = linkedTaskId;
    
    onUpdate(note.id, {
      title: title.trim() || "Sem título",
      content: content.trim(),
      color,
      linked_task_id: newTaskId
    });
    
    if (previousTaskId !== newTaskId) {
      window.dispatchEvent(new CustomEvent('task-updated'));
    }
    
    hasUnsavedChanges.current = false;
    toast.success("Nota salva!");
    setShowSavedIndicator(true);
    setTimeout(() => setShowSavedIndicator(false), 2000);
    onSave?.();
  }, [title, content, color, linkedTaskId, note, onUpdate, onSave]);

  const handleCancel = useCallback(() => {
    setTitle(note.title);
    setContent(note.content || "");
    setColor(note.color || null);
    toast.info("Alterações descartadas");
  }, [note]);

  const handleColorChange = useCallback((newColor: string | null) => {
    setColor(newColor);
  }, []);

  const handleShare = useCallback((editor: Editor | null) => {
    const plainText = editor?.getText() || "";
    share({
      title: "Nota - " + (title || "Sem título"),
      text: plainText.substring(0, 500) + (plainText.length > 500 ? "..." : ""),
      url: window.location.href
    });
  }, [title, share]);

  const handleInsertTaskBlock = useCallback((editor: Editor | null, task: Task) => {
    if (!editor) return;
    
    editor.chain().focus().insertTaskBlock({
      taskId: task.id,
      title: task.title,
      isCompleted: task.is_completed ?? false,
      priority: task.priority || 'medium',
      dueDate: task.due_date || undefined,
    }).run();
    
    toast.success(`Tarefa "${task.title}" inserida`);
  }, []);

  const handleCreateTask = useCallback(async (taskData: { title: string; description?: string; priority: string }): Promise<Task | null> => {
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id")
      .limit(1)
      .single();

    const { data: columnsData } = await supabase
      .from("columns")
      .select("id")
      .order("position")
      .limit(1)
      .single();

    if (!categoriesData || !columnsData) {
      toast.error("Erro: Configure categorias e colunas primeiro");
      return null;
    }

    if (!user) {
      toast.error("Erro: Você precisa estar logado");
      return null;
    }

    const { data: newTask, error } = await supabase
      .from("tasks")
      .insert([{
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority,
        category_id: categoriesData.id,
        column_id: columnsData.id,
        position: 0,
        is_completed: false,
        is_favorite: false,
        user_id: user.id,
      }])
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar tarefa");
      return null;
    }

    toast.success("Tarefa criada com sucesso");
    await refetchTasks();
    
    return newTask as unknown as Task;
  }, [user, refetchTasks]);

  return {
    // State
    title,
    setTitle,
    content,
    setContent,
    color,
    linkedTaskId,
    setLinkedTaskId,
    showSavedIndicator,
    taskSearchOpen,
    setTaskSearchOpen,
    showTaskSelectorShortcut,
    setShowTaskSelectorShortcut,
    
    // Auto-save state
    isSaving,
    lastSaved,
    
    // Refs
    hasUnsavedChanges,
    currentNoteRef,
    titleRef,
    contentRef,
    colorRef,
    onUpdateRef,
    
    // Computed
    wordCount,
    charCount,
    tasks,
    
    // Handlers
    autoSave,
    syncWithNote,
    handleSave,
    handleCancel,
    handleColorChange,
    handleShare,
    handleInsertTaskBlock,
    handleCreateTask,
  };
}
