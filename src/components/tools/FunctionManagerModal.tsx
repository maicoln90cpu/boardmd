import { useState } from "react";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToolFunctions, FUNCTION_PRESET_COLORS, ToolFunction } from "@/hooks/useToolFunctions";
import { cn } from "@/lib/utils";

interface FunctionManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FunctionManagerModal({ open, onOpenChange }: FunctionManagerModalProps) {
  const { functions, addFunction, updateFunction, deleteFunction, loading } = useToolFunctions();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(FUNCTION_PRESET_COLORS[0].value);
  const [functionToDelete, setFunctionToDelete] = useState<ToolFunction | null>(null);

  const handleStartEdit = (func: ToolFunction) => {
    setEditingId(func.id);
    setEditName(func.name);
    setEditColor(func.color || FUNCTION_PRESET_COLORS[0].value);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    
    await updateFunction(editingId, {
      name: editName.trim(),
      color: editColor,
    });
    handleCancelEdit();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    
    const result = await addFunction(newName.trim(), newColor);
    if (result) {
      setNewName("");
      setNewColor(FUNCTION_PRESET_COLORS[0].value);
      setIsCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!functionToDelete) return;
    await deleteFunction(functionToDelete.id);
    setFunctionToDelete(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Gerenciar Funções</DialogTitle>
            <DialogDescription>
              Adicione, edite ou exclua funções para categorizar suas ferramentas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Create new function */}
            {isCreating ? (
              <div className="p-3 border rounded-lg space-y-3 bg-muted/50">
                <Input
                  placeholder="Nome da função..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.slice(0, 50))}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreate();
                    }
                    if (e.key === "Escape") {
                      setIsCreating(false);
                      setNewName("");
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {FUNCTION_PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all",
                        newColor === color.value
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setNewColor(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
                    <Check className="h-4 w-4 mr-1" />
                    Criar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreating(false);
                      setNewName("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4" />
                Adicionar nova função
              </Button>
            )}

            {/* Functions list */}
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {loading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Carregando...
                  </p>
                ) : functions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma função criada ainda
                  </p>
                ) : (
                  functions.map((func) => (
                    <div
                      key={func.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {editingId === func.id ? (
                        // Edit mode
                        <div className="flex-1 space-y-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value.slice(0, 50))}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveEdit();
                              }
                              if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {FUNCTION_PRESET_COLORS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                className={cn(
                                  "w-5 h-5 rounded-full border-2 transition-all",
                                  editColor === color.value
                                    ? "border-foreground scale-110"
                                    : "border-transparent hover:scale-105"
                                )}
                                style={{ backgroundColor: color.value }}
                                onClick={() => setEditColor(color.value)}
                                title={color.name}
                              />
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="default" onClick={handleSaveEdit}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div
                            className="w-5 h-5 rounded-full shrink-0"
                            style={{ backgroundColor: func.color || "#6B7280" }}
                          />
                          <span className="flex-1 truncate font-medium">{func.name}</span>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleStartEdit(func)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setFunctionToDelete(func)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!functionToDelete} onOpenChange={() => setFunctionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir função</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{functionToDelete?.name}"? 
              As ferramentas que usam esta função não serão excluídas, mas perderão essa categorização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
