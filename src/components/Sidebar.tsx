import { useState } from "react";
import { LayoutGrid, Download, Upload, Palette, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SidebarProps {
  onExport: () => void;
  onImport: () => void;
  onThemeToggle: () => void;
}

export function Sidebar({ onExport, onImport, onThemeToggle }: SidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleExit = () => {
    if (confirm("Deseja realmente sair? Isso limpará o estado local.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const menuItems = [
    { icon: LayoutGrid, label: "Kanban", active: true },
    { icon: Download, label: "Exportar", onClick: onExport },
    { icon: Upload, label: "Importar", onClick: onImport },
    { icon: Palette, label: "Tema", onClick: onThemeToggle },
    { icon: Settings, label: "Configurações", onClick: () => setSettingsOpen(true) },
    { icon: LogOut, label: "Sair", onClick: handleExit },
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
        <DialogContent aria-describedby="settings-dialog-description">
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
          </DialogHeader>
          <p id="settings-dialog-description" className="text-sm text-muted-foreground">
            Painel de preferências do sistema
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Tema</span>
              <Button size="sm" variant="outline" onClick={onThemeToggle}>
                Alternar Tema
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Mais opções em breve...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
