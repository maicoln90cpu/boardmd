import { useState } from "react";
import { LayoutGrid, Download, Upload, Palette, Settings, LogOut, Pencil, Trash2, Layers, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  onExport: () => void;
  onImport: () => void;
  onThemeToggle: () => void;
  onViewChange: (mode: "daily" | "all") => void;
  viewMode: "daily" | "all";
}

export function Sidebar({ onExport, onImport, onThemeToggle, onViewChange, viewMode }: SidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const { categories, deleteCategory } = useCategories();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (confirm("Deseja realmente sair?")) {
      await signOut();
    }
  };

  const handleEditCategory = async (id: string, newName: string) => {
    if (!newName.trim()) {
      toast({ title: "Nome não pode ser vazio", variant: "destructive" });
      return;
    }

    const category = categories.find(c => c.id === id);
    if (category?.name === "Diário") {
      toast({ title: "Não é possível editar a categoria Diário", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("categories")
      .update({ name: newName.trim() })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar categoria", variant: "destructive" });
    } else {
      toast({ title: "Categoria atualizada!" });
      setEditingId(null);
      setEditingName("");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (category?.name === "Diário") {
      toast({ title: "Não é possível excluir a categoria Diário", variant: "destructive" });
      return;
    }

    if (confirm(`Deseja realmente excluir a categoria "${category?.name}"?`)) {
      await deleteCategory(id);
    }
  };

  const menuItems = [
    { icon: Calendar, label: "Diário", active: viewMode === "daily", onClick: () => onViewChange("daily") },
    { icon: Layers, label: "Todos", active: viewMode === "all", onClick: () => onViewChange("all") },
    { icon: FileText, label: "Anotações", onClick: () => navigate("/notes") },
    { icon: Download, label: "Exportar", onClick: onExport },
    { icon: Upload, label: "Importar", onClick: onImport },
    { icon: Palette, label: "Tema", onClick: onThemeToggle },
    { icon: Settings, label: "Configurações", onClick: () => setSettingsOpen(true) },
    { icon: LogOut, label: "Sair", onClick: handleLogout },
  ];

  return (
    <>
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-card">
        <div className="px-6 py-4 border-b">
          <h1 className="text-xl font-bold">Kanban Board</h1>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {menuItems.map((item) => (
            <Button
              key={item.label}
              variant={item.active ? "secondary" : "ghost"}
              className="justify-start gap-3"
              onClick={item.onClick}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>
      </aside>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent aria-describedby="settings-dialog-description" className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
            <DialogDescription id="settings-dialog-description">
              Painel de preferências do sistema
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tema</span>
                <Button size="sm" variant="outline" onClick={onThemeToggle}>
                  Alternar Tema
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Gerenciar Categorias</h3>
              <div className="space-y-2">
                {categories
                  .filter(cat => cat.name !== "Diário")
                  .map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                    >
                      {editingId === category.id ? (
                        <>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleEditCategory(category.id, editingName);
                              }
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditingName("");
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleEditCategory(category.id, editingName)}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm">{category.name}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingId(category.id);
                              setEditingName(category.name);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
