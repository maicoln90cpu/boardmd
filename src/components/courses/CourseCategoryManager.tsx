import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Pencil, Trash2, Plus, Tags } from "lucide-react";
import { toast } from "sonner";

export interface CourseCategory {
  value: string;
  label: string;
  emoji: string;
}

// Categorias padrão do sistema
export const DEFAULT_COURSE_CATEGORIES: CourseCategory[] = [
  { value: "programacao", label: "Programação", emoji: "💻" },
  { value: "design", label: "Design", emoji: "🎨" },
  { value: "marketing", label: "Marketing", emoji: "📈" },
  { value: "negocios", label: "Negócios", emoji: "💼" },
  { value: "idiomas", label: "Idiomas", emoji: "🌍" },
  { value: "desenvolvimento_pessoal", label: "Desenvolvimento Pessoal", emoji: "🧠" },
  { value: "financas", label: "Finanças", emoji: "💰" },
  { value: "saude", label: "Saúde", emoji: "🏃" },
  { value: "musica", label: "Música", emoji: "🎵" },
  { value: "fotografia", label: "Fotografia", emoji: "📷" },
  { value: "outro", label: "Outro", emoji: "📚" },
];

// Emojis disponíveis para seleção
const AVAILABLE_EMOJIS = [
  "💻", "🎨", "📈", "💼", "🌍", "🧠", "💰", "🏃", "🎵", "📷", "📚",
  "🎮", "🎯", "🚀", "⚡", "🔧", "📱", "🌐", "🎬", "✏️", "🔬", "🧪",
  "📊", "🏆", "💡", "🎓", "📖", "🖥️", "🤖", "🔒", "🎲", "🧩"
];

interface CourseCategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CourseCategory[];
  onCategoriesChange: (categories: CourseCategory[]) => void;
}

export function CourseCategoryManager({
  open,
  onOpenChange,
  categories,
  onCategoriesChange,
}: CourseCategoryManagerProps) {
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CourseCategory | null>(null);

  // Form state
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("📚");

  const handleOpenEditDialog = (category: CourseCategory) => {
    setEditingCategory(category);
    setLabel(category.label);
    setEmoji(category.emoji);
    setIsEditing(true);
  };

  const handleOpenCreateDialog = () => {
    setEditingCategory(null);
    setLabel("");
    setEmoji("📚");
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!label.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    const value = label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_");

    if (editingCategory) {
      // Editar existente
      const updated = categories.map((cat) =>
        cat.value === editingCategory.value
          ? { value, label: label.trim(), emoji }
          : cat
      );
      onCategoriesChange(updated);
      toast.success("Categoria atualizada!");
    } else {
      // Criar nova
      if (categories.some((cat) => cat.value === value)) {
        toast.error("Já existe uma categoria com esse nome");
        return;
      }
      onCategoriesChange([...categories, { value, label: label.trim(), emoji }]);
      toast.success("Categoria criada!");
    }

    setIsEditing(false);
    setEditingCategory(null);
  };

  const handleDelete = () => {
    if (!categoryToDelete) return;

    const updated = categories.filter(
      (cat) => cat.value !== categoryToDelete.value
    );
    onCategoriesChange(updated);
    toast.success("Categoria excluída!");
    setCategoryToDelete(null);
  };

  const handleResetToDefault = () => {
    onCategoriesChange(DEFAULT_COURSE_CATEGORIES);
    toast.success("Categorias restauradas!");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Gerenciar Categorias
            </DialogTitle>
            <DialogDescription>
              Personalize as categorias dos seus cursos
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-4">
            {categories.map((category) => (
              <div
                key={category.value}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{category.emoji}</span>
                  <span className="font-medium">{category.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenEditDialog(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setCategoryToDelete(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleResetToDefault}
              className="w-full sm:w-auto"
            >
              Restaurar Padrão
            </Button>
            <Button onClick={handleOpenCreateDialog} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar/criar categoria */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryLabel">Nome</Label>
              <Input
                id="categoryLabel"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Inteligência Artificial"
              />
            </div>

            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
                {AVAILABLE_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`text-2xl p-1.5 rounded-md transition-colors ${
                      emoji === e
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={() => setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{categoryToDelete?.emoji}{" "}
              {categoryToDelete?.label}"? Cursos que usam essa categoria não
              serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
