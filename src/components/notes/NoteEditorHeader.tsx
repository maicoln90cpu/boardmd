import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, Pin, Link2, CheckCircle2, Share2, BookOpen, ChevronsUpDown } from "lucide-react";
import { Note } from "@/hooks/useNotes";
import { Notebook } from "@/hooks/useNotebooks";
import { Task } from "@/hooks/tasks/useTasks";
import { ColorPicker } from "./ColorPicker";

interface NoteEditorHeaderProps {
  note: Note;
  title: string;
  onTitleChange: (value: string) => void;
  color: string | null;
  onColorChange: (color: string | null) => void;
  notebooks: Notebook[];
  onMoveToNotebook: (noteId: string, notebookId: string | null) => void;
  onTogglePin: (id: string) => void;
  onShare: () => void;
  showSavedIndicator: boolean;
  
  // Task linking
  linkedTaskId: string | null;
  onLinkedTaskChange: (taskId: string | null) => void;
  tasks: Task[];
  taskSearchOpen: boolean;
  onTaskSearchOpenChange: (open: boolean) => void;
}

export function NoteEditorHeader({
  note,
  title,
  onTitleChange,
  color,
  onColorChange,
  notebooks,
  onMoveToNotebook,
  onTogglePin,
  onShare,
  showSavedIndicator,
  linkedTaskId,
  onLinkedTaskChange,
  tasks,
  taskSearchOpen,
  onTaskSearchOpenChange,
}: NoteEditorHeaderProps) {
  return (
    <div className="p-4 sm:p-6 border-b space-y-3 flex-shrink-0">
      {/* Title and actions */}
      <div className="flex items-start gap-2">
        <Input 
          placeholder="Título da anotação..." 
          value={title} 
          onChange={e => onTitleChange(e.target.value)} 
          className="text-xl sm:text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 flex-1 bg-transparent" 
        />
        <div className="flex gap-2">
          <Button 
            variant={note.is_pinned ? "default" : "outline"} 
            size="icon" 
            onClick={() => onTogglePin(note.id)} 
            className="h-10 w-10 shrink-0"
          >
            <Pin className={`h-4 w-4 ${note.is_pinned ? "fill-current" : ""}`} />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onShare} 
            className="h-10 w-10 shrink-0" 
            title="Compartilhar nota"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <ColorPicker currentColor={color} onColorChange={onColorChange} />
        </div>
      </div>

      {/* Saved indicator */}
      {showSavedIndicator && (
        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>Nota salva</span>
        </div>
      )}

      {/* Move to notebook */}
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        <Select 
          value={note.notebook_id || "none"} 
          onValueChange={value => {
            const notebookId = value === "none" ? null : value;
            onMoveToNotebook(note.id, notebookId);
          }}
        >
          <SelectTrigger className="w-full sm:w-[300px] h-9 text-sm">
            <SelectValue placeholder="Selecione um caderno..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">Nenhum caderno</span>
            </SelectItem>
            {notebooks.map(notebook => (
              <SelectItem key={notebook.id} value={notebook.id}>
                {notebook.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Link to task */}
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <Popover open={taskSearchOpen} onOpenChange={onTaskSearchOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={taskSearchOpen}
              className="w-full sm:w-[300px] h-9 justify-between text-sm font-normal"
            >
              {linkedTaskId
                ? tasks.find(t => t.id === linkedTaskId)?.title || "Tarefa selecionada"
                : "Vincular a uma tarefa..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar tarefa..." />
              <CommandList>
                <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="none"
                    onSelect={() => {
                      onLinkedTaskChange(null);
                      onTaskSearchOpenChange(false);
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${!linkedTaskId ? "opacity-100" : "opacity-0"}`}
                    />
                    <span className="text-muted-foreground">Nenhuma tarefa vinculada</span>
                  </CommandItem>
                  {tasks.map(task => (
                    <CommandItem
                      key={task.id}
                      value={task.title}
                      onSelect={() => {
                        onLinkedTaskChange(task.id);
                        onTaskSearchOpenChange(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${linkedTaskId === task.id ? "opacity-100" : "opacity-0"}`}
                      />
                      {task.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
