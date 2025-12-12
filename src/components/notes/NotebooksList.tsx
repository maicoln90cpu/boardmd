import { useState } from "react";
import { Notebook, NotebookTag, useNotebooks } from "@/hooks/useNotebooks";
import { Note, useNotes } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, BookOpen, FileText, ArrowUpDown, Tag } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotebookTagPicker, NotebookTagFilter } from "./NotebookTagPicker";
import { motion, AnimatePresence } from "framer-motion";

interface NotebooksListProps {
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

export function NotebooksList({
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
}: NotebooksListProps) {
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

  const getNotebookNotes = (notebookId: string) => {
    return notes.filter(note => note.notebook_id === notebookId);
  };

  const notesCount = (notebookId: string) => {
    return getNotebookNotes(notebookId).length;
  };

  return (
    <>
      <div className="space-y-1">
        <div className="flex items-center justify-between p-2">
          <h3 className="text-sm font-semibold text-muted-foreground">CADERNOS</h3>
          <div className="flex items-center gap-1">
            {onSortChange && (
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger className="h-8 w-8 p-0 border-0 hover:bg-accent">
                  <ArrowUpDown className="h-4 w-4" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="updated">Mais recentes</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                  <SelectItem value="created">Data de criação</SelectItem>
                  <SelectItem value="tag">Por tag</SelectItem>
                </SelectContent>
              </Select>
            )}
            {/* Botão premium "Novo Caderno" */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleAddNotebook}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-full group h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
            </Button>
          </div>
        </div>
        
        {/* Filtro por tag */}
        {onSelectTag && allTags.length > 0 && (
          <div className="px-2 pb-2">
            <NotebookTagFilter 
              allTags={allTags} 
              selectedTagId={selectedTagId || null} 
              onSelectTag={onSelectTag} 
            />
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {notebooks.map((notebook, index) => {
            const notebookNotes = getNotebookNotes(notebook.id);
            const isExpanded = expandedNotebooks.has(notebook.id);
            const count = notesCount(notebook.id);
            const isSelected = selectedNotebookId === notebook.id;
            
            return (
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
                className="space-y-1"
              >
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
                        className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer group transition-all duration-200 hover:shadow-sm ${
                          selectedNoteId === note.id ? "bg-accent" : "hover:bg-accent/50"
                        }`} 
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
              </motion.div>
            );
          })}
        </AnimatePresence>
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

  // Cor da barra baseada na primeira tag do caderno
  const primaryTagColor = notebook.tags?.[0]?.color || null;

  return (
    <motion.div 
      ref={setNodeRef}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`
        flex flex-col gap-1 group rounded-md overflow-hidden
        transition-all duration-200 cursor-pointer
        hover:shadow-md hover:shadow-primary/10
        ${isOver ? "ring-2 ring-primary shadow-lg" : ""}
        ${isSelected ? "bg-primary/10 shadow-md" : "hover:bg-accent/60"}
      `} 
      onClick={handleClick}
    >
      {/* Barra colorida no topo (baseada na primeira tag) */}
      {primaryTagColor && (
        <div 
          className="h-1 w-full"
          style={{ 
            background: `linear-gradient(90deg, ${primaryTagColor}, ${primaryTagColor}80)` 
          }}
        />
      )}

      <div className={`px-2 py-2 ${!primaryTagColor ? 'pt-2' : ''}`}>
        {/* Linha 1: Nome completo do caderno */}
        <div className="flex items-center gap-1">
          {!onSelect && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 shrink-0" 
              onClick={e => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}

          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />

          {editingId === notebook.id ? (
            <Input 
              value={editingName} 
              onChange={e => onEditChange(e.target.value)} 
              className="h-6 px-1 py-0 text-sm flex-1" 
              autoFocus 
              onKeyDown={e => {
                if (e.key === "Enter") onEditSave();
                if (e.key === "Escape") onEditCancel();
              }} 
              onBlur={onEditSave} 
              onClick={e => e.stopPropagation()} 
            />
          ) : (
            <span className={`flex-1 text-sm break-words ${isSelected ? 'text-primary font-medium' : ''}`}>
              {notebook.name}
            </span>
          )}

          <span className="text-muted-foreground text-xs shrink-0">({count})</span>
        </div>
        
        {/* Linha 2: Ícones de ação e tags */}
        <div onClick={e => e.stopPropagation()} className="ml-0 flex flex-wrap items-center gap-1 mt-1">
          {/* Ícones de ação */}
          <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0" 
              onClick={e => {
                e.stopPropagation();
                onEditStart();
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 text-destructive" 
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0" 
              onClick={e => {
                e.stopPropagation();
                onAddNote();
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Separador */}
          {(notebook.tags && notebook.tags.length > 0 || onAddTag) && (
            <span className="text-muted-foreground/30">|</span>
          )}
          
          {/* Tags com visual gradiente */}
          {notebook.tags?.map(tag => (
            <Badge 
              key={tag.id} 
              variant="secondary" 
              className="h-5 text-[10px] px-1.5 flex items-center gap-0.5 border-0 shadow-sm transition-transform hover:scale-105" 
              style={{
                background: `linear-gradient(135deg, ${tag.color}30, ${tag.color}50)`,
                color: tag.color,
                boxShadow: `0 1px 4px ${tag.color}25`
              }}
            >
              {tag.name}
              {onRemoveTag && (
                <button 
                  onClick={e => {
                    e.stopPropagation();
                    onRemoveTag(tag.id);
                  }} 
                  className="hover:bg-black/10 rounded p-0.5 ml-0.5"
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
      </div>
    </motion.div>
  );
}