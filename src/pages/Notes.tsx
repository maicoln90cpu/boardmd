import { useState, useMemo, useEffect } from "react";
import { useNotebooks } from "@/hooks/useNotebooks";
import { useNotes, Note } from "@/hooks/useNotes";
import { NotebooksList } from "@/components/notes/NotebooksList";
import { NotesList } from "@/components/notes/NotesList";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { NotesSearch } from "@/components/notes/NotesSearch";
import { TrashDialog } from "@/components/notes/TrashDialog";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { MobileNotesLayout } from "@/components/notes/MobileNotesLayout";

export default function Notes() {
  const { notebooks, loading: loadingNotebooks } = useNotebooks();
  const { notes, loading: loadingNotes, addNote, updateNote, deleteNote, moveNoteToNotebook, setEditingNoteId, togglePin, fetchNotes } = useNotes();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'updated' | 'alphabetical' | 'created'>('updated');
  const [notebookSortBy, setNotebookSortBy] = useState<'updated' | 'alphabetical' | 'created' | 'tag'>('updated');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Ordenar cadernos
  const sortedNotebooks = useMemo(() => {
    let sorted = [...notebooks];
    
    // Filtrar por tag se selecionada
    if (selectedTagId) {
      sorted = sorted.filter((n) => n.tags?.some((t) => t.id === selectedTagId));
    }
    
    switch (notebookSortBy) {
      case 'alphabetical':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'created':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'tag':
        // Ordenar por primeira tag (alfabeticamente), notebooks sem tag vão para o final
        sorted.sort((a, b) => {
          const aTag = a.tags?.[0]?.name || '\uffff';
          const bTag = b.tags?.[0]?.name || '\uffff';
          return aTag.localeCompare(bTag);
        });
        break;
      case 'updated':
      default:
        sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return sorted;
  }, [notebooks, notebookSortBy, selectedTagId]);

  // Filtrar e ordenar notas
  const filteredAndSortedNotes = useMemo(() => {
    let filtered = notes;

    // Busca por título e conteúdo
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = notes.filter(
        (note) =>
          note.title.toLowerCase().includes(term) ||
          note.content?.toLowerCase().includes(term)
      );
    }

    // Ordenação
    let sorted = [...filtered];
    switch (sortBy) {
      case 'alphabetical':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'created':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'updated':
      default:
        sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }

    // Notas fixadas sempre no topo
    const pinned = sorted.filter(n => n.is_pinned);
    const unpinned = sorted.filter(n => !n.is_pinned);
    
    return [...pinned, ...unpinned];
  }, [notes, searchTerm, sortBy]);

  // Filtrar notas pelo caderno selecionado (para layout 3 colunas)
  // null = todas as notas, "loose" = notas soltas, string = caderno específico
  const notesForSelectedNotebook = useMemo(() => {
    if (selectedNotebookId === null) {
      return filteredAndSortedNotes; // Todas as notas
    }
    if (selectedNotebookId === "loose") {
      return filteredAndSortedNotes.filter(n => !n.notebook_id); // Apenas notas soltas
    }
    return filteredAndSortedNotes.filter(n => n.notebook_id === selectedNotebookId);
  }, [filteredAndSortedNotes, selectedNotebookId]);

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
    // Se há uma nota sendo editada, dispara evento para salvá-la antes de trocar
    if (selectedNoteId && selectedNoteId !== noteId) {
      window.dispatchEvent(new CustomEvent('save-current-note'));
    }
    setSelectedNoteId(noteId);
    setEditingNoteId(noteId); // Marca nota sendo editada para merge inteligente
  };

  // Auto-save ao navegar para outra página (cleanup quando componente desmonta)
  useEffect(() => {
    return () => {
      if (selectedNoteId) {
        // Dispara evento para salvar a nota atual antes de sair da página
        window.dispatchEvent(new CustomEvent('save-current-note'));
      }
    };
  }, [selectedNoteId]);

  const handleDeleteNote = async (noteId: string) => {
    // Se a nota excluída estiver selecionada, limpar seleção
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
      setEditingNoteId(null); // Limpar nota em edição
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

  // Se for mobile, usar layout mobile otimizado
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 border-b flex items-center justify-between bg-card">
          <h2 className="text-xl font-bold">📝 Anotações</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTrashOpen(true)}
            title="Lixeira"
            className="min-h-[44px] min-w-[44px]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <MobileNotesLayout
          notebooks={notebooks}
          notes={filteredAndSortedNotes}
          selectedNoteId={selectedNoteId}
          onSelectNote={handleSelectNote}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onUpdateNote={handleUpdateNote}
          onTogglePin={togglePin}
          onMoveToNotebook={moveNoteToNotebook}
          onRefetch={fetchNotes}
          setEditingNoteId={setEditingNoteId}
        />

        <Sidebar
          onExport={() => {}}
          onImport={() => {}}
          onThemeToggle={toggleTheme}
          onViewChange={handleViewChange}
          viewMode="daily"
        />

        <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} />
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

      <main className="flex-1 flex h-screen overflow-hidden">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {/* Coluna 1 - Cadernos */}
          <div className="w-56 border-r flex flex-col bg-card shadow-sm">
            <div className="p-3 border-b flex items-center justify-between bg-gradient-to-r from-card to-muted/30">
              <h2 className="text-lg font-bold">📚 Cadernos</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTrashOpen(true)}
                title="Lixeira"
                className="hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {/* Opção "Todas as Notas" */}
              <button
                onClick={() => setSelectedNotebookId(null)}
                className={`w-full text-left p-2 rounded-md mb-1 transition-all duration-200 ${
                  selectedNotebookId === null 
                    ? "bg-primary/10 text-primary font-medium shadow-sm" 
                    : "hover:bg-muted hover:shadow-sm"
                }`}
              >
                📋 Todas as Notas ({notes.length})
              </button>
              
              {/* Opção "Notas Soltas" */}
              <button
                onClick={() => setSelectedNotebookId("loose")}
                className={`w-full text-left p-2 rounded-md mb-2 transition-all duration-200 ${
                  selectedNotebookId === "loose" 
                    ? "bg-primary/10 text-primary font-medium shadow-sm" 
                    : "hover:bg-muted hover:shadow-sm"
                }`}
              >
                📄 Notas Soltas ({notes.filter(n => !n.notebook_id).length})
              </button>

              <NotebooksList
                notebooks={sortedNotebooks}
                notes={filteredAndSortedNotes}
                selectedNoteId={selectedNoteId}
                onSelectNote={handleSelectNote}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
                sortBy={notebookSortBy}
                onSortChange={setNotebookSortBy}
                selectedNotebookId={selectedNotebookId}
                onSelectNotebook={setSelectedNotebookId}
                selectedTagId={selectedTagId}
                onSelectTag={setSelectedTagId}
              />
            </div>
          </div>

          {/* Coluna 2 - Lista de Notas */}
          <div className="w-64 border-r flex flex-col bg-gradient-to-b from-card/80 to-muted/20 shadow-inner">
            <div className="p-3 border-b bg-card/50 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                {selectedNotebookId === null
                  ? "Todas as Notas"
                  : selectedNotebookId === "loose"
                    ? "Notas Soltas"
                    : sortedNotebooks.find(n => n.id === selectedNotebookId)?.name || "Notas"
                }
              </h3>
              <NotesSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <NotesList
                notes={notesForSelectedNotebook}
                selectedNoteId={selectedNoteId}
                onSelectNote={handleSelectNote}
                onAddNote={() => handleAddNote(selectedNotebookId)}
                onDeleteNote={handleDeleteNote}
                notebooks={notebooks}
              />
            </div>
          </div>

        </DndContext>

        {/* Coluna 3 - Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedNote ? (
            <NoteEditor 
              key={selectedNote.id} 
              note={selectedNote}
              notebooks={notebooks}
              onUpdate={handleUpdateNote}
              onTogglePin={togglePin}
              onMoveToNotebook={moveNoteToNotebook}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold mb-2">Nenhuma nota selecionada</h3>
                <p className="text-muted-foreground mb-4">
                  Selecione uma nota existente ou crie uma nova para começar
                </p>
                <Button onClick={() => handleAddNote(selectedNotebookId)}>
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
