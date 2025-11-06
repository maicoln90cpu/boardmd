import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { RichTextToolbar } from "./RichTextToolbar";
import { Note } from "@/hooks/useNotes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NoteEditorProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
}

export function NoteEditor({ note, onUpdate }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const { toast } = useToast();
  
  // Refs para controlar sincronização e salvamento
  const isSavingRef = useRef(false);
  const lastSavedContentRef = useRef(note.content || "");
  
  const editor = useEditor({
    extensions: [
      // Extensões customizadas PRIMEIRO para evitar conflitos
      BulletList,
      OrderedList,
      ListItem,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      // StarterKit POR ÚLTIMO, desabilitando extensões que já foram adicionadas
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
    ],
    content: note.content || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[500px] p-4",
      },
    },
  });

  const debouncedTitle = useDebounce(title, 500);
  const editorContent = editor?.getHTML() || "";
  const debouncedContent = useDebounce(editorContent, 1000);

  // Auto-save título
  useEffect(() => {
    if (debouncedTitle !== note.title && debouncedTitle.trim() !== "") {
      onUpdate(note.id, { title: debouncedTitle });
    }
  }, [debouncedTitle, note.id, note.title, onUpdate]);

  // Auto-save conteúdo - CORRIGIDO com proteção contra reset
  useEffect(() => {
    if (!editor) return;
    
    // Normalizar HTML para comparação confiável
    const normalizedContent = debouncedContent.replace(/<p><\/p>/g, '').trim();
    const normalizedNoteContent = (note.content || '').replace(/<p><\/p>/g, '').trim();
    
    // Só salvar se:
    // 1. Conteúdo mudou de verdade
    // 2. É diferente do último salvo
    // 3. Não está em processo de salvamento
    if (normalizedContent !== normalizedNoteContent && 
        normalizedContent !== lastSavedContentRef.current &&
        !isSavingRef.current) {
      
      isSavingRef.current = true;
      lastSavedContentRef.current = normalizedContent;
      setSaveStatus("saving");
      
      onUpdate(note.id, { content: debouncedContent });
      
      // Feedback visual de salvamento concluído
      setTimeout(() => {
        isSavingRef.current = false;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }, 500);
    }
  }, [debouncedContent, note.id, note.content, editor, onUpdate]);

  // Sincronização - CORRIGIDO para respeitar flag de salvamento
  useEffect(() => {
    if (!editor || isSavingRef.current) return; // Não sincronizar se está salvando
    
    setTitle(note.title);
    lastSavedContentRef.current = note.content || "";
    
    const currentContent = editor.getHTML();
    const normalizedCurrent = currentContent.replace(/<p><\/p>/g, '').trim();
    const normalizedNote = (note.content || '').replace(/<p><\/p>/g, '').trim();
    
    if (normalizedCurrent !== normalizedNote) {
      editor.commands.setContent(note.content || "");
    }
  }, [note.id, note.title, note.content, editor]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
      }
    };
  }, [editor]);

  // Função para salvamento manual
  const handleManualSave = () => {
    if (!editor) return;
    
    const content = editor.getHTML();
    setSaveStatus("saving");
    
    onUpdate(note.id, { 
      title, 
      content 
    });
    
    setTimeout(() => {
      setSaveStatus("saved");
      toast({ title: "Nota salva manualmente!" });
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Título com indicador de salvamento */}
      <div className="p-4 border-b flex items-center justify-between gap-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0"
          placeholder="Título da nota..."
        />
        
        {/* Indicador de salvamento e botão manual */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground shrink-0">
          {saveStatus === "saving" && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
              <span>Salvando...</span>
            </div>
          )}
          {saveStatus === "saved" && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Salvo</span>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualSave}
            title="Salvar agora"
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <RichTextToolbar editor={editor} />

      {/* Editor */}
      <div className="flex-1 overflow-y-auto bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
