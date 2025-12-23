import { Note } from "@/hooks/useNotes";
import { Notebook } from "@/hooks/useNotebooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { Check, X, Pin, Link2, CheckCircle2, Share2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
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
import { RichTextToolbar } from "./RichTextToolbar";
import { ColorPicker } from "./ColorPicker";
import { useTasks } from "@/hooks/useTasks";
import { useWebShare } from "@/hooks/useWebShare";
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
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || "");
  const [color, setColor] = useState(note.color || null);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  // Refs para rastrear mudanças e auto-save
  const hasUnsavedChanges = useRef(false);
  const currentNoteRef = useRef(note);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const colorRef = useRef(color);
  const onUpdateRef = useRef(onUpdate);

  // Buscar tarefas disponíveis
  const {
    tasks
  } = useTasks("all");
  const {
    share
  } = useWebShare();

  // Initialize lowlight for syntax highlighting
  const lowlight = createLowlight(common);
  const editor = useEditor({
    extensions: [StarterKit.configure({
      bulletList: {
        HTMLAttributes: {
          class: 'list-disc pl-6 my-2'
        },
        keepMarks: true
      },
      orderedList: {
        HTMLAttributes: {
          class: 'list-decimal pl-6 my-2'
        },
        keepMarks: true
      },
      listItem: {
        HTMLAttributes: {
          class: 'ml-1'
        }
      },
      codeBlock: false // Disable default code block to use lowlight version
    }), Underline, Link.configure({
      openOnClick: false,
      autolink: false,
      linkOnPaste: true
    }), TextAlign.configure({
      types: ["heading", "paragraph"]
    }), TextStyle, Color, FontSize, Highlight.configure({
      multicolor: true
    }), TaskList, TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: 'flex items-start gap-2 my-1'
      }
    }), Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'border-collapse table-auto w-full my-4'
      }
    }), TableRow, TableHeader.configure({
      HTMLAttributes: {
        class: 'border border-border bg-muted font-bold'
      }
    }), TableCell.configure({
      HTMLAttributes: {
        class: 'border border-border p-2'
      }
    }), Image.configure({
      inline: true,
      allowBase64: true,
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-lg my-2'
      }
    }), CodeBlockLowlight.configure({
      lowlight,
      HTMLAttributes: {
        class: 'rounded-lg bg-muted p-4 my-4 overflow-x-auto'
      }
    })],
    content: note.content || "",
    onUpdate: ({
      editor
    }) => {
      setContent(editor.getHTML());
    },
    editorProps: {
      // Preserve HTML formatting when pasting
      transformPastedHTML(html) {
        // Create a temporary container to process the HTML
        const container = document.createElement('div');
        container.innerHTML = html;

        // Preserve inline styles by converting them to data attributes or keeping them
        const elementsWithStyle = container.querySelectorAll('[style]');
        elementsWithStyle.forEach(el => {
          const style = el.getAttribute('style');
          if (style) {
            // Keep the style attribute as is
            el.setAttribute('style', style);
          }
        });

        // Preserve background colors on elements
        const allElements = container.querySelectorAll('*');
        allElements.forEach(el => {
          const computedStyle = (el as HTMLElement).style;

          // Preserve text color
          if (computedStyle.color) {
            (el as HTMLElement).style.color = computedStyle.color;
          }

          // Preserve background color
          if (computedStyle.backgroundColor) {
            (el as HTMLElement).style.backgroundColor = computedStyle.backgroundColor;
          }
        });
        return container.innerHTML;
      },
      handlePaste(view, event) {
        // Get clipboard data
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        // Check if there's HTML content
        const htmlContent = clipboardData.getData('text/html');
        if (htmlContent) {
          // Process the HTML to preserve formatting
          const processedHtml = processClipboardHtml(htmlContent);

          // Insert the processed HTML
          const {
            state,
            dispatch
          } = view;
          const {
            tr,
            schema
          } = state;

          // Create a temporary element to parse the HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = processedHtml;

          // Let TipTap handle the insertion with our processed HTML
          // Return false to allow default TipTap paste handling with our transformed HTML
          return false;
        }
        return false;
      },
      // Allow all HTML attributes
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none'
      }
    }
  });

  // Helper function to process clipboard HTML and preserve formatting
  const processClipboardHtml = (html: string): string => {
    const container = document.createElement('div');
    container.innerHTML = html;

    // Process all elements to preserve their visual styles
    const processElement = (el: Element) => {
      const htmlEl = el as HTMLElement;

      // Preserve styles that are important for visual formatting
      const importantStyles: string[] = [];
      if (htmlEl.style) {
        // Text colors
        if (htmlEl.style.color) {
          importantStyles.push(`color: ${htmlEl.style.color}`);
        }

        // Background colors
        if (htmlEl.style.backgroundColor) {
          importantStyles.push(`background-color: ${htmlEl.style.backgroundColor}`);
        }

        // Font styles
        if (htmlEl.style.fontWeight) {
          importantStyles.push(`font-weight: ${htmlEl.style.fontWeight}`);
        }
        if (htmlEl.style.fontStyle) {
          importantStyles.push(`font-style: ${htmlEl.style.fontStyle}`);
        }
        if (htmlEl.style.fontSize) {
          importantStyles.push(`font-size: ${htmlEl.style.fontSize}`);
        }

        // Borders
        if (htmlEl.style.border) {
          importantStyles.push(`border: ${htmlEl.style.border}`);
        }

        // Padding and margin
        if (htmlEl.style.padding) {
          importantStyles.push(`padding: ${htmlEl.style.padding}`);
        }
        if (htmlEl.style.margin) {
          importantStyles.push(`margin: ${htmlEl.style.margin}`);
        }

        // Text alignment
        if (htmlEl.style.textAlign) {
          importantStyles.push(`text-align: ${htmlEl.style.textAlign}`);
        }
      }

      // Apply preserved styles
      if (importantStyles.length > 0) {
        htmlEl.setAttribute('style', importantStyles.join('; '));
      }

      // Process children recursively
      Array.from(el.children).forEach(child => processElement(child));
    };

    // Process all top-level elements
    Array.from(container.children).forEach(child => processElement(child));
    return container.innerHTML;
  };

  // Sincronizar com mudanças externas da nota
  useEffect(() => {
    setTitle(note.title);
    setColor(note.color || null);
    if (editor && note.content !== editor.getHTML()) {
      editor.commands.setContent(note.content || "");
    }
    currentNoteRef.current = note;
    hasUnsavedChanges.current = false;
  }, [note.id, note.title, note.content, note.color, editor]);

  // Sincronizar refs com states atuais
  useEffect(() => {
    titleRef.current = title;
    contentRef.current = content;
    colorRef.current = color;
    onUpdateRef.current = onUpdate;
  }, [title, content, color, onUpdate]);

  // Rastrear mudanças para auto-save
  useEffect(() => {
    if (title !== note.title || content !== note.content || color !== note.color) {
      hasUnsavedChanges.current = true;
    }
  }, [title, content, color, note.title, note.content, note.color]);

  // Função de auto-save (silenciosa) - usa refs para garantir valores mais recentes
  const autoSave = () => {
    if (!hasUnsavedChanges.current) return;
    const currentTitle = titleRef.current;
    const currentContent = contentRef.current;
    const currentColor = colorRef.current;
    if (!currentTitle.trim() && !currentContent.trim()) return;
    onUpdateRef.current(currentNoteRef.current.id, {
      title: currentTitle.trim() || "Sem título",
      content: currentContent.trim(),
      color: currentColor
    });
    hasUnsavedChanges.current = false;
  };

  // Auto-save ao trocar de nota (cleanup do useEffect)
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges.current) {
        autoSave();
      }
    };
  }, [note.id]);

  // Auto-save ao recarregar página ou fechar aba
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current) {
        autoSave();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [title, content, color]);

  // Listener para evento customizado de salvamento
  useEffect(() => {
    const handleSaveEvent = () => {
      console.log("[NOTA AUTO-SAVE] Evento 'save-current-note' recebido");
      if (hasUnsavedChanges.current) {
        console.log("[NOTA AUTO-SAVE] Salvando mudanças pendentes...");
        autoSave();
      }
    };
    window.addEventListener('save-current-note', handleSaveEvent);
    return () => window.removeEventListener('save-current-note', handleSaveEvent);
  }, []);

  // Auto-save ao navegar para outra página (cleanup quando componente desmonta)
  useEffect(() => {
    return () => {
      console.log("[NOTA AUTO-SAVE] Componente desmontando, verificando mudanças...");
      if (hasUnsavedChanges.current) {
        console.log("[NOTA AUTO-SAVE] Salvando ao desmontar componente");
        const currentTitle = titleRef.current;
        const currentContent = contentRef.current;
        const currentColor = colorRef.current;
        if (!currentTitle.trim() && !currentContent.trim()) return;
        onUpdateRef.current(currentNoteRef.current.id, {
          title: currentTitle.trim() || "Sem título",
          content: currentContent.trim(),
          color: currentColor
        });
      }
    };
  }, []);

  // Atalho de teclado para salvar (Ctrl+Enter / Cmd+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [title, content, color]);
  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      toast.error("Adicione um título ou conteúdo");
      return;
    }
    onUpdate(note.id, {
      title: title.trim() || "Sem título",
      content: content.trim(),
      color
    });
    hasUnsavedChanges.current = false;
    toast.success("Nota salva!");
    setShowSavedIndicator(true);
    setTimeout(() => setShowSavedIndicator(false), 2000);
    if (onSave) {
      onSave();
    }
  };
  const handleCancel = () => {
    setTitle(note.title);
    setContent(note.content || "");
    setColor(note.color || null);
    toast.info("Alterações descartadas");
  };
  const handleColorChange = (newColor: string | null) => {
    setColor(newColor);
  };
  const handleShare = () => {
    const plainText = editor?.getText() || "";
    share({
      title: "Nota - " + (title || "Sem título"),
      text: plainText.substring(0, 500) + (plainText.length > 500 ? "..." : ""),
      url: window.location.href
    });
  };
  return <div className="flex flex-col min-h-[100dvh] transition-colors" style={{
    backgroundColor: color || undefined
  }}>
      {/* Título e ações */}
      <div className="p-4 sm:p-6 border-b space-y-3 flex-shrink-0">
        <div className="flex items-start gap-2">
          <Input placeholder="Título da anotação..." value={title} onChange={e => setTitle(e.target.value)} className="text-xl sm:text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 flex-1 bg-transparent" />
          <div className="flex gap-2">
            <Button variant={note.is_pinned ? "default" : "outline"} size="icon" onClick={() => onTogglePin(note.id)} className="h-10 w-10 shrink-0">
              <Pin className={`h-4 w-4 ${note.is_pinned ? "fill-current" : ""}`} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare} className="h-10 w-10 shrink-0" title="Compartilhar nota">
              <Share2 className="h-4 w-4" />
            </Button>
            <ColorPicker currentColor={color} onColorChange={handleColorChange} />
          </div>
        </div>

        {/* Indicador de salvamento */}
        {showSavedIndicator && <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Nota salva</span>
          </div>}

        {/* Mover para caderno */}
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <Select value={note.notebook_id || "none"} onValueChange={value => {
          const notebookId = value === "none" ? null : value;
          onMoveToNotebook(note.id, notebookId);
        }}>
            <SelectTrigger className="w-full sm:w-[300px] h-9 text-sm">
              <SelectValue placeholder="Selecione um caderno..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Nenhum caderno</span>
              </SelectItem>
              {notebooks.map(notebook => <SelectItem key={notebook.id} value={notebook.id}>
                  {notebook.name}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Vincular a tarefa */}
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <Select value={linkedTaskId || "none"} onValueChange={value => setLinkedTaskId(value === "none" ? null : value)}>
            <SelectTrigger className="w-full sm:w-[300px] h-9 text-sm">
              <SelectValue placeholder="Vincular a uma tarefa..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Nenhuma tarefa vinculada</span>
              </SelectItem>
              {tasks.map(task => <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Editor de conteúdo */}
      <div className="flex-1 flex flex-col min-h-0 my-0 py-0">
        <RichTextToolbar editor={editor} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-6 my-0 mb-[50px]">
          <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:min-h-[calc(100vh-320px)] [&_.ProseMirror]:outline-none" />
        </div>
      </div>

      {/* Botões de ação */}
      <div className="sticky bottom-0 left-0 right-0 p-4 sm:p-6 border-t gap-2 bg-card backdrop-blur supports-[backdrop-filter]:bg-card/95 shadow-lg z-10 px-0 my-[30px] items-center justify-start py-0 pt-0 pb-[50px] flex flex-row">
        <Button onClick={handleSave} className="flex-1 min-h-[48px]">
          <Check className="w-4 h-4 mr-2" />
          Salvar
          <kbd className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-xs bg-muted rounded">
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+↵
          </kbd>
        </Button>
        <Button onClick={handleCancel} variant="outline" className="flex-1 min-h-[48px]">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </div>;
}