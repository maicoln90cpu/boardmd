import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Column } from "@/hooks/useColumns";
import { useTasks } from "@/hooks/useTasks";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface ColumnManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Column[];
  hiddenColumns: string[];
  onToggleVisibility: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => Promise<boolean>;
  onResetToDefault: () => void;
}

export function ColumnManager({
  open,
  onOpenChange,
  columns,
  hiddenColumns,
  onToggleVisibility,
  onDeleteColumn,
  onResetToDefault,
}: ColumnManagerProps) {
  const { tasks } = useTasks("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Gerenciar Colunas</DialogTitle>
            <DialogDescription>
              Mostre ou oculte colunas do seu Kanban. Colunas ocultas continuam existindo com suas tarefas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 py-2">
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

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {columns.map((column, index) => {
                const taskCount = getTaskCount(column.id);
                const visible = isVisible(column.id);
                const isOriginal = index < 3;

                return (
                  <div
                    key={column.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={visible}
                        onCheckedChange={() => onToggleVisibility(column.id)}
                        id={`column-${column.id}`}
                      />
                      <label
                        htmlFor={`column-${column.id}`}
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                      >
                        {visible ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={visible ? "font-medium" : "text-muted-foreground"}>
                          {column.name}
                        </span>
                        {isOriginal && (
                          <Badge variant="secondary" className="text-xs">
                            Original
                          </Badge>
                        )}
                      </label>
                      <Badge variant="outline" className="ml-auto">
                        {taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}
                      </Badge>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(column.id)}
                      disabled={taskCount > 0 || isOriginal}
                      className="ml-2"
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
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {columns.length - hiddenColumns.length} de {columns.length} colunas visíveis
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
