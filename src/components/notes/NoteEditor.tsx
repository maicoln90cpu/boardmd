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
import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface NoteEditorProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
}

export function NoteEditor({ note, onUpdate }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const contentSyncedRef = useRef<string>(note.content || "");
  const isInitialMount = useRef(true);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
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

  // Auto-save conteúdo
  useEffect(() => {
    // Pular primeira renderização para evitar salvamento desnecessário
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!editor) return;

    // Só salvar se o conteúdo realmente mudou
    if (debouncedContent && debouncedContent !== contentSyncedRef.current) {
      console.log("💾 Salvando conteúdo...", {
        noteId: note.id,
        contentLength: debouncedContent.length,
        previousLength: contentSyncedRef.current.length
      });
      contentSyncedRef.current = debouncedContent;
      onUpdate(note.id, { content: debouncedContent });
    }
  }, [debouncedContent, note.id, onUpdate, editor]);

  // Sincronizar editor quando trocar de nota
  useEffect(() => {
    if (!editor) return;
    
    console.log("🔄 Sincronizando nota:", {
      noteId: note.id,
      title: note.title,
      contentLength: note.content?.length || 0
    });

    // Atualizar título
    setTitle(note.title);

    // Atualizar conteúdo do editor
    const currentContent = editor.getHTML();
    const newContent = note.content || "";
    
    if (currentContent !== newContent) {
      contentSyncedRef.current = newContent;
      isInitialMount.current = true; // Reset flag para nova nota
      editor.commands.setContent(newContent);
    }
  }, [note.id, editor]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  return (
    <div className="flex flex-col h-full">
      {/* Título */}
      <div className="p-4 border-b">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0"
          placeholder="Título da nota..."
        />
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
