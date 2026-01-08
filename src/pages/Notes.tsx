import { useState, useMemo, useEffect } from "react";
import { useNotebooks } from "@/hooks/useNotebooks";
import { useNotes, Note } from "@/hooks/useNotes";
import { NotebooksList } from "@/components/notes/NotebooksList";
import { NotesList } from "@/components/notes/NotesList";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { useBreakpoint } from "@/hooks/ui/useBreakpoint";
import { NotesSearch } from "@/components/notes/NotesSearch";
import { TrashDialog } from "@/components/notes/TrashDialog";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, Plus, Sparkles, List, LayoutGrid } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { MobileNotesLayout } from "@/components/notes/MobileNotesLayout";
import { motion, AnimatePresence } from "framer-motion";

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
  const [notesViewMode, setNotesViewMode] = useState<'list' | 'grid'>('list');
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  // Selecionar nota via URL param (vindo do GlobalSearch)
  useEffect(() => {
    const noteIdFromUrl = searchParams.get('noteId');
    if (noteIdFromUrl && notes.length > 0) {
      const noteExists = notes.find(n => n.id === noteIdFromUrl);
      if (noteExists) {
        setSelectedNoteId(noteIdFromUrl);
        setEditingNoteId(noteIdFromUrl);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, notes, setSearchParams, setEditingNoteId]);

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

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = notes.filter(
        (note) =>
          note.title.toLowerCase().includes(term) ||
          note.content?.toLowerCase().includes(term)
      );
    }

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

    const pinned = sorted.filter(n => n.is_pinned);
    const unpinned = sorted.filter(n => !n.is_pinned);
    
    return [...pinned, ...unpinned];
  }, [notes, searchTerm, sortBy]);

  // Filtrar notas pelo caderno selecionado
  const notesForSelectedNotebook = useMemo(() => {
    if (selectedNotebookId === null) {
      return filteredAndSortedNotes;
    }
    if (selectedNotebookId === "loose") {
      return filteredAndSortedNotes.filter(n => !n.notebook_id);
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
    if (selectedNoteId && selectedNoteId !== noteId) {
      window.dispatchEvent(new CustomEvent('save-current-note'));
    }
    setSelectedNoteId(noteId);
    setEditingNoteId(noteId);
  };

  useEffect(() => {
    return () => {
      if (selectedNoteId) {
        window.dispatchEvent(new CustomEvent('save-current-note'));
      }
    };
  }, [selectedNoteId]);

  const handleDeleteNote = async (noteId: string) => {
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
      setEditingNoteId(null);
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5"
          >
            <FileText className="h-8 w-8 text-primary" />
          </motion.div>
          <p className="text-muted-foreground font-medium">Carregando anotações...</p>
        </div>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between bg-card/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Anotações
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTrashOpen(true)}
            title="Lixeira"
            className="min-h-[44px] min-w-[44px] hover:bg-destructive/10 hover:text-destructive transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex">
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
          <div className="w-60 border-r flex flex-col bg-gradient-to-b from-card via-card to-muted/5 shadow-sm">
            <div className="p-4 border-b bg-gradient-to-r from-card to-muted/20 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Cadernos
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTrashOpen(true)}
                  title="Lixeira"
                  className="hover:bg-destructive/10 hover:text-destructive transition-colors h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Todas as Notas - Premium button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedNotebookId(null)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                  selectedNotebookId === null 
                    ? "bg-primary/10 border border-primary/20 shadow-md shadow-primary/10" 
                    : "hover:bg-accent/50 hover:shadow-sm border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    selectedNotebookId === null ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm">Todas as Notas</span>
                  <span className="ml-auto text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    {notes.length}
                  </span>
                </div>
              </motion.button>
              
              {/* Notas Soltas - Premium button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedNotebookId("loose")}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                  selectedNotebookId === "loose" 
                    ? "bg-primary/10 border border-primary/20 shadow-md shadow-primary/10" 
                    : "hover:bg-accent/50 hover:shadow-sm border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    selectedNotebookId === "loose" ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm">Notas Soltas</span>
                  <span className="ml-auto text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    {notes.filter(n => !n.notebook_id).length}
                  </span>
                </div>
              </motion.button>

              <div className="pt-2">
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
          </div>

          {/* Coluna 2 - Lista de Notas */}
          <div className="w-72 border-r flex flex-col bg-gradient-to-b from-card/80 via-muted/10 to-muted/20 shadow-inner">
            <div className="sticky top-0 z-10 p-4 border-b bg-card/80 backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {selectedNotebookId === null
                    ? "Todas as Notas"
                    : selectedNotebookId === "loose"
                      ? "Notas Soltas"
                      : sortedNotebooks.find(n => n.id === selectedNotebookId)?.name || "Notas"
                  }
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant={notesViewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setNotesViewMode('list')}
                    className="h-7 w-7"
                    title="Visualização em lista"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={notesViewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setNotesViewMode('grid')}
                    className="h-7 w-7"
                    title="Visualização em grid"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <NotesSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <NotesList
                notes={notesForSelectedNotebook}
                selectedNoteId={selectedNoteId}
                onSelectNote={handleSelectNote}
                onAddNote={() => handleAddNote(selectedNotebookId)}
                onDeleteNote={handleDeleteNote}
                notebooks={notebooks}
                viewMode={notesViewMode}
              />
            </div>
          </div>

        </DndContext>

        {/* Coluna 3 - Editor */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-background to-muted/5">
          <AnimatePresence mode="wait">
            {selectedNote ? (
              <motion.div
                key={selectedNote.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col"
              >
                <NoteEditor 
                  note={selectedNote}
                  notebooks={notebooks}
                  onUpdate={handleUpdateNote}
                  onTogglePin={togglePin}
                  onMoveToNotebook={moveNoteToNotebook}
                />
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex items-center justify-center text-center p-8"
              >
                <div className="max-w-md">
                  {/* Animated illustration */}
                  <motion.div 
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="mb-6"
                  >
                    <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-lg shadow-primary/10">
                      <FileText className="h-16 w-16 text-primary/60" />
                    </div>
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Selecione uma nota
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Escolha uma nota existente ou crie uma nova para começar a escrever
                  </p>
                  
                  <Button 
                    onClick={() => handleAddNote(selectedNotebookId)}
                    className="rounded-full px-6 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Nova Nota
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} />
    </div>
  );
}