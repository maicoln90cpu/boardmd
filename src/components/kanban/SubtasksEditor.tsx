import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface SubtasksEditorProps {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
}

export function SubtasksEditor({ subtasks, onChange }: SubtasksEditorProps) {
  const [newSubtask, setNewSubtask] = useState("");

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    
    const subtask: Subtask = {
      id: crypto.randomUUID(),
      title: newSubtask.trim(),
      completed: false,
    };
    
    onChange([...subtasks, subtask]);
    setNewSubtask("");
  };

  const removeSubtask = (id: string) => {
    onChange(subtasks.filter((st) => st.id !== id));
  };

  const toggleSubtask = (id: string) => {
    onChange(
      subtasks.map((st) =>
        st.id === id ? { ...st, completed: !st.completed } : st
      )
    );
  };

  return (
    <div className="space-y-3">
      <Label>Subtarefas</Label>
      
      {/* Item 5: Adicionar ScrollArea quando há muitas subtarefas */}
      <ScrollArea className={subtasks.length > 5 ? "max-h-[200px]" : ""}>
        <div className="space-y-2 pr-4">
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-2 group">
              <Checkbox
                checked={subtask.completed}
                onCheckedChange={() => toggleSubtask(subtask.id)}
              />
              <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                {subtask.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeSubtask(subtask.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        <Input
          placeholder="Nova subtarefa..."
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSubtask();
            }
          }}
        />
        <Button onClick={addSubtask} size="icon" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
