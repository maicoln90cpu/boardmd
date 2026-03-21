import { useState, useMemo } from "react";
import { Note } from "@/hooks/useNotes";
import { Notebook } from "@/hooks/useNotebooks";
import { 
  ChevronRight, ChevronDown, FileText, Book, Search, 
  Hash, ArrowRight, ExternalLink
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface WikiNavigationProps {
  notebooks: Notebook[];
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
}

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

function extractHeadings(content: string | null): HeadingItem[] {
  if (!content) return [];
  const headingRegex = /<h([1-3])[^>]*(?:id="([^"]*)")?[^>]*>(.*?)<\/h\1>/gi;
  const headings: HeadingItem[] = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = parseInt(match[1]);
    const id = match[2] || `heading-${headings.length}`;
    const text = match[3].replace(/<[^>]*>/g, '').trim();
    if (text) {
      headings.push({ id, text, level });
    }
  }
  return headings;
}

function extractBacklinks(note: Note, allNotes: Note[]): Note[] {
  if (!note.title) return [];
  const pattern = `[[${note.title}]]`;
  return allNotes.filter(n => 
    n.id !== note.id && n.content?.includes(pattern)
  );
}

function WikiTreeItem({
  note,
  isSelected,
  onSelect,
  allNotes,
  depth = 0,
}: {
  note: Note;
  isSelected: boolean;
  onSelect: (id: string) => void;
  allNotes: Note[];
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(isSelected);
  const headings = useMemo(() => extractHeadings(note.content), [note.content]);
  const hasHeadings = headings.length > 0;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(note.id);
          if (hasHeadings) setExpanded(!expanded);
        }}
        className={cn(
          "w-full flex items-center gap-1.5 py-1.5 px-2 rounded-md text-left text-sm transition-colors",
          "hover:bg-accent/50",
          isSelected && "bg-primary/10 text-primary font-medium",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasHeadings ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{note.title}</span>
      </button>

      <AnimatePresence>
        {expanded && hasHeadings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {headings.map((heading, idx) => (
              <button
                key={`${heading.id}-${idx}`}
                onClick={() => {
                  onSelect(note.id);
                  // Scroll to heading after a short delay
                  setTimeout(() => {
                    const el = document.getElementById(heading.id);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 200);
                }}
                className="w-full flex items-center gap-1.5 py-1 px-2 rounded-sm text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
                style={{ paddingLeft: `${(depth + 1) * 12 + heading.level * 8}px` }}
              >
                <Hash className="h-3 w-3 shrink-0 opacity-50" />
                <span className="truncate">{heading.text}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WikiNavigation({
  notebooks,
  notes,
  selectedNoteId,
  onSelectNote,
}: WikiNavigationProps) {
  const [search, setSearch] = useState("");
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set());

  const toggleNotebook = (id: string) => {
    setExpandedNotebooks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group notes by notebook
  const { grouped, loose } = useMemo(() => {
    const term = search.toLowerCase();
    const filtered = term
      ? notes.filter(n =>
          n.title.toLowerCase().includes(term) ||
          n.content?.toLowerCase().includes(term)
        )
      : notes;

    const grouped: Record<string, Note[]> = {};
    const loose: Note[] = [];

    for (const note of filtered) {
      if (note.notebook_id) {
        if (!grouped[note.notebook_id]) grouped[note.notebook_id] = [];
        grouped[note.notebook_id].push(note);
      } else {
        loose.push(note);
      }
    }
    return { grouped, loose };
  }, [notes, search]);

  // Backlinks for selected note
  const selectedNote = selectedNoteId ? notes.find(n => n.id === selectedNoteId) : null;
  const backlinks = useMemo(() => 
    selectedNote ? extractBacklinks(selectedNote, notes) : [],
    [selectedNote, notes]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center gap-2">
          <Book className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Wiki</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar na wiki..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-0.5">
          {/* Notebooks as sections */}
          {notebooks.map(notebook => {
            const nbNotes = grouped[notebook.id] || [];
            if (nbNotes.length === 0 && search) return null;
            const isExpanded = expandedNotebooks.has(notebook.id);

            return (
              <div key={notebook.id}>
                <button
                  onClick={() => toggleNotebook(notebook.id)}
                  className="w-full flex items-center gap-1.5 py-1.5 px-2 rounded-md text-sm font-medium hover:bg-accent/50 transition-colors text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <Book className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  <span className="truncate">{notebook.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {nbNotes.length}
                  </span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      {nbNotes.map(note => (
                        <WikiTreeItem
                          key={note.id}
                          note={note}
                          isSelected={selectedNoteId === note.id}
                          onSelect={onSelectNote}
                          allNotes={notes}
                          depth={1}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Loose notes */}
          {loose.length > 0 && (
            <div className="pt-2 border-t mt-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold px-2 mb-1">
                Notas Soltas
              </p>
              {loose.map(note => (
                <WikiTreeItem
                  key={note.id}
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  onSelect={onSelectNote}
                  allNotes={notes}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Backlinks panel */}
      {selectedNote && backlinks.length > 0 && (
        <div className="border-t p-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            Backlinks ({backlinks.length})
          </p>
          {backlinks.slice(0, 5).map(bl => (
            <button
              key={bl.id}
              onClick={() => onSelectNote(bl.id)}
              className="w-full flex items-center gap-1.5 py-1 px-2 rounded-sm text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors text-left"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{bl.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
