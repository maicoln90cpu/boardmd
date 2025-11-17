import { useEffect, useState } from "react";
import { Search, FileText } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Task } from "@/hooks/useTasks";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: string;
  name: string;
}

interface GlobalSearchProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  categories: Category[];
}

export function GlobalSearch({ tasks, onSelectTask, categories }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);

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

  const handleSelect = (task: Task) => {
    setOpen(false);
    onSelectTask(task);
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || "Sem categoria";
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
        <CommandInput placeholder="Buscar tarefas..." />
        <CommandList>
          <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
          <CommandGroup heading="Tarefas">
            {tasks.map((task) => (
              <CommandItem
                key={task.id}
                onSelect={() => handleSelect(task)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">{task.title}</div>
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
        </CommandList>
      </CommandDialog>
    </>
  );
}
