import { Note } from "@/hooks/useNotes";
import { Notebook } from "@/hooks/useNotebooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Check, X, Pin, Link2, CheckCircle2, Share2, BookOpen, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
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
import { RichTextToolbar } from "./RichTextToolbar";
import { TaskSelectorModal } from "./TaskSelectorModal";
import { ColorPicker } from "./ColorPicker";
import { useTasks, Task } from "@/hooks/tasks/useTasks";
import { useWebShare } from "@/hooks/useWebShare";
import { useNoteTaskSync } from "@/hooks/useNoteTaskSync";
import { TaskBlockExtension } from "./extensions/TaskBlockExtension";
import { PriorityBadgeExtension } from "./extensions/PriorityBadgeExtension";
import { supabase } from "@/integrations/supabase/client";
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
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(note.linked_task_id || null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [taskSearchOpen, setTaskSearchOpen] = useState(false);
  const linkedTaskIdRef = useRef(linkedTaskId);

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

  // Refs para rastrear mudanças e auto-save
  const hasUnsavedChanges = useRef(false);
  const currentNoteRef = useRef(note);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const colorRef = useRef(color);
  const onUpdateRef = useRef(onUpdate);

  // Buscar tarefas disponíveis
  const {
    tasks,
    addTask,
    fetchTasks: refetchTasks
  } = useTasks("all");
  const {
    share
  } = useWebShare();
  const { user } = useAuth();

  // Initialize lowlight for syntax highlighting
  const lowlight = createLowlight(common);
  const editor = useEditor({
    extensions: [StarterKit.configure({
      // Disable default heading to use our HeadingWithId extension that preserves IDs
      heading: false,
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
    }), 
    // Custom heading extension that preserves 'id' attributes for TOC
    HeadingWithId.configure({
      levels: [1, 2, 3, 4, 5, 6],
    }),
    Underline, Link.configure({
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
    }), TaskBlockExtension, PriorityBadgeExtension],
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

  // Hook para sincronização bidirecional com Kanban via Realtime
  useNoteTaskSync(editor);

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
    setLinkedTaskId(note.linked_task_id || null);
    if (editor && note.content !== editor.getHTML()) {
      editor.commands.setContent(note.content || "");
    }
    currentNoteRef.current = note;
    hasUnsavedChanges.current = false;
  }, [note.id, note.title, note.content, note.color, note.linked_task_id, editor]);

  // Sincronizar refs com states atuais
  useEffect(() => {
    titleRef.current = title;
    contentRef.current = content;
    colorRef.current = color;
    linkedTaskIdRef.current = linkedTaskId;
    onUpdateRef.current = onUpdate;
  }, [title, content, color, linkedTaskId, onUpdate]);

  // Rastrear mudanças para auto-save
  useEffect(() => {
    if (title !== note.title || content !== note.content || color !== note.color || linkedTaskId !== note.linked_task_id) {
      hasUnsavedChanges.current = true;
    }
  }, [title, content, color, linkedTaskId, note.title, note.content, note.color, note.linked_task_id]);

  // Função de auto-save (silenciosa) - usa refs para garantir valores mais recentes
  const autoSave = () => {
    if (!hasUnsavedChanges.current) return;
    const currentTitle = titleRef.current;
    const currentContent = contentRef.current;
    const currentColor = colorRef.current;
    const currentLinkedTaskId = linkedTaskIdRef.current;
    if (!currentTitle.trim() && !currentContent.trim()) return;
    onUpdateRef.current(currentNoteRef.current.id, {
      title: currentTitle.trim() || "Sem título",
      content: currentContent.trim(),
      color: currentColor,
      linked_task_id: currentLinkedTaskId
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
      if (hasUnsavedChanges.current) {
        autoSave();
      }
    };
    window.addEventListener('save-current-note', handleSaveEvent);
    return () => window.removeEventListener('save-current-note', handleSaveEvent);
  }, []);

  // Handler para hash na URL ao montar (ex: /notes#ferramentas)
  useEffect(() => {
    if (!editor) return;
    
    const hash = window.location.hash;
    if (hash) {
      // Remover o hash da URL sem navegar
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      
      const targetId = hash.slice(1);
      const editorElement = editor.view.dom;
      
      // Aguardar o editor renderizar
      setTimeout(() => {
        let targetElement: Element | null = editorElement.querySelector(`[id="${targetId}"]`);
        
        if (!targetElement) {
          targetElement = editorElement.querySelector(`[data-id="${targetId}"]`);
        }
        
        // Fallback: buscar heading por texto
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

  // Handler para cliques em links âncora do TOC (scroll interno)
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    
    if (!link || !editor) return;
    
    const href = link.getAttribute('href');
    
    // Se é um link âncora interno (começa com #)
    if (href && href.startsWith('#')) {
      e.preventDefault();
      e.stopPropagation();
      
      const targetId = href.slice(1);
      const editorElement = editor.view.dom;
      
      // Busca primária: por ID exato
      let targetElement: Element | null = editorElement.querySelector(`[id="${targetId}"]`);
      
      // Fallback: buscar por data-id
      if (!targetElement) {
        targetElement = editorElement.querySelector(`[data-id="${targetId}"]`);
      }
      
      // Fallback 2: buscar heading com texto similar ao ID
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
      } else {
        console.warn(`[TOC] Section not found: #${targetId}`);
        toast.error("Seção não encontrada. Tente regenerar o índice.");
      }
      
      return;
    }
    
    // Links externos - abrir em nova aba
    if (href && !href.startsWith('#')) {
      e.preventDefault();
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }, [editor]);

  // Auto-save ao navegar para outra página (cleanup quando componente desmonta)
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges.current) {
        const currentTitle = titleRef.current;
        const currentContent = contentRef.current;
        const currentColor = colorRef.current;
        const currentLinkedTaskId = linkedTaskIdRef.current;
        if (!currentTitle.trim() && !currentContent.trim()) return;
        onUpdateRef.current(currentNoteRef.current.id, {
          title: currentTitle.trim() || "Sem título",
          content: currentContent.trim(),
          color: currentColor,
          linked_task_id: currentLinkedTaskId
        });
      }
    };
  }, []);

  // Estado para modal de inserir tarefa via atalho
  const [showTaskSelectorShortcut, setShowTaskSelectorShortcut] = useState(false);

  // Atalhos de teclado para salvar (Ctrl+Enter) e inserir tarefa (Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+Shift+T para inserir tarefa do Kanban
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setShowTaskSelectorShortcut(true);
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
    
    const previousTaskId = note.linked_task_id;
    const newTaskId = linkedTaskId;
    
    // Atualizar a nota - o trigger do banco sincroniza automaticamente linked_note_id nas tasks
    onUpdate(note.id, {
      title: title.trim() || "Sem título",
      content: content.trim(),
      color,
      linked_task_id: newTaskId
    });
    
    // Disparar evento para atualizar UI se a tarefa vinculada mudou
    if (previousTaskId !== newTaskId) {
      window.dispatchEvent(new CustomEvent('task-updated'));
    }
    
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

  // Inserir bloco de tarefa do Kanban no editor
  const handleInsertTaskBlock = useCallback((task: Task) => {
    if (!editor) return;
    
    editor.chain().focus().insertTaskBlock({
      taskId: task.id,
      title: task.title,
      isCompleted: task.is_completed ?? false,
      priority: task.priority || 'medium',
      dueDate: task.due_date || undefined,
    }).run();
    
    toast.success(`Tarefa "${task.title}" inserida`);
  }, [editor]);

  // Criar nova tarefa e retorná-la para inserção
  const handleCreateTask = useCallback(async (taskData: { title: string; description?: string; priority: string }): Promise<Task | null> => {
    // Buscar primeira categoria e coluna para inserir a tarefa
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

    // Criar a tarefa
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
      console.error("Erro ao criar tarefa:", error);
      return null;
    }

    toast.success("Tarefa criada com sucesso");
    
    // Refetch tasks para atualizar a lista
    await refetchTasks();
    
    return newTask as unknown as Task;
  }, [refetchTasks]);

  return (
    <div 
      className="flex flex-col h-full min-h-0 overflow-hidden transition-colors" 
      style={{ backgroundColor: color || undefined }}
    >
      {/* Título e ações */}
      <div className="p-4 sm:p-6 border-b space-y-3 flex-shrink-0">
        <div className="flex items-start gap-2">
          <Input 
            placeholder="Título da anotação..." 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            className="text-xl sm:text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 flex-1 bg-transparent" 
          />
          <div className="flex gap-2">
            <Button 
              variant={note.is_pinned ? "default" : "outline"} 
              size="icon" 
              onClick={() => onTogglePin(note.id)} 
              className="h-10 w-10 shrink-0"
            >
              <Pin className={`h-4 w-4 ${note.is_pinned ? "fill-current" : ""}`} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleShare} 
              className="h-10 w-10 shrink-0" 
              title="Compartilhar nota"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <ColorPicker currentColor={color} onColorChange={handleColorChange} />
          </div>
        </div>

        {/* Indicador de salvamento */}
        {showSavedIndicator && (
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Nota salva</span>
          </div>
        )}

        {/* Mover para caderno */}
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <Select 
            value={note.notebook_id || "none"} 
            onValueChange={value => {
              const notebookId = value === "none" ? null : value;
              onMoveToNotebook(note.id, notebookId);
            }}
          >
            <SelectTrigger className="w-full sm:w-[300px] h-9 text-sm">
              <SelectValue placeholder="Selecione um caderno..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Nenhum caderno</span>
              </SelectItem>
              {notebooks.map(notebook => (
                <SelectItem key={notebook.id} value={notebook.id}>
                  {notebook.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Vincular a tarefa */}
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <Popover open={taskSearchOpen} onOpenChange={setTaskSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={taskSearchOpen}
                className="w-full sm:w-[300px] h-9 justify-between text-sm font-normal"
              >
                {linkedTaskId
                  ? tasks.find(t => t.id === linkedTaskId)?.title || "Tarefa selecionada"
                  : "Vincular a uma tarefa..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar tarefa..." />
                <CommandList>
                  <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="none"
                      onSelect={() => {
                        setLinkedTaskId(null);
                        setTaskSearchOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${!linkedTaskId ? "opacity-100" : "opacity-0"}`}
                      />
                      <span className="text-muted-foreground">Nenhuma tarefa vinculada</span>
                    </CommandItem>
                    {tasks.map(task => (
                      <CommandItem
                        key={task.id}
                        value={task.title}
                        onSelect={() => {
                          setLinkedTaskId(task.id);
                          setTaskSearchOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${linkedTaskId === task.id ? "opacity-100" : "opacity-0"}`}
                        />
                        {task.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Editor de conteúdo - área com scroll */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <RichTextToolbar 
          editor={editor} 
          tasks={tasks}
          onInsertTaskBlock={handleInsertTaskBlock}
          onCreateTask={handleCreateTask}
        />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6" onClickCapture={handleEditorClick}>
          <EditorContent 
            editor={editor} 
            className="prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none" 
          />
        </div>
      </div>

      {/* Footer: Word/Character counter */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-2 border-t bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="font-medium">{wordCount.toLocaleString()}</span>
          {wordCount === 1 ? "palavra" : "palavras"}
        </span>
        <span className="w-px h-3 bg-border" />
        <span className="flex items-center gap-1.5">
          <span className="font-medium">{charCount.toLocaleString()}</span>
          {charCount === 1 ? "caractere" : "caracteres"}
        </span>
      </div>

      {/* Botões de ação */}
      <div className="flex-shrink-0 p-4 sm:p-6 border-t gap-2 bg-card/95 backdrop-blur shadow-lg flex flex-row">
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

      {/* Modal de seleção de tarefa via atalho Ctrl+Shift+T */}
      <TaskSelectorModal
        open={showTaskSelectorShortcut}
        onOpenChange={setShowTaskSelectorShortcut}
        tasks={tasks}
        onSelectTask={handleInsertTaskBlock}
        onCreateTask={handleCreateTask}
      />
    </div>
  );
}