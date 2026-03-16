import { useMemo } from "react";
import { Note } from "@/hooks/useNotes";
import { Link2 } from "lucide-react";

interface BacklinksPanelProps {
  currentNoteId: string;
  notes: Note[];
  onNavigateToNote: (noteId: string) => void;
}

export function BacklinksPanel({ currentNoteId, notes, onNavigateToNote }: BacklinksPanelProps) {
  const backlinks = useMemo(() => {
    return notes.filter((note) => {
      if (note.id === currentNoteId || !note.content) return false;
      // Check if note content has a backlink referencing currentNoteId
      return note.content.includes(`data-note-id="${currentNoteId}"`) ||
             note.content.includes(`"noteId":"${currentNoteId}"`);
    });
  }, [notes, currentNoteId]);

  if (backlinks.length === 0) return null;

  return (
    <div className="border-t px-4 py-3 bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Mencionada em {backlinks.length} {backlinks.length === 1 ? "nota" : "notas"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {backlinks.map((note) => (
          <button
            key={note.id}
            onClick={() => onNavigateToNote(note.id)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            📝 {note.title}
          </button>
        ))}
      </div>
    </div>
  );
}
