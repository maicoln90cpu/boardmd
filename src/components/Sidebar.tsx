import { LayoutGrid, Download, Upload, Palette, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  onExport: () => void;
  onImport: () => void;
  onThemeToggle: () => void;
}

export function Sidebar({ onExport, onImport, onThemeToggle }: SidebarProps) {
  const { signOut } = useAuth();

  const menuItems = [
    { icon: LayoutGrid, label: "Kanban", active: true },
    { icon: Download, label: "Exportar", onClick: onExport },
    { icon: Upload, label: "Importar", onClick: onImport },
    { icon: Palette, label: "Tema", onClick: onThemeToggle },
    { icon: Settings, label: "Configurações" },
  ];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-border bg-card">
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
        <Button
          variant="ghost"
          className="justify-start gap-3 mt-auto"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </nav>
    </aside>
  );
}
