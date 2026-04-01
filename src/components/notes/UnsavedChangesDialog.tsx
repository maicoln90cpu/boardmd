import { Save, LogOut } from "lucide-react";
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

interface UnsavedChangesDialogProps {
  open: boolean;
  onSaveAndLeave: () => void;
  onLeaveWithoutSaving: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  open,
  onSaveAndLeave,
  onLeaveWithoutSaving,
  onCancel,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem alterações não salvas nesta nota. O que deseja fazer?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:gap-0">
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={onLeaveWithoutSaving}
            className="gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            Sair sem salvar
          </Button>
          <AlertDialogAction onClick={onSaveAndLeave} className="gap-1.5">
            <Save className="h-4 w-4" />
            Salvar e sair
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
