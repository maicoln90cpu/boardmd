import { Note } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useNotes } from "@/hooks/useNotes";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
}

export function NotesList({
  notes,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onDeleteNote
}: NotesListProps) {
  // Separar notas soltas (sem caderno) e notas em cadernos
  const looseNotes = notes.filter(note => !note.notebook_id);
  const notesInNotebooks = notes.filter(note => note.notebook_id);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between p-2">
        <h3 className="text-sm font-semibold text-muted-foreground">TODAS AS NOTAS</h3>
        {/* Botão premium "Nova Nota" */}
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

      {/* Notas soltas */}
      {looseNotes.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1">
            <span className="text-xs text-muted-foreground">Sem caderno</span>
          </div>
          <AnimatePresence mode="popLayout">
            {looseNotes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
                transition={{
                  duration: 0.25,
                  delay: index * 0.03,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                layout
              >
                <DraggableNote
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  onSelect={onSelectNote}
                  onDelete={onDeleteNote}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Notas em cadernos */}
      {notesInNotebooks.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1">
            <span className="text-xs text-muted-foreground">Em cadernos</span>
          </div>
          <AnimatePresence mode="popLayout">
            {notesInNotebooks.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
                transition={{
                  duration: 0.25,
                  delay: index * 0.03,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                layout
              >
                <DraggableNote
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  onSelect={onSelectNote}
                  onDelete={onDeleteNote}
                />
              </motion.div>
            ))}
          </AnimatePresence>
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

function NoneDropArea() {
  const { setNodeRef, isOver } = useDroppable({
    id: "none-drop-area",
    data: { type: "none" }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`
        border-2 border-dashed rounded-lg p-2 mb-2 text-xs text-center text-muted-foreground
        transition-colors
        ${isOver ? "bg-accent/50 border-primary" : "border-muted"}
      `}
    >
      Arraste aqui para remover do caderno
    </div>
  );
}

function DraggableNote({
  note,
  isSelected,
  onSelect,
  onDelete
}: {
  note: Note;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
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

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab"
  };

  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`
        flex items-center gap-2 px-2 py-1.5 rounded-md group
        transition-all duration-200
        hover:shadow-md hover:shadow-primary/10 hover:bg-accent/60
        ${isSelected ? "bg-accent shadow-md" : ""}
      `}
    >
      <div 
        onClick={() => onSelect(note.id)} 
        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
      >
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="truncate text-sm">{note.title}</span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(note.id);
        }} 
        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </motion.div>
  );
}