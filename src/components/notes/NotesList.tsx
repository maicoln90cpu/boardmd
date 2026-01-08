import { Note } from "@/hooks/useNotes";
import { Notebook } from "@/hooks/useNotebooks";
import { Button } from "@/components/ui/button";
import { BaseBadge, getPinnedBadgeStyle } from "@/components/ui/base-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Plus, Trash2, Pin, Notebook as NotebookIcon } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
  notebooks?: Notebook[];
}

export function NotesList({
  notes,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onDeleteNote,
  notebooks = []
}: NotesListProps) {
  // Mapa de notebook_id -> cor para acesso O(1)
  const notebookColorMap = useMemo(() => {
    const map = new Map<string, string>();
    notebooks.forEach(nb => {
      const color = nb.tags?.[0]?.color;
      if (color) {
        map.set(nb.id, color);
      }
    });
    return map;
  }, [notebooks]);

  const getNotebookColor = (notebookId: string | null): string | null => {
    if (!notebookId) return null;
    return notebookColorMap.get(notebookId) || null;
  };

  return (
    <div className="space-y-2">
      {/* Header com botão premium */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onAddNote}
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-full group h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
        </Button>
      </div>

      <NoneDropArea />

      {/* Lista de notas */}
      <AnimatePresence mode="popLayout">
        {notes.map((note, index) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
            transition={{
              duration: 0.25,
              delay: index * 0.02,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            layout
          >
            <DraggableNote
              note={note}
              isSelected={selectedNoteId === note.id}
              onSelect={onSelectNote}
              onDelete={onDeleteNote}
              notebookColor={getNotebookColor(note.notebook_id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {notes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 mb-4">
              <NotebookIcon className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h4 className="font-medium text-muted-foreground mb-1">
              Nenhuma nota ainda
            </h4>
            <p className="text-sm text-muted-foreground/70 mb-4">
              Crie sua primeira nota neste caderno
            </p>
            <Button variant="outline" size="sm" className="rounded-full" onClick={onAddNote}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Nota
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function NoneDropArea() {
  const { setNodeRef, isOver } = useDroppable({
    id: "none-drop-area",
    data: { type: "none" }
  });

  return (
    <motion.div 
      ref={setNodeRef}
      whileHover={{ scale: 1.01 }}
      className={`
        border-2 border-dashed rounded-xl p-3 mb-3 text-xs text-center text-muted-foreground
        transition-all duration-200
        ${isOver 
          ? "bg-primary/10 border-primary shadow-md shadow-primary/10" 
          : "border-muted/50 hover:border-muted"
        }
      `}
    >
      <span className="flex items-center justify-center gap-1.5">
        <FileText className="h-3 w-3" />
        Arraste para remover do caderno
      </span>
    </motion.div>
  );
}

function DraggableNote({
  note,
  isSelected,
  onSelect,
  onDelete,
  notebookColor
}: {
  note: Note;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  notebookColor: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: note.id,
    data: { type: "note", noteId: note.id }
  });

  const combinedStyle = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  // Format relative date
  const relativeDate = formatDistanceToNow(new Date(note.updated_at), { 
    addSuffix: true,
    locale: ptBR 
  });

  const mergedStyle = {
    ...combinedStyle,
    borderLeftColor: notebookColor && !isSelected ? notebookColor : undefined,
    backgroundColor: notebookColor && !isSelected ? `${notebookColor}08` : undefined,
  };

  return (
    <motion.div 
      ref={setNodeRef} 
      style={mergedStyle} 
      {...attributes} 
      {...listeners}
      whileHover={{ x: 2, transition: { duration: 0.15 } }}
      className={`
        relative flex items-center gap-3 p-3 rounded-xl group
        transition-all duration-200
        border
        ${isSelected 
          ? "bg-accent shadow-lg border-primary/20" 
          : notebookColor 
            ? "hover:shadow-md border-transparent hover:border-border/30" 
            : "hover:bg-accent/40 border-transparent hover:border-border/30 hover:shadow-sm"
        }
        ${notebookColor && !isSelected ? "border-l-[3px]" : ""}
      `}
    >
      {/* Icon container */}
      <div className={`
        flex-shrink-0 p-2 rounded-lg transition-colors
        ${isSelected ? "bg-primary/20" : "bg-muted/50"}
      `}>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Content */}
      <div 
        onClick={() => onSelect(note.id)} 
        className="flex-1 min-w-0 cursor-pointer"
      >
        <p className="font-medium text-sm truncate">{note.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground truncate">
            {relativeDate}
          </span>
          {note.is_pinned && (
            <BaseBadge 
              variant="pinned" 
              size="sm" 
              icon={<Pin className="h-2.5 w-2.5" />}
              className="font-semibold shadow-sm hover:scale-105 transition-transform text-[10px]"
              style={getPinnedBadgeStyle()}
            >
              Fixada
            </BaseBadge>
          )}
        </div>
      </div>

      {/* Delete button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(note.id);
        }} 
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 transition-all flex-shrink-0 rounded-lg"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}