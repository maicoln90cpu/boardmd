import { useState } from "react";
import { LayoutGrid, Download, Upload, Palette, Settings, LogOut, Pencil, Trash2, Layers, Calendar, FileText, Plus, BarChart3, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
interface SidebarProps {
  onExport: () => void;
  onImport: () => void;
  onThemeToggle: () => void;
  onViewChange: (mode: "daily" | "all") => void;
  viewMode: "daily" | "all";
}
export function Sidebar({
  onExport,
  onImport,
  onThemeToggle,
  onViewChange,
  viewMode
}: SidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const {
    categories,
    addCategory,
    deleteCategory
  } = useCategories();
  const {
    toast
  } = useToast();
  const {
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = async () => {
    if (confirm("Deseja realmente sair?")) {
      await signOut();
    }
  };
  const handleEditCategory = async (id: string, newName: string) => {
    if (!newName.trim()) {
      toast({
        title: "Nome não pode ser vazio",
        variant: "destructive"
      });
      return;
    }
    const category = categories.find(c => c.id === id);
    if (category?.name === "Diário") {
      toast({
        title: "Não é possível editar a categoria Diário",
        variant: "destructive"
      });
      return;
    }
    const {
      error
    } = await supabase.from("categories").update({
      name: newName.trim()
    }).eq("id", id);
    if (error) {
      toast({
        title: "Erro ao atualizar categoria",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Categoria atualizada!"
      });
      setEditingId(null);
      setEditingName("");
    }
  };
  const handleDeleteCategory = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (category?.name === "Diário") {
      toast({
        title: "Não é possível excluir a categoria Diário",
        variant: "destructive"
      });
      return;
    }
    if (confirm(`Deseja realmente excluir a categoria "${category?.name}"?`)) {
      await deleteCategory(id);
    }
  };
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Nome não pode ser vazio",
        variant: "destructive"
      });
      return;
    }
    await addCategory(newCategoryName.trim());
    setNewCategoryName("");
    setIsAddingCategory(false);
  };
  
  const handleNavigation = (path: string, mode?: "daily" | "all") => {
    navigate(path);
    if (mode) {
      // Pequeno delay para garantir que a navegação aconteça primeiro
      setTimeout(() => onViewChange(mode), 50);
    }
  };

  const menuItems = [{
    icon: Calendar,
    label: "Diário",
    active: viewMode === "daily" && location.pathname === "/",
    onClick: () => handleNavigation("/", "daily")
  }, {
    icon: Layers,
    label: "Projetos",
    active: viewMode === "all" && location.pathname === "/",
    onClick: () => handleNavigation("/", "all")
  }, {
    icon: Calendar,
    label: "Calendário",
    active: location.pathname === "/calendar",
    onClick: () => navigate("/calendar")
  }, {
    icon: FileText,
    label: "Anotações",
    active: location.pathname === "/notes",
    onClick: () => navigate("/notes")
  }, {
    icon: BarChart3,
    label: "Dashboard",
    active: location.pathname === "/dashboard",
    onClick: () => navigate("/dashboard")
  }, {
    icon: Bell,
    label: "Notificações",
    active: location.pathname === "/notifications",
    onClick: () => navigate("/notifications")
  }, {
    icon: Settings,
    label: "Setup",
    active: location.pathname === "/config",
    onClick: () => navigate("/config")
  }];
  return <>
      {/* Sidebar responsiva - mobile drawer, desktop fixa */}
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-card hidden md:block">
        <div className="px-6 py-4 border-b">
          <h1 className="text-xl font-bold">Kanban Board</h1>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {menuItems.map(item => <Button key={item.label} variant={item.active ? "secondary" : "ghost"} onClick={item.onClick} className="justify-start gap-3 min-h-[48px] rounded-md text-lg text-red-500">
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>)}
        </nav>
      </aside>

      {/* Mobile menu - bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
        <div className="grid grid-cols-7 gap-0.5 p-1.5">
          {menuItems.map(item => <Button key={item.label} variant={item.active ? "secondary" : "ghost"} className="flex-col gap-0.5 h-auto py-2 text-[10px]" onClick={item.onClick}>
              <item.icon className="h-4 w-4" />
              <span className="truncate w-full text-center">{item.label}</span>
            </Button>)}
        </div>
      </nav>

    </>;
}