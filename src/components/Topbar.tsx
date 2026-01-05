import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category } from "@/hooks/data/useCategories";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PushStatusIndicator } from "@/components/PushStatusIndicator";

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
    <>
      <div className="sticky top-0 z-30 flex flex-col md:flex-row items-stretch md:items-center gap-2 px-3 py-2 border-b bg-background overflow-x-hidden">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <h2 className="hidden md:block text-lg font-semibold whitespace-nowrap">📊 Kanban - Projetos</h2>
          
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="flex-1 md:flex-none md:w-48 text-sm h-9 min-w-0">
              <SelectValue placeholder="Categoria" />
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
              <Button size="sm" variant="outline" className="shrink-0 h-9">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Nova Categoria</span>
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

        {/* Status indicators */}
        <div className="flex items-center justify-end gap-2 ml-auto">
          <PushStatusIndicator />
        </div>
      </div>
      <InstallPrompt />
    </>
  );
}
