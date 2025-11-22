import { useState } from "react";
import { Notebook, useNotebooks } from "@/hooks/useNotebooks";
import { Note, useNotes } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, BookOpen, FileText } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
interface NotebooksListProps {
  notebooks: Notebook[];
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onAddNote: (notebookId: string | null) => void;
  onDeleteNote: (noteId: string) => void;
}
export function NotebooksList({
  notebooks,
  notes,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onDeleteNote
}: NotebooksListProps) {
  const {
    addNotebook,
    updateNotebook,
    deleteNotebook,
    setIsEditing
  } = useNotebooks();
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);
  const toggleNotebook = (id: string) => {
    const newExpanded = new Set(expandedNotebooks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNotebooks(newExpanded);
  };
  const handleAddNotebook = async () => {
    setIsEditing(true);
    await addNotebook("Novo Caderno");
    setIsEditing(false);
  };
  const handleEditStart = (notebook: Notebook) => {
    setIsEditing(true);
    setEditingId(notebook.id);
    setEditingName(notebook.name);
  };
  const handleEditSave = async (id: string) => {
    if (editingName.trim()) {
      await updateNotebook(id, editingName.trim());
    }
    setEditingId(null);
    setIsEditing(false);
  };
  const handleDeleteClick = (notebook: Notebook) => {
    setNotebookToDelete(notebook);
    setDeleteDialogOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (notebookToDelete) {
      setIsEditing(true);
      await deleteNotebook(notebookToDelete.id);
      setNotebookToDelete(null);
      setDeleteDialogOpen(false);
      setIsEditing(false);
    }
  };
  const getNotebookNotes = (notebookId: string) => {
    return notes.filter(note => note.notebook_id === notebookId);
  };
  const notesCount = (notebookId: string) => {
    return getNotebookNotes(notebookId).length;
  };
  return <>
      <div className="space-y-1">
        <div className="flex items-center justify-between p-2">
          <h3 className="text-sm font-semibold text-muted-foreground">CADERNOS</h3>
          <Button variant="ghost" size="sm" onClick={handleAddNotebook}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {notebooks.map(notebook => {
        const notebookNotes = getNotebookNotes(notebook.id);
        const isExpanded = expandedNotebooks.has(notebook.id);
        const count = notesCount(notebook.id);
        return <div key={notebook.id} className="space-y-1">
              <NotebookHeader notebook={notebook} isExpanded={isExpanded} count={count} editingId={editingId} editingName={editingName} onToggle={() => toggleNotebook(notebook.id)} onEditStart={() => handleEditStart(notebook)} onEditSave={() => handleEditSave(notebook.id)} onEditChange={setEditingName} onEditCancel={() => {
            setEditingId(null);
            setIsEditing(false);
          }} onDelete={() => handleDeleteClick(notebook)} onAddNote={() => onAddNote(notebook.id)} />

              {isExpanded && notebookNotes.length > 0 && <div className="ml-6 space-y-1">
                  {notebookNotes.map(note => <div key={note.id} className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer group ${selectedNoteId === note.id ? "bg-accent" : "hover:bg-accent/50"}`} onClick={() => onSelectNote(note.id)}>
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{note.title}</span>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={e => {
                e.stopPropagation();
                onDeleteNote(note.id);
              }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>)}
                </div>}
            </div>;
      })}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir caderno?</AlertDialogTitle>
            <AlertDialogDescription>
              {notebookToDelete && notesCount(notebookToDelete.id) > 0 ? <>
                  Este caderno contém {notesCount(notebookToDelete.id)} nota(s).
                  Ao excluir o caderno, as notas serão mantidas mas ficarão sem caderno.
                  O caderno e suas notas podem ser restaurados da lixeira.
                </> : "Tem certeza que deseja excluir este caderno? Ele pode ser restaurado da lixeira."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}
function NotebookHeader({
  notebook,
  isExpanded,
  count,
  editingId,
  editingName,
  onToggle,
  onEditStart,
  onEditSave,
  onEditChange,
  onEditCancel,
  onDelete,
  onAddNote
}: {
  notebook: Notebook;
  isExpanded: boolean;
  count: number;
  editingId: string | null;
  editingName: string;
  onToggle: () => void;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditChange: (value: string) => void;
  onEditCancel: () => void;
  onDelete: () => void;
  onAddNote: () => void;
}) {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id: `notebook-${notebook.id}`,
    data: {
      type: "notebook",
      notebookId: notebook.id
    }
  });
  return <div ref={setNodeRef} className={`
        flex items-center gap-1 group hover:bg-accent rounded-md px-2 py-1
        transition-colors
        ${isOver ? "bg-accent/70 ring-2 ring-primary" : ""}
      `}>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggle}>
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      <BookOpen className="h-4 w-4 text-muted-foreground" />

      {editingId === notebook.id ? <Input value={editingName} onChange={e => onEditChange(e.target.value)} className="h-6 px-1 py-0 text-sm flex-1" autoFocus onKeyDown={e => {
      if (e.key === "Enter") onEditSave();
      if (e.key === "Escape") onEditCancel();
    }} onBlur={onEditSave} /> : <span className="flex-1 truncate text-base">{notebook.name}</span>}

      <span className="text-muted-foreground text-base">({count})</span>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onEditStart}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onAddNote}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>;
}