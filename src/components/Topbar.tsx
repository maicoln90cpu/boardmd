import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category } from "@/hooks/useCategories";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface TopbarProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  onAddCategory: (name: string) => void;
}

export function Topbar({ categories, selectedCategory, onCategoryChange, onAddCategory }: TopbarProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [open, setOpen] = useState(false);

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName);
      setNewCategoryName("");
      setOpen(false);
    }
  };

  const handleAdd = () => {
    const trimmedName = newCategoryName.trim();
    
    if (!trimmedName) {
      return;
    }
    
    if (trimmedName.toLowerCase() === "diário") {
      alert("Não é possível criar outra categoria 'Diário'");
      return;
    }
    
    onAddCategory(trimmedName);
    setNewCategoryName("");
    setOpen(false);
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
      <h2 className="text-lg font-semibold">Kanban — {categories.find(c => c.id === selectedCategory)?.name || "Projetos"}</h2>
      
      <div className="flex items-center gap-4">
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecione categoria" />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby="category-dialog-description">
            <DialogHeader>
              <DialogTitle>Criar Nova Categoria</DialogTitle>
            </DialogHeader>
            <p id="category-dialog-description" className="sr-only">
              Formulário para criar uma nova categoria de tarefas
            </p>
            <div className="space-y-4">
              <Input
                placeholder="Nome da categoria"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button onClick={handleAdd} className="w-full" disabled={!newCategoryName.trim()}>
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
