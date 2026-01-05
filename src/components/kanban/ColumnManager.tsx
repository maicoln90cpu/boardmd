import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Eye, EyeOff, RefreshCw, GripVertical, Pencil } from "lucide-react";
import { Column } from "@/hooks/data/useColumns";
import { useTasks } from "@/hooks/tasks/useTasks";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

interface ColumnManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Column[];
  hiddenColumns: string[];
  onToggleVisibility: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => Promise<boolean>;
  onResetToDefault: () => void;
  onRenameColumn: (columnId: string, newName: string) => void;
  onReorderColumns: (newOrder: Column[]) => void;
  onAddColumn: (name: string) => void;
  onToggleKanbanVisibility: (columnId: string, kanbanType: 'daily' | 'projects', visible: boolean) => void;
}

interface SortableColumnItemProps {
  column: Column;
  index: number;
  visible: boolean;
  taskCount: number;
  isOriginal: boolean;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onToggleKanbanVisibility: (kanbanType: 'daily' | 'projects', visible: boolean) => void;
}

function SortableColumnItem({
  column,
  index,
  visible,
  taskCount,
  isOriginal,
  onToggleVisibility,
  onDelete,
  onRename,
  onToggleKanbanVisibility,
}: SortableColumnItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveRename = () => {
    if (editName.trim() && editName !== column.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      setEditName(column.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <Checkbox
            checked={visible}
            onCheckedChange={onToggleVisibility}
            id={`column-${column.id}`}
          />
          
          <div className="flex items-center gap-2 flex-1">
            {visible ? (
              <Eye className="h-4 w-4 text-green-600" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={handleKeyDown}
                className="h-7 max-w-[200px]"
                autoFocus
              />
            ) : (
              <label
                htmlFor={`column-${column.id}`}
                className="flex items-center gap-2 flex-1 cursor-pointer"
              >
                <span className={visible ? "font-medium" : "text-muted-foreground"}>
                  {column.name}
                </span>
                {isOriginal && (
                  <Badge variant="secondary" className="text-xs">
                    Original
                  </Badge>
                )}
              </label>
            )}
            
            <Badge variant="outline" className="ml-auto">
              {taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8"
            title="Renomear coluna"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={taskCount > 0 || isOriginal}
            className="h-8 w-8"
            title={
              isOriginal
                ? "Colunas originais não podem ser deletadas"
                : taskCount > 0
                ? `Mova as ${taskCount} tarefas antes de deletar`
                : "Deletar coluna"
            }
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Checkboxes para controlar visibilidade por Kanban */}
      <div className="flex items-center gap-4 pl-11">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={column.show_in_daily ?? true}
            onCheckedChange={(checked) => onToggleKanbanVisibility('daily', checked as boolean)}
          />
          <span className="text-muted-foreground">Kanban Diário</span>
        </label>
        
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={column.show_in_projects ?? true}
            onCheckedChange={(checked) => onToggleKanbanVisibility('projects', checked as boolean)}
          />
          <span className="text-muted-foreground">Kanban Projetos</span>
        </label>
      </div>
    </div>
  );
}

export function ColumnManager({
  open,
  onOpenChange,
  columns,
  hiddenColumns,
  onToggleVisibility,
  onDeleteColumn,
  onResetToDefault,
  onRenameColumn,
  onReorderColumns,
  onAddColumn,
  onToggleKanbanVisibility,
}: ColumnManagerProps) {
  const { tasks } = useTasks("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [orderedColumns, setOrderedColumns] = useState<Column[]>(columns);
  const [newColumnName, setNewColumnName] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Atualizar orderedColumns quando columns mudar
  useEffect(() => {
    setOrderedColumns(columns);
  }, [columns]);

  const getTaskCount = (columnId: string) => {
    return tasks.filter((task) => task.column_id === columnId).length;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const success = await onDeleteColumn(deleteTarget);
    if (success) {
      setDeleteTarget(null);
    }
  };

  const isVisible = (columnId: string) => !hiddenColumns.includes(columnId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        onReorderColumns(newOrder);
        return newOrder;
      });
    }
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    onAddColumn(newColumnName.trim());
    setNewColumnName("");
    setIsAddingColumn(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Gerenciar Colunas</DialogTitle>
            <DialogDescription>
              Arraste para reordenar, clique no lápis para renomear, ou mostre/oculte colunas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onResetToDefault}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Resetar para Padrão (3 colunas)
              </Button>
            </div>

            {!isAddingColumn ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAddingColumn(true)}
                className="w-full"
              >
                + Nova Coluna
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Nome da nova coluna..."
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddColumn();
                    } else if (e.key === "Escape") {
                      setIsAddingColumn(false);
                      setNewColumnName("");
                    }
                  }}
                />
                <Button size="sm" onClick={handleAddColumn}>
                  Criar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingColumn(false);
                    setNewColumnName("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedColumns.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {orderedColumns.map((column, index) => {
                    const taskCount = getTaskCount(column.id);
                    const visible = isVisible(column.id);
                    const isOriginal = index < 3;

                    return (
                      <SortableColumnItem
                        key={column.id}
                        column={column}
                        index={index}
                        visible={visible}
                        taskCount={taskCount}
                        isOriginal={isOriginal}
                        onToggleVisibility={() => onToggleVisibility(column.id)}
                        onDelete={() => setDeleteTarget(column.id)}
                        onRename={(newName) => onRenameColumn(column.id, newName)}
                        onToggleKanbanVisibility={(kanbanType, visible) => 
                          onToggleKanbanVisibility(column.id, kanbanType, visible)
                        }
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {orderedColumns.length - hiddenColumns.length} de {orderedColumns.length} colunas visíveis
            </p>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de deleção */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Coluna</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a coluna "{columns.find((c) => c.id === deleteTarget)?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
