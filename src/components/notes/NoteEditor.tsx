import { Note } from "@/hooks/useNotes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Check, X, Pin, Link2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { RichTextToolbar } from "./RichTextToolbar";
import { ColorPicker } from "./ColorPicker";
import { useTasks } from "@/hooks/useTasks";

interface NoteEditorProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onTogglePin: (id: string) => void;
  onSave?: () => void;
}

export function NoteEditor({ note, onUpdate, onTogglePin, onSave }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || "");
  const [color, setColor] = useState(note.color || null);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  // Buscar tarefas disponíveis
  const { tasks } = useTasks("all");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: note.content || "",
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  // Sincronizar com mudanças externas da nota
  useEffect(() => {
    setTitle(note.title);
    setColor(note.color || null);
    if (editor && note.content !== editor.getHTML()) {
      editor.commands.setContent(note.content || "");
    }
  }, [note.id, note.title, note.content, note.color, editor]);

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
      color,
    });

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

  return (
    <div className="flex flex-col min-h-[100dvh] transition-colors" style={{ backgroundColor: color || undefined }}>
      {/* Título e ações */}
      <div className="p-4 sm:p-6 border-b space-y-3 flex-shrink-0">
        <div className="flex items-start gap-2">
          <Input
            placeholder="Título da anotação..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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

        {/* Vincular a tarefa */}
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <Select
            value={linkedTaskId || "none"}
            onValueChange={(value) => setLinkedTaskId(value === "none" ? null : value)}
          >
            <SelectTrigger className="w-full sm:w-[300px] h-9 text-sm">
              <SelectValue placeholder="Vincular a uma tarefa..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Nenhuma tarefa vinculada</span>
              </SelectItem>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Editor de conteúdo */}
      <div className="flex-1 flex flex-col min-h-0">
        <RichTextToolbar editor={editor} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[180px] md:pb-6">
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none focus:outline-none h-full [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none"
          />
        </div>
      </div>

      {/* Botões de ação */}
      <div className="fixed bottom-0 left-0 right-0 md:relative p-10 sm:p-6 border-t flex gap-2 bg-card backdrop-blur supports-[backdrop-filter]:bg-card/95 shadow-lg z-10">
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
    </div>
  );
}
