import { Note } from "@/hooks/useNotes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

interface NoteEditorProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
}

export function NoteEditor({ note, onUpdate }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || "");

  // Sincronizar com mudanças externas da nota
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || "");
  }, [note.id, note.title, note.content]);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      toast.error("Adicione um título ou conteúdo");
      return;
    }

    onUpdate(note.id, {
      title: title.trim() || "Sem título",
      content: content.trim(),
    });

    toast.success("Nota salva!");
  };

  const handleCancel = () => {
    setTitle(note.title);
    setContent(note.content || "");
    toast.info("Alterações descartadas");
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Título */}
      <div className="p-4 sm:p-6 border-b">
        <Input
          placeholder="Título da anotação..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl sm:text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0"
        />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Textarea
          placeholder="Escreva aqui suas anotações..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[500px] resize-none border-none shadow-none focus-visible:ring-0 text-base"
        />
      </div>

      {/* Botões de ação */}
      <div className="p-4 sm:p-6 border-t flex gap-2 bg-card">
        <Button onClick={handleSave} className="flex-1 min-h-[48px]">
          <Check className="w-4 h-4 mr-2" />
          Salvar
        </Button>
        <Button onClick={handleCancel} variant="outline" className="flex-1 min-h-[48px]">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
