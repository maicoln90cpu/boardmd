import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Trash2, 
  CheckCircle2, 
  ArrowRight, 
  X,
  CheckSquare
} from "lucide-react";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { Column } from "@/hooks/data/useColumns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useState } from "react";

interface BulkActionsBarProps {
  columns: Column[];
  onBulkDelete: (taskIds: string[]) => void;
  onBulkComplete: (taskIds: string[], completed: boolean) => void;
  onBulkMove: (taskIds: string[], columnId: string) => void;
}

export function BulkActionsBar({
  columns,
  onBulkDelete,
  onBulkComplete,
  onBulkMove,
}: BulkActionsBarProps) {
  const { selectedTaskIds, selectedCount, clearSelection, isSelectionMode } = useBulkSelection();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = () => {
    onBulkDelete(Array.from(selectedTaskIds));
    clearSelection();
    setDeleteDialogOpen(false);
  };

  const handleComplete = (completed: boolean) => {
    onBulkComplete(Array.from(selectedTaskIds), completed);
    clearSelection();
  };

  const handleMove = (columnId: string) => {
    onBulkMove(Array.from(selectedTaskIds), columnId);
    clearSelection();
  };

  return (
    <>
      <AnimatePresence>
        {isSelectionMode && selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-card/95 backdrop-blur-lg border border-border shadow-2xl rounded-2xl">
              {/* Selected count */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg mr-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  {selectedCount} selecionada{selectedCount > 1 ? "s" : ""}
                </span>
              </div>

              {/* Complete action */}
              <Button
                size="sm"
                variant="ghost"
                className="gap-2 hover:bg-green-500/10 hover:text-green-600"
                onClick={() => handleComplete(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Completar</span>
              </Button>

              {/* Move action */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2 hover:bg-blue-500/10 hover:text-blue-600"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span className="hidden sm:inline">Mover</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {columns.map((column) => (
                    <DropdownMenuItem
                      key={column.id}
                      onClick={() => handleMove(column.id)}
                    >
                      {column.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Delete action */}
              <Button
                size="sm"
                variant="ghost"
                className="gap-2 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Excluir</span>
              </Button>

              {/* Divider */}
              <div className="w-px h-6 bg-border mx-1" />

              {/* Cancel */}
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Cancelar</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCount} tarefa{selectedCount > 1 ? "s" : ""}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir {selectedCount} tarefa{selectedCount > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
