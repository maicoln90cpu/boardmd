import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  children?: Subtask[];
}

interface SubtasksEditorProps {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
}

interface SortableSubtaskProps {
  subtask: Subtask;
  depth: number;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onToggleExpand: (id: string) => void;
  expandedIds: Set<string>;
  onChildrenChange: (parentId: string, children: Subtask[]) => void;
}

function SortableSubtask({ 
  subtask, 
  depth, 
  onToggle, 
  onRemove, 
  onAddChild,
  onToggleExpand,
  expandedIds,
  onChildrenChange
}: SortableSubtaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasChildren = subtask.children && subtask.children.length > 0;
  const isExpanded = expandedIds.has(subtask.id);
  const maxDepth = 2; // Limitar profundidade para evitar complexidade excessiva

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleChildDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && subtask.children) {
      const oldIndex = subtask.children.findIndex((c) => c.id === active.id);
      const newIndex = subtask.children.findIndex((c) => c.id === over.id);
      onChildrenChange(subtask.id, arrayMove(subtask.children, oldIndex, newIndex));
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "flex items-center gap-2 group py-1 rounded-md transition-colors",
          isDragging && "opacity-50 bg-muted",
          depth > 0 && "ml-6"
        )}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        {hasChildren ? (
          <button
            onClick={() => onToggleExpand(subtask.id)}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        <Checkbox
          checked={subtask.completed}
          onCheckedChange={() => onToggle(subtask.id)}
        />
        
        <span 
          className={cn(
            "flex-1 text-sm",
            subtask.completed && "line-through text-muted-foreground"
          )}
        >
          {subtask.title}
        </span>

        {depth < maxDepth && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onAddChild(subtask.id)}
            title="Adicionar subitem"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          onClick={() => onRemove(subtask.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleChildDragEnd}
        >
          <SortableContext
            items={subtask.children!.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {subtask.children!.map((child) => (
              <SortableSubtask
                key={child.id}
                subtask={child}
                depth={depth + 1}
                onToggle={onToggle}
                onRemove={onRemove}
                onAddChild={onAddChild}
                onToggleExpand={onToggleExpand}
                expandedIds={expandedIds}
                onChildrenChange={onChildrenChange}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export function SubtasksEditor({ subtasks, onChange }: SubtasksEditorProps) {
  const [newSubtask, setNewSubtask] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Modal state for adding child subtask
  const [addChildModalOpen, setAddChildModalOpen] = useState(false);
  const [addChildParentId, setAddChildParentId] = useState<string | null>(null);
  const [addChildTitle, setAddChildTitle] = useState("");
  const childInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Calcular progresso recursivamente
  const calculateProgress = useCallback((items: Subtask[]): { completed: number; total: number } => {
    let completed = 0;
    let total = 0;

    for (const item of items) {
      total++;
      if (item.completed) completed++;
      
      if (item.children && item.children.length > 0) {
        const childProgress = calculateProgress(item.children);
        completed += childProgress.completed;
        total += childProgress.total;
      }
    }

    return { completed, total };
  }, []);

  const { completed, total } = calculateProgress(subtasks);
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    
    const subtask: Subtask = {
      id: crypto.randomUUID(),
      title: newSubtask.trim(),
      completed: false,
      children: [],
    };
    
    onChange([...subtasks, subtask]);
    setNewSubtask("");
  };

  // Funções recursivas para manipular a árvore
  const findAndUpdate = (
    items: Subtask[],
    id: string,
    updater: (item: Subtask) => Subtask | null
  ): Subtask[] => {
    return items.reduce<Subtask[]>((acc, item) => {
      if (item.id === id) {
        const updated = updater(item);
        if (updated) acc.push(updated);
        return acc;
      }
      
      const updatedChildren = item.children 
        ? findAndUpdate(item.children, id, updater)
        : [];
      
      acc.push({
        ...item,
        children: updatedChildren,
      });
      
      return acc;
    }, []);
  };

  const toggleSubtask = (id: string) => {
    onChange(
      findAndUpdate(subtasks, id, (item) => ({
        ...item,
        completed: !item.completed,
      }))
    );
  };

  const removeSubtask = (id: string) => {
    onChange(findAndUpdate(subtasks, id, () => null));
  };

  const openAddChildModal = (parentId: string) => {
    setAddChildParentId(parentId);
    setAddChildTitle("");
    setAddChildModalOpen(true);
  };

  const handleAddChildConfirm = () => {
    if (!addChildTitle.trim() || !addChildParentId) return;

    const newChild: Subtask = {
      id: crypto.randomUUID(),
      title: addChildTitle.trim(),
      completed: false,
      children: [],
    };

    onChange(
      findAndUpdate(subtasks, addChildParentId, (item) => ({
        ...item,
        children: [...(item.children || []), newChild],
      }))
    );

    // Expandir o parent automaticamente
    setExpandedIds((prev) => new Set([...prev, addChildParentId]));
    
    // Fechar modal e limpar estado
    setAddChildModalOpen(false);
    setAddChildParentId(null);
    setAddChildTitle("");
  };

  // Focus input when modal opens
  useEffect(() => {
    if (addChildModalOpen && childInputRef.current) {
      setTimeout(() => childInputRef.current?.focus(), 50);
    }
  }, [addChildModalOpen]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleChildrenChange = (parentId: string, children: Subtask[]) => {
    onChange(
      findAndUpdate(subtasks, parentId, (item) => ({
        ...item,
        children,
      }))
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = subtasks.findIndex((st) => st.id === active.id);
      const newIndex = subtasks.findIndex((st) => st.id === over.id);
      onChange(arrayMove(subtasks, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Subtarefas</Label>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {completed}/{total} ({progressPercent}%)
          </span>
        )}
      </div>

      {/* Barra de progresso */}
      {total > 0 && (
        <Progress 
          value={progressPercent} 
          className="h-2"
        />
      )}
      
      {/* Lista de subtarefas com drag & drop */}
      <ScrollArea className={subtasks.length > 5 ? "max-h-[250px]" : ""}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={subtasks.map((st) => st.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1 pr-4">
              {subtasks.map((subtask) => (
                <SortableSubtask
                  key={subtask.id}
                  subtask={subtask}
                  depth={0}
                  onToggle={toggleSubtask}
                  onRemove={removeSubtask}
                  onAddChild={openAddChildModal}
                  onToggleExpand={toggleExpand}
                  expandedIds={expandedIds}
                  onChildrenChange={handleChildrenChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>

      {/* Input para nova subtarefa */}
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

      {/* Modal para adicionar subitem */}
      <Dialog open={addChildModalOpen} onOpenChange={setAddChildModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adicionar subitem</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              ref={childInputRef}
              placeholder="Nome do subitem..."
              value={addChildTitle}
              onChange={(e) => setAddChildTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddChildConfirm();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddChildModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddChildConfirm} disabled={!addChildTitle.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
