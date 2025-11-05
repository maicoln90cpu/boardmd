import { useState } from "react";
import { useNotebooks } from "@/hooks/useNotebooks";
import { useNotes, Note } from "@/hooks/useNotes";
import { NotebooksList } from "@/components/notes/NotebooksList";
import { NotesList } from "@/components/notes/NotesList";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { TrashDialog } from "@/components/notes/TrashDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, BookOpen, FileText } from "lucide-react";

export default function Notes() {
  const { notebooks, loading: loadingNotebooks } = useNotebooks();
  const { notes, loading: loadingNotes, addNote, updateNote } = useNotes();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("notebooks");

  const selectedNote = selectedNoteId
    ? notes.find((n) => n.id === selectedNoteId) || null
    : null;

  const handleAddNote = async (notebookId: string | null = null) => {
    const newNote = await addNote("Nova Nota", notebookId);
    if (newNote) {
      setSelectedNoteId(newNote.id);
    }
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    updateNote(id, updates);
  };

  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
  };

  if (loadingNotebooks || loadingNotes) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando anotações...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar esquerda */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">📝 Anotações</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTrashOpen(true)}
            title="Lixeira"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="notebooks" className="flex-1">
              <BookOpen className="h-4 w-4 mr-2" />
              Cadernos
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Notas
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="notebooks" className="m-0 p-2">
              <NotebooksList
                notebooks={notebooks}
                notes={notes}
                selectedNoteId={selectedNoteId}
                onSelectNote={handleSelectNote}
                onAddNote={handleAddNote}
              />
            </TabsContent>

            <TabsContent value="notes" className="m-0 p-2">
              <NotesList
                notes={notes}
                selectedNoteId={selectedNoteId}
                onSelectNote={handleSelectNote}
                onAddNote={() => handleAddNote(null)}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Área principal - Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <NoteEditor note={selectedNote} onUpdate={handleUpdateNote} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <FileText className="h-24 w-24 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma nota selecionada</h3>
              <p className="text-muted-foreground mb-4">
                Selecione uma nota existente ou crie uma nova para começar
              </p>
              <Button onClick={() => handleAddNote(null)}>
                Criar Nova Nota
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog da lixeira */}
      <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} />
    </div>
  );
}
