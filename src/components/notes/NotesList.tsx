import { Note } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useNotes } from "@/hooks/useNotes";

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onAddNote: () => void;
}

export function NotesList({
  notes,
  selectedNoteId,
  onSelectNote,
  onAddNote,
}: NotesListProps) {
  const { deleteNote } = useNotes();

  // Separar notas soltas (sem caderno) e notas em cadernos
  const looseNotes = notes.filter((note) => !note.notebook_id);
  const notesInNotebooks = notes.filter((note) => note.notebook_id);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between p-2">
        <h3 className="text-sm font-semibold text-muted-foreground">TODAS AS NOTAS</h3>
        <Button variant="ghost" size="sm" onClick={onAddNote}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Notas soltas */}
      {looseNotes.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1">
            <span className="text-xs text-muted-foreground">Sem caderno</span>
          </div>
          {looseNotes.map((note) => (
            <div
              key={note.id}
              className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer group ${
                selectedNoteId === note.id ? "bg-accent" : "hover:bg-accent/50"
              }`}
              onClick={() => onSelectNote(note.id)}
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1 truncate">{note.title}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNote(note.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Notas em cadernos */}
      {notesInNotebooks.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1">
            <span className="text-xs text-muted-foreground">Em cadernos</span>
          </div>
          {notesInNotebooks.map((note) => (
            <div
              key={note.id}
              className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer group ${
                selectedNoteId === note.id ? "bg-accent" : "hover:bg-accent/50"
              }`}
              onClick={() => onSelectNote(note.id)}
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1 truncate">{note.title}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNote(note.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {notes.length === 0 && (
        <div className="px-2 py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma nota ainda</p>
          <Button variant="link" size="sm" onClick={onAddNote}>
            Criar primeira nota
          </Button>
        </div>
      )}
    </div>
  );
}
