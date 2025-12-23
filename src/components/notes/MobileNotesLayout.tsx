import { useState, useEffect, useCallback } from "react";
import { Note } from "@/hooks/useNotes";
import { Notebook } from "@/hooks/useNotebooks";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Check } from "lucide-react";
import { NotebooksList } from "./NotebooksList";
import { NotesList } from "./NotesList";
import { NoteEditor } from "./NoteEditor";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type MobileView = "notebooks" | "notes" | "editor";

interface MobileNotesLayoutProps {
  notebooks: Notebook[];
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onAddNote: (notebookId?: string | null) => void;
  onDeleteNote: (noteId: string) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onTogglePin: (noteId: string) => void;
  onMoveToNotebook: (noteId: string, notebookId: string | null) => void;
  onRefetch?: () => void;
  setEditingNoteId?: (noteId: string | null) => void;
}

export function MobileNotesLayout({
  notebooks,
  notes,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onDeleteNote,
  onUpdateNote,
  onTogglePin,
  onMoveToNotebook,
  onRefetch,
  setEditingNoteId
}: MobileNotesLayoutProps) {
  const [view, setView] = useState<MobileView>("notebooks");
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [editorSaveTriggered, setEditorSaveTriggered] = useState(0);
  const [pendingSave, setPendingSave] = useState(false);
  const selectedNote = selectedNoteId ? notes.find(n => n.id === selectedNoteId) || null : null;

  // Refetch ao montar o componente mobile
  useEffect(() => {
    if (onRefetch) {
      onRefetch();
    }
  }, [onRefetch]);

  const handleSelectNote = (noteId: string) => {
    onSelectNote(noteId);
    setEditingNoteId?.(noteId);
    setView("editor");
  };

  const handleAddNote = (notebookId?: string | null) => {
    onAddNote(notebookId);
    setView("editor");
  };

  // Save síncrono antes de voltar
  const handleBackFromEditor = useCallback(async () => {
    if (pendingSave) return; // Evita cliques duplos
    
    setPendingSave(true);
    
    // Incrementar o trigger para forçar o save
    setEditorSaveTriggered(prev => prev + 1);
    
    // Aguardar o save ser processado
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Limpar nota em edição
    setEditingNoteId?.(null);
    
    // Forçar refetch para garantir sincronização
    if (onRefetch) {
      await onRefetch();
    }
    
    setView(selectedNotebookId ? "notes" : "notebooks");
    onSelectNote(null);
    setPendingSave(false);
  }, [pendingSave, selectedNotebookId, onSelectNote, onRefetch, setEditingNoteId]);
  const handleSaveFromHeader = () => {
    setEditorSaveTriggered(prev => prev + 1);
  };
  const handleBackFromNotes = () => {
    setSelectedNotebookId(null);
    setView("notebooks");
  };
  const handleNotebookClick = (notebookId: string) => {
    setSelectedNotebookId(notebookId);
    setView("notes");
  };
  return <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* View: Notebooks List */}
      {view === "notebooks" && <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between bg-card">
            <h2 className="text-xl font-bold">📝 Anotações</h2>
            <Button onClick={() => handleAddNote(null)} size="sm" className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-1" />
              Nova Nota
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pb-[140px]">
            {/* Notebooks */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">📚 Cadernos</h3>
              <div className="space-y-2">
                {notebooks.map(notebook => {
              const notebookNotes = notes.filter(n => n.notebook_id === notebook.id);
              return <button key={notebook.id} onClick={() => handleNotebookClick(notebook.id)} className="w-full flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-accent transition-colors min-h-[48px]">
                      <span className="font-medium">{notebook.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {notebookNotes.length} {notebookNotes.length === 1 ? 'nota' : 'notas'}
                      </span>
                    </button>;
            })}
              </div>
            </div>

            {/* Notas sem caderno */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">📄 Notas Soltas</h3>
              <NotesList notes={notes.filter(n => !n.notebook_id)} selectedNoteId={selectedNoteId} onSelectNote={handleSelectNote} onAddNote={() => handleAddNote(null)} onDeleteNote={onDeleteNote} notebooks={notebooks} />
            </div>

            {/* Todas as Notas */}
            <div>
              <h3 className="font-semibold mb-3">📋 Todas as Notas</h3>
              <NotesList notes={notes} selectedNoteId={selectedNoteId} onSelectNote={handleSelectNote} onAddNote={() => handleAddNote(null)} onDeleteNote={onDeleteNote} notebooks={notebooks} />
            </div>
          </div>
        </div>}

      {/* View: Notes in Notebook */}
      {view === "notes" && selectedNotebookId && <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2 bg-card">
            <Button variant="ghost" size="icon" onClick={handleBackFromNotes} className="min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold flex-1">
              {notebooks.find(nb => nb.id === selectedNotebookId)?.name || "Caderno"}
            </h2>
            <Button onClick={() => handleAddNote(selectedNotebookId)} size="sm" className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-1" />
              Nova Nota
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <NotesList notes={notes.filter(n => n.notebook_id === selectedNotebookId)} selectedNoteId={selectedNoteId} onSelectNote={handleSelectNote} onAddNote={() => handleAddNote(selectedNotebookId)} onDeleteNote={onDeleteNote} notebooks={notebooks} />
          </div>
        </div>}

      {/* View: Editor */}
      {view === "editor" && selectedNote && <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2 border-b flex items-center gap-2 bg-card">
            <Button variant="ghost" size="icon" onClick={handleBackFromEditor} className="min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm text-muted-foreground flex-1">Voltar</span>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <NoteEditor key={`${selectedNote.id}-${editorSaveTriggered}`} note={selectedNote} notebooks={notebooks} onUpdate={onUpdateNote} onTogglePin={onTogglePin} onMoveToNotebook={onMoveToNotebook} onSave={handleBackFromEditor} className="my-[10px]" />
          </div>
        </div>}
    </div>;
}