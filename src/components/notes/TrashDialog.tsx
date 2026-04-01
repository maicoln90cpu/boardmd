import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, RotateCcw, X } from "lucide-react";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useTrash, TrashItem } from "@/hooks/useTrash";
import { TrashNoteData, TrashNotebookData } from "@/types";

interface TrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrashDialog({ open, onOpenChange }: TrashDialogProps) {
  const { trashItems, loading, restoreItem, permanentlyDelete, emptyTrash } = useTrash();
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const handleRestore = async (item: TrashItem) => {
    await restoreItem(item);
  };

  const handlePermanentDelete = async (itemId: string) => {
    await permanentlyDelete(itemId);
  };

  const handleEmptyTrash = async () => {
    await emptyTrash();
    setConfirmEmpty(false);
  };

  const getItemTitle = (item: TrashItem) => {
    if (item.item_type === "notebook") {
      const data = item.item_data as TrashNotebookData;
      return `📓 ${data.notebook?.name || "Caderno sem nome"}`;
    }
    const data = item.item_data as TrashNoteData;
    return `📝 ${data.title || "Nota sem título"}`;
  };

  const getNotebookNotesCount = (item: TrashItem): number => {
    if (item.item_type !== "notebook") return 0;
    const data = item.item_data as TrashNotebookData;
    return data.notes?.length || 0;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>🗑️ Lixeira</span>
              {trashItems.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmEmpty(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Esvaziar Lixeira
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center">
              <ListLoadingSkeleton count={3} />
            </div>
          ) : trashItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>A lixeira está vazia</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trashItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{getItemTitle(item)}</p>
                    <p className="text-xs text-muted-foreground">
                      Excluído em{" "}
                      {format(new Date(item.deleted_at), "dd 'de' MMMM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                    {item.item_type === "notebook" &&
                      getNotebookNotesCount(item) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ({getNotebookNotesCount(item)} notas incluídas)
                        </p>
                      )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(item)}
                      title="Restaurar"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handlePermanentDelete(item.id)}
                      title="Excluir permanentemente"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmEmpty} onOpenChange={setConfirmEmpty}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esvaziar lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja esvaziar a lixeira? Esta ação é permanente e
              não pode ser desfeita. Todos os {trashItems.length} itens serão excluídos
              definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Esvaziar Lixeira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
