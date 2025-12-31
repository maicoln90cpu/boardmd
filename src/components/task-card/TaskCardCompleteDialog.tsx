import React from "react";
import { Button } from "@/components/ui/button";
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

interface TaskCardCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: (moveToCompleted: boolean) => void;
}

export const TaskCardCompleteDialog: React.FC<TaskCardCompleteDialogProps> = ({
  open,
  onOpenChange,
  onCancel,
  onConfirm,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tarefa Realizada!</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja mover esta tarefa para a coluna "Concluído"?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <Button 
            variant="outline" 
            onClick={() => onConfirm(false)}
          >
            Apenas Marcar
          </Button>
          <AlertDialogAction onClick={() => onConfirm(true)}>
            Mover para Concluído
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
