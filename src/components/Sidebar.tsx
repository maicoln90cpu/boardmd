import { useState } from "react";
import { LayoutGrid, Download, Upload, Palette, Settings, LogOut, Pencil, Trash2, Layers, Calendar, FileText, Plus, BarChart3, Bell, MoreHorizontal, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { PomodoroTimer } from "@/components/PomodoroTimer";
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
  // OTIMIZAÇÃO FASE 3: Separar itens principais e secundários para mobile
  const primaryMenuItems = [{
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
    icon: FileText,
    label: "Anotações",
    active: location.pathname === "/notes",
    onClick: () => navigate("/notes")
  }, {
    icon: BarChart3,
    label: "Dashboard",
    active: location.pathname === "/dashboard",
    onClick: () => navigate("/dashboard")
  }];

  const secondaryMenuItems = [{
    icon: Timer,
    label: "Pomodoro",
    active: location.pathname === "/pomodoro",
    onClick: () => navigate("/pomodoro")
  }, {
    icon: Calendar,
    label: "Calendário",
    active: location.pathname === "/calendar",
    onClick: () => navigate("/calendar")
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

  const allMenuItems = [...primaryMenuItems, ...secondaryMenuItems];
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);

  return <>
      {/* Pomodoro Timer Dialog */}
      <PomodoroTimer isOpen={pomodoroOpen} onClose={() => setPomodoroOpen(false)} />
      {/* Sidebar responsiva - mobile drawer, desktop fixa */}
      <aside className="fixed left-0 top-0 h-screen w-52 border-r border-border bg-card hidden md:block">
        <div className="px-4 py-4 border-b">
          <h1 className="text-lg font-bold">Kanban Board</h1>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {allMenuItems.map(item => <Button key={item.label} variant={item.active ? "secondary" : "ghost"} onClick={item.onClick} className="justify-start gap-2 min-h-[44px] rounded-md text-sm text-[#342e2e] font-semibold">
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>)}
        </nav>
      </aside>

      {/* OTIMIZAÇÃO FASE 3: Mobile menu com 5 itens (4 principais + menu Mais) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
        <div className="grid grid-cols-5 gap-0.5 p-2">
          {/* 4 itens principais com touch target 44x44px (Apple HIG) */}
          {primaryMenuItems.map(item => (
            <Button 
              key={item.label} 
              variant={item.active ? "secondary" : "ghost"} 
              className="flex-col gap-1 min-h-[60px] min-w-[44px] h-auto py-2 px-1 text-[10px]" 
              onClick={item.onClick}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate w-full text-center leading-tight">{item.label}</span>
            </Button>
          ))}
          
          {/* Botão "Mais" que abre Sheet com itens secundários */}
          <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant={secondaryMenuItems.some(item => item.active) ? "secondary" : "ghost"}
                className="flex-col gap-1 min-h-[60px] min-w-[44px] h-auto py-2 px-1 text-[10px]"
              >
                <MoreHorizontal className="h-5 w-5 shrink-0" />
                <span className="truncate w-full text-center leading-tight">Mais</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh]">
              <SheetHeader>
                <SheetTitle>Mais opções</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                {secondaryMenuItems.map(item => (
                  <Button 
                    key={item.label} 
                    variant={item.active ? "secondary" : "ghost"} 
                    onClick={() => {
                      item.onClick();
                      if (item.label !== "Pomodoro") {
                        setMoreMenuOpen(false);
                      }
                    }}
                    className="justify-start gap-3 min-h-[48px] text-base"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>;
}