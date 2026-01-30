import { Note } from "@/hooks/useNotes";
import { Notebook } from "@/hooks/useNotebooks";
import { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { HeadingWithId } from "./extensions/HeadingWithIdExtension";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Image } from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import FontSize from "@tiptap/extension-font-size";
import { common, createLowlight } from "lowlight";
import { TaskSelectorModal } from "./TaskSelectorModal";
import { useNoteTaskSync } from "@/hooks/useNoteTaskSync";
import { TaskBlockExtension } from "./extensions/TaskBlockExtension";
import { PriorityBadgeExtension } from "./extensions/PriorityBadgeExtension";

// Refactored components
import { NoteEditorHeader } from "./NoteEditorHeader";
import { NoteEditorContent } from "./NoteEditorContent";
import { NoteEditorFooter } from "./NoteEditorFooter";
import { useNoteEditorState } from "./hooks/useNoteEditorState";

interface NoteEditorProps {
  note: Note;
  notebooks: Notebook[];
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onTogglePin: (id: string) => void;
  onMoveToNotebook: (noteId: string, notebookId: string | null) => void;
  onSave?: () => void;
  className?: string;
}

export function NoteEditor({
  note,
  notebooks,
  onUpdate,
  onTogglePin,
  onMoveToNotebook,
  onSave,
  className
}: NoteEditorProps) {
  const state = useNoteEditorState({ note, onUpdate, onSave });

  // Initialize lowlight for syntax highlighting
  const lowlight = createLowlight(common);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: {
          HTMLAttributes: { class: 'list-disc pl-6 my-2' },
          keepMarks: true
        },
        orderedList: {
          HTMLAttributes: { class: 'list-decimal pl-6 my-2' },
          keepMarks: true
        },
        listItem: {
          HTMLAttributes: { class: 'ml-1' }
        },
        codeBlock: false
      }), 
      HeadingWithId.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      Underline, 
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: true
      }), 
      TextAlign.configure({ types: ["heading", "paragraph"] }), 
      TextStyle, 
      Color, 
      FontSize, 
      Highlight.configure({ multicolor: true }), 
      TaskList, 
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: 'flex items-start gap-2 my-1' }
      }), 
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'border-collapse table-auto w-full my-4' }
      }), 
      TableRow, 
      TableHeader.configure({
        HTMLAttributes: { class: 'border border-border bg-muted font-bold' }
      }), 
      TableCell.configure({
        HTMLAttributes: { class: 'border border-border p-2' }
      }), 
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: { class: 'max-w-full h-auto rounded-lg my-2' }
      }), 
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: { class: 'rounded-lg bg-muted p-4 my-4 overflow-x-auto' }
      }), 
      TaskBlockExtension, 
      PriorityBadgeExtension
    ],
    content: note.content || "",
    onUpdate: ({ editor }) => {
      state.setContent(editor.getHTML());
    },
    editorProps: {
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement;
        const link = target.closest('a');
        
        if (!link) return false;
        
        const href = link.getAttribute('href');
        if (!href) return false;
        
        // Internal anchor link (starts with #)
        if (href.startsWith('#')) {
          event.preventDefault();
          event.stopPropagation();
          
          const targetId = href.slice(1);
          const editorElement = view.dom;
          
          let targetElement: Element | null = editorElement.querySelector(`[id="${targetId}"]`);
          
          if (!targetElement) {
            targetElement = editorElement.querySelector(`[data-id="${targetId}"]`);
          }
          
          if (!targetElement) {
            const headings = editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const normalizedTargetId = targetId.toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '');
            
            for (const heading of headings) {
              const headingText = heading.textContent?.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '') || '';
              if (headingText.includes(normalizedTargetId) || 
                  normalizedTargetId.split(' ').some(word => word.length > 2 && headingText.includes(word))) {
                targetElement = heading;
                break;
              }
            }
          }
          
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            targetElement.classList.add('toc-target-highlight');
            setTimeout(() => targetElement?.classList.remove('toc-target-highlight'), 2000);
          }
          
          return true;
        }
        
        // External links - open in new tab
        event.preventDefault();
        event.stopPropagation();
        window.open(href, '_blank', 'noopener,noreferrer');
        return true;
      },
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none'
      }
    }
  });

  // Hook for bidirectional sync with Kanban via Realtime
  useNoteTaskSync(editor);

  // Sync with external note changes
  useEffect(() => {
    state.syncWithNote(editor);
  }, [note.id, note.title, note.content, note.color, note.linked_task_id, editor, state.syncWithNote]);

  // Auto-save when switching notes
  useEffect(() => {
    return () => {
      if (state.hasUnsavedChanges.current) {
        state.autoSave();
      }
    };
  }, [note.id]);

  // Auto-save on page reload or tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (state.hasUnsavedChanges.current) {
        state.autoSave();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.autoSave]);

  // Listener for custom save event
  useEffect(() => {
    const handleSaveEvent = () => {
      if (state.hasUnsavedChanges.current) {
        state.autoSave();
      }
    };
    window.addEventListener('save-current-note', handleSaveEvent);
    return () => window.removeEventListener('save-current-note', handleSaveEvent);
  }, [state.autoSave]);

  // Handle hash in URL on mount (e.g., /notes#section)
  useEffect(() => {
    if (!editor) return;
    
    const hash = window.location.hash;
    if (hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      
      const targetId = hash.slice(1);
      const editorElement = editor.view.dom;
      
      setTimeout(() => {
        let targetElement: Element | null = editorElement.querySelector(`[id="${targetId}"]`);
        
        if (!targetElement) {
          targetElement = editorElement.querySelector(`[data-id="${targetId}"]`);
        }
        
        if (!targetElement) {
          const headings = editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
          const normalizedTargetId = targetId.toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9\s]/g, '');
          
          for (const heading of headings) {
            const headingText = heading.textContent?.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '') || '';
            if (headingText.includes(normalizedTargetId) || 
                normalizedTargetId.split(' ').some(word => word.length > 2 && headingText.includes(word))) {
              targetElement = heading;
              break;
            }
          }
        }
        
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          targetElement.classList.add('toc-target-highlight');
          setTimeout(() => targetElement?.classList.remove('toc-target-highlight'), 2000);
        }
      }, 200);
    }
  }, [editor, note.id]);

  // Auto-save when navigating to another page
  useEffect(() => {
    return () => {
      if (state.hasUnsavedChanges.current) {
        const currentTitle = state.titleRef.current;
        const currentContent = state.contentRef.current;
        const currentColor = state.colorRef.current;
        if (!currentTitle.trim() && !currentContent.trim()) return;
        state.onUpdateRef.current(state.currentNoteRef.current.id, {
          title: currentTitle.trim() || "Sem título",
          content: currentContent.trim(),
          color: currentColor,
          linked_task_id: state.linkedTaskId
        });
      }
    };
  }, []);

  // Keyboard shortcuts for save (Ctrl+Enter) and insert task (Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        state.handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        state.setShowTaskSelectorShortcut(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.handleSave]);

  const handleInsertTaskBlock = useCallback((task: any) => {
    state.handleInsertTaskBlock(editor, task);
  }, [editor, state.handleInsertTaskBlock]);

  return (
    <div 
      className="flex flex-col h-full min-h-0 overflow-hidden transition-colors" 
      style={{ backgroundColor: state.color || undefined }}
    >
      <NoteEditorHeader
        note={note}
        title={state.title}
        onTitleChange={state.setTitle}
        color={state.color}
        onColorChange={state.handleColorChange}
        notebooks={notebooks}
        onMoveToNotebook={onMoveToNotebook}
        onTogglePin={onTogglePin}
        onShare={() => state.handleShare(editor)}
        showSavedIndicator={state.showSavedIndicator}
        linkedTaskId={state.linkedTaskId}
        onLinkedTaskChange={state.setLinkedTaskId}
        tasks={state.tasks}
        taskSearchOpen={state.taskSearchOpen}
        onTaskSearchOpenChange={state.setTaskSearchOpen}
      />

      <NoteEditorContent
        editor={editor}
        tasks={state.tasks}
        onInsertTaskBlock={handleInsertTaskBlock}
        onCreateTask={state.handleCreateTask}
      />

      <NoteEditorFooter
        wordCount={state.wordCount}
        charCount={state.charCount}
        onSave={state.handleSave}
        onCancel={state.handleCancel}
        isSaving={state.isSaving}
        lastSaved={state.lastSaved}
      />

      {/* Task selector modal via Ctrl+Shift+T shortcut */}
      <TaskSelectorModal
        open={state.showTaskSelectorShortcut}
        onOpenChange={state.setShowTaskSelectorShortcut}
        tasks={state.tasks}
        onSelectTask={handleInsertTaskBlock}
        onCreateTask={state.handleCreateTask}
      />
    </div>
  );
}
