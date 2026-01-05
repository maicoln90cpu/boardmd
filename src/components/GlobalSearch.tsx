import { useEffect, useState } from "react";
import { Search, FileText, StickyNote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Task } from "@/hooks/tasks/useTasks";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: string;
  name: string;
}

interface Note {
  id: string;
  title: string;
  content: string | null;
  notebook_id: string | null;
}

interface Notebook {
  id: string;
  name: string;
}

interface GlobalSearchProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  categories: Category[];
  notes?: Note[];
  notebooks?: Notebook[];
}

export function GlobalSearch({ tasks, onSelectTask, categories, notes = [], notebooks = [] }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelectTask = (task: Task) => {
    setOpen(false);
    onSelectTask(task);
  };

  const handleSelectNote = (note: Note) => {
    setOpen(false);
    navigate(`/notes?noteId=${note.id}`);
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || "Sem categoria";
  };

  const getNotebookName = (notebookId: string | null) => {
    if (!notebookId) return "Sem caderno";
    return notebooks.find(n => n.id === notebookId)?.name || "Sem caderno";
  };

  const stripHtml = (html: string | null) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, '').substring(0, 100);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border rounded-md hover:bg-accent min-h-[48px]"
      >
        <Search className="h-4 w-4 flex-shrink-0" />
        <span className="hidden sm:inline">Buscar tarefas...</span>
        <span className="sm:hidden">Buscar</span>
        <kbd className="ml-auto pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar tarefas e notas..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Tarefas">
            {tasks.map((task) => (
              <CommandItem
                key={task.id}
                onSelect={() => handleSelectTask(task)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{task.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs">
                      {getCategoryName(task.category_id)}
                    </Badge>
                    {task.description && (
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {task.description}
                      </span>
                    )}
                  </div>
                </div>
                {task.priority && (
                  <Badge variant="outline" className="text-xs">
                    {task.priority}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
          {notes.length > 0 && (
            <CommandGroup heading="Notas">
              {notes.map((note) => (
                <CommandItem
                  key={note.id}
                  onSelect={() => handleSelectNote(note)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{note.title || "Sem título"}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs">
                        {getNotebookName(note.notebook_id)}
                      </Badge>
                      {note.content && (
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {stripHtml(note.content)}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
