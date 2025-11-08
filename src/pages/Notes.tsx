import { useState } from "react";
import { useNotebooks } from "@/hooks/useNotebooks";
import { useNotes, Note } from "@/hooks/useNotes";
import { NotebooksList } from "@/components/notes/NotebooksList";
import { NotesList } from "@/components/notes/NotesList";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { TrashDialog } from "@/components/notes/TrashDialog";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";

export default function Notes() {
  const { notebooks, loading: loadingNotebooks } = useNotebooks();
  const { notes, loading: loadingNotes, addNote, updateNote, deleteNote, moveNoteToNotebook, setIsEditing } = useNotes();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
    setIsEditing(true); // Pausa real-time durante edição
  };

  const handleDeleteNote = async (noteId: string) => {
    // Se a nota excluída estiver selecionada, limpar seleção
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
      setIsEditing(false); // Reativar real-time
    }
    
    await deleteNote(noteId);
  };

  const handleViewChange = (mode: "daily" | "all") => {
    navigate(`/?view=${mode}`);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !active.data.current) return;
    
    const noteId = active.data.current.noteId;
    const overType = over.data.current?.type;
    
    if (overType === "notebook") {
      const notebookId = over.data.current.notebookId;
      moveNoteToNotebook(noteId, notebookId);
    } else if (overType === "none") {
      moveNoteToNotebook(noteId, null);
    }
  };

  if (loadingNotebooks || loadingNotes) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando anotações...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Global */}
      <Sidebar
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={toggleTheme}
        onViewChange={handleViewChange}
        viewMode="daily"
      />

      <main className="ml-64 flex-1 flex h-screen">
        {/* Painel esquerdo - Cadernos e Notas */}
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="w-80 border-r flex flex-col bg-card">
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

            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              <NotebooksList
                notebooks={notebooks}
                notes={notes}
                selectedNoteId={selectedNoteId}
                onSelectNote={handleSelectNote}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
              />

              <NotesList
                notes={notes}
                selectedNoteId={selectedNoteId}
                onSelectNote={handleSelectNote}
                onAddNote={() => handleAddNote(null)}
                onDeleteNote={handleDeleteNote}
              />
            </div>
          </div>
        </DndContext>

        {/* Área principal - Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedNote ? (
            <NoteEditor key={selectedNote.id} note={selectedNote} onUpdate={handleUpdateNote} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="text-6xl mb-4">📝</div>
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
      </main>

      {/* Dialog da lixeira */}
      <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} />
    </div>
  );
}
