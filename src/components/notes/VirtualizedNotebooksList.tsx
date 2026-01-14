import { useState, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Notebook, NotebookTag, useNotebooks } from "@/hooks/useNotebooks";
import { Note } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, BookOpen, FileText, ArrowUpDown, FolderOpen } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotebookTagPicker, NotebookTagFilter } from "./NotebookTagPicker";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface VirtualizedNotebooksListProps {
  notebooks: Notebook[];
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onAddNote: (notebookId: string | null) => void;
  onDeleteNote: (noteId: string) => void;
  sortBy?: 'updated' | 'alphabetical' | 'created' | 'tag';
  onSortChange?: (value: 'updated' | 'alphabetical' | 'created' | 'tag') => void;
  selectedNotebookId?: string | null;
  onSelectNotebook?: (notebookId: string | null) => void;
  selectedTagId?: string | null;
  onSelectTag?: (tagId: string | null) => void;
}

export function VirtualizedNotebooksList({
  notebooks,
  notes,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onDeleteNote,
  sortBy = 'updated',
  onSortChange,
  selectedNotebookId,
  onSelectNotebook,
  selectedTagId,
  onSelectTag
}: VirtualizedNotebooksListProps) {
  const {
    addNotebook,
    updateNotebook,
    deleteNotebook,
    addTagToNotebook,
    removeTagFromNotebook,
    getAllTags
  } = useNotebooks();
  const allTags = getAllTags();
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);
  
  const parentRef = useRef<HTMLDivElement>(null);

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
    await addNotebook("Novo Caderno");
  };

  const handleEditStart = (notebook: Notebook) => {
    setEditingId(notebook.id);
    setEditingName(notebook.name);
  };

  const handleEditSave = async (id: string) => {
    if (editingName.trim()) {
      await updateNotebook(id, editingName.trim());
    }
    setEditingId(null);
  };

  const handleDeleteClick = (notebook: Notebook) => {
    setNotebookToDelete(notebook);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (notebookToDelete) {
      await deleteNotebook(notebookToDelete.id);
      setNotebookToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const getNotebookNotes = useCallback((notebookId: string) => {
    return notes.filter(note => note.notebook_id === notebookId);
  }, [notes]);

  const notesCount = useCallback((notebookId: string) => {
    return getNotebookNotes(notebookId).length;
  }, [getNotebookNotes]);

  // Virtualizer para notebooks
  const rowVirtualizer = useVirtualizer({
    count: notebooks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // Altura estimada de cada item
    overscan: 5,
  });

  // Usar virtualização apenas para listas grandes
  const shouldVirtualize = notebooks.length > 20;

  const renderNotebookItem = (notebook: Notebook, index: number) => {
    const notebookNotes = getNotebookNotes(notebook.id);
    const isExpanded = expandedNotebooks.has(notebook.id);
    const count = notesCount(notebook.id);
    const isSelected = selectedNotebookId === notebook.id;

    return (
      <div key={notebook.id} className="space-y-1">
        <NotebookHeader 
          notebook={notebook} 
          isExpanded={isExpanded} 
          count={count} 
          editingId={editingId} 
          editingName={editingName} 
          isSelected={isSelected} 
          onToggle={() => toggleNotebook(notebook.id)} 
          onSelect={() => onSelectNotebook?.(notebook.id)} 
          onEditStart={() => handleEditStart(notebook)} 
          onEditSave={() => handleEditSave(notebook.id)} 
          onEditChange={setEditingName} 
          onEditCancel={() => setEditingId(null)} 
          onDelete={() => handleDeleteClick(notebook)} 
          onAddNote={() => onAddNote(notebook.id)} 
          allTags={allTags} 
          onAddTag={tag => addTagToNotebook(notebook.id, tag)} 
          onRemoveTag={tagId => removeTagFromNotebook(notebook.id, tagId)} 
        />

        {isExpanded && notebookNotes.length > 0 && !onSelectNotebook && (
          <div className="ml-6 space-y-1">
            {notebookNotes.map(note => (
              <motion.div 
                key={note.id}
                whileHover={{ x: 2 }}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-all duration-200 hover:shadow-sm",
                  selectedNoteId === note.id ? "bg-accent shadow-sm" : "hover:bg-accent/50"
                )}
                onClick={() => onSelectNote(note.id)}
              >
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{note.title}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive transition-opacity" 
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between py-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Cadernos
          </span>
          <div className="flex items-center gap-1">
            {onSortChange && (
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger className="h-7 w-7 p-0 border-0 hover:bg-accent rounded-lg">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="updated">Mais recentes</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                  <SelectItem value="created">Data de criação</SelectItem>
                  <SelectItem value="tag">Por tag</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleAddNotebook}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-full group h-7 w-7 p-0"
            >
              <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90 duration-200" />
            </Button>
          </div>
        </div>
        
        {/* Tag filter */}
        {onSelectTag && allTags.length > 0 && (
          <div className="pb-2">
            <NotebookTagFilter 
              allTags={allTags} 
              selectedTagId={selectedTagId || null} 
              onSelectTag={onSelectTag} 
            />
          </div>
        )}

        {notebooks.length === 0 ? (
          <div className="py-6 text-center">
            <div className="p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 inline-block mb-3">
              <FolderOpen className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum caderno</p>
            <Button variant="link" size="sm" onClick={handleAddNotebook} className="mt-1">
              Criar primeiro caderno
            </Button>
          </div>
        ) : shouldVirtualize ? (
          // Renderização virtualizada para listas grandes
          <div 
            ref={parentRef}
            className="h-[400px] overflow-auto"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const notebook = notebooks[virtualRow.index];
                return (
                  <div
                    key={notebook.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {renderNotebookItem(notebook, virtualRow.index)}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Renderização normal para listas pequenas
          <AnimatePresence mode="popLayout">
            {notebooks.map((notebook, index) => (
              <motion.div 
                key={notebook.id}
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
                {renderNotebookItem(notebook, index)}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir caderno?</AlertDialogTitle>
            <AlertDialogDescription>
              {notebookToDelete && notesCount(notebookToDelete.id) > 0 ? (
                <>
                  Este caderno contém {notesCount(notebookToDelete.id)} nota(s).
                  Ao excluir o caderno, as notas serão mantidas mas ficarão sem caderno.
                  O caderno e suas notas podem ser restaurados da lixeira.
                </>
              ) : (
                "Tem certeza que deseja excluir este caderno? Ele pode ser restaurado da lixeira."
              )}
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
    </>
  );
}

// NotebookHeader mantido igual ao original
function NotebookHeader({
  notebook,
  isExpanded,
  count,
  editingId,
  editingName,
  isSelected,
  onToggle,
  onSelect,
  onEditStart,
  onEditSave,
  onEditChange,
  onEditCancel,
  onDelete,
  onAddNote,
  allTags,
  onAddTag,
  onRemoveTag
}: {
  notebook: Notebook;
  isExpanded: boolean;
  count: number;
  editingId: string | null;
  editingName: string;
  isSelected?: boolean;
  onToggle: () => void;
  onSelect?: () => void;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditChange: (value: string) => void;
  onEditCancel: () => void;
  onDelete: () => void;
  onAddNote: () => void;
  allTags?: NotebookTag[];
  onAddTag?: (tag: NotebookTag) => void;
  onRemoveTag?: (tagId: string) => void;
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

  const handleClick = () => {
    if (onSelect) {
      onSelect();
    } else {
      onToggle();
    }
  };

  const primaryTagColor = notebook.tags?.[0]?.color || null;

  return (
    <motion.div 
      ref={setNodeRef}
      whileHover={{ y: -1, transition: { duration: 0.1 } }}
      className={cn(
        "relative group rounded-lg overflow-hidden transition-all duration-150 cursor-pointer border px-2.5 py-1.5",
        isOver && "ring-2 ring-primary border-primary/30",
        !isOver && "border-transparent",
        isSelected ? "bg-primary/10 border-primary/20" : "hover:bg-accent/50"
      )}
      onClick={handleClick}
    >
      {/* Color bar on top */}
      {primaryTagColor && (
        <div 
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: primaryTagColor }}
        />
      )}

      {/* Single row: all content inline */}
      <div className="flex items-center gap-1.5">
        {/* Expand icon */}
        {!onSelect && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 w-5 p-0 shrink-0 hover:bg-accent" 
            onClick={e => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        )}

        {/* Notebook icon */}
        <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

        {/* Notebook name - editable or display */}
        {editingId === notebook.id ? (
          <Input 
            value={editingName} 
            onChange={e => onEditChange(e.target.value)} 
            className="h-6 px-1.5 py-0 text-sm flex-1 min-w-0" 
            autoFocus 
            onKeyDown={e => {
              if (e.key === "Enter") onEditSave();
              if (e.key === "Escape") onEditCancel();
            }} 
            onBlur={onEditSave} 
            onClick={e => e.stopPropagation()} 
          />
        ) : (
          <span className={cn("flex-1 text-sm font-medium truncate min-w-0", isSelected && "text-primary")}>
            {notebook.name}
          </span>
        )}

        {/* Note count */}
        <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
          {count}
        </span>

        {/* Action icons - show on hover */}
        <div 
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 w-5 p-0 hover:bg-accent" 
            onClick={onEditStart}
          >
            <Pencil className="h-2.5 w-2.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 w-5 p-0 text-destructive hover:bg-destructive/10" 
            onClick={onDelete}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 w-5 p-0 hover:bg-accent" 
            onClick={onAddNote}
          >
            <Plus className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>

      {/* Tags row - only if tags exist */}
      {notebook.tags && notebook.tags.length > 0 && (
        <div 
          className="flex flex-wrap items-center gap-1 mt-1 ml-5"
          onClick={e => e.stopPropagation()}
        >
          {notebook.tags.map(tag => (
            <Badge 
              key={tag.id} 
              variant="secondary" 
              className="h-4 text-[9px] px-1.5 flex items-center gap-0.5 border-0 rounded-sm" 
              style={{
                background: `${tag.color}20`,
                color: tag.color,
              }}
            >
              {tag.name}
              {onRemoveTag && (
                <button 
                  onClick={e => {
                    e.stopPropagation();
                    onRemoveTag(tag.id);
                  }} 
                  className="hover:bg-black/10 rounded-full p-0.5 ml-0.5 transition-colors"
                >
                  ×
                </button>
              )}
            </Badge>
          ))}
          {onAddTag && (
            <NotebookTagPicker 
              tags={notebook.tags || []} 
              availableTags={allTags || []} 
              onAddTag={onAddTag} 
              onRemoveTag={onRemoveTag || (() => {})} 
            />
          )}
        </div>
      )}
      
      {/* Tag picker when no tags */}
      {(!notebook.tags || notebook.tags.length === 0) && onAddTag && (
        <div 
          className="mt-1 ml-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <NotebookTagPicker 
            tags={[]} 
            availableTags={allTags || []} 
            onAddTag={onAddTag} 
            onRemoveTag={onRemoveTag || (() => {})} 
          />
        </div>
      )}
    </motion.div>
  );
}
