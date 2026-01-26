import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useCourseCategories } from "@/hooks/useCourseCategories";

interface CourseCategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#10B981", "#14B8A6",
  "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1",
  "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
];

export function CourseCategoryManager({ open, onOpenChange }: CourseCategoryManagerProps) {
  const { categories, createCategory, updateCategory, deleteCategory, isCreating } = useCourseCategories();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    createCategory({ name: newName.trim(), color: newColor });
    setNewName("");
    setNewColor("#3B82F6");
  };

  const startEdit = (id: string, name: string, color: string) => {
    setEditingId(id);
    setEditName(name);
    setEditColor(color);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateCategory({ id: editingId, name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Adicionar nova categoria */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <Label>Nova Categoria</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nome da categoria"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button onClick={handleAdd} disabled={!newName.trim() || isCreating} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: newColor === color ? "white" : "transparent",
                    boxShadow: newColor === color ? `0 0 0 2px ${color}` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Lista de categorias */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma categoria criada
                </p>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-background"
                  >
                    {editingId === category.id ? (
                      <>
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: editColor }}
                        />
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 flex-1"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          {PRESET_COLORS.slice(0, 8).map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditColor(color)}
                              className="w-4 h-4 rounded-full border"
                              style={{
                                backgroundColor: color,
                                borderColor: editColor === color ? "white" : "transparent",
                              }}
                            />
                          ))}
                        </div>
                        <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8">
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8">
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="flex-1 truncate">{category.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(category.id, category.name, category.color)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteCategory(category.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
  );
}
