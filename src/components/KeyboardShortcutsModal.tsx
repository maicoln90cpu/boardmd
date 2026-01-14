import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: ShortcutItem[] = [
  // Navegação
  { keys: ["Ctrl", "K"], description: "Busca global", category: "Navegação" },
  { keys: ["Ctrl", "N"], description: "Nova tarefa", category: "Navegação" },
  { keys: ["Ctrl", "?"], description: "Mostrar atalhos", category: "Navegação" },
  { keys: ["Esc"], description: "Fechar modal / Limpar seleção", category: "Navegação" },
  
  // Tarefas
  { keys: ["Ctrl", "D"], description: "Duplicar tarefa selecionada", category: "Tarefas" },
  { keys: ["Ctrl", "F"], description: "Focar na busca", category: "Tarefas" },
  
  // Editor de Notas
  { keys: ["Ctrl", "B"], description: "Negrito", category: "Editor" },
  { keys: ["Ctrl", "I"], description: "Itálico", category: "Editor" },
  { keys: ["Ctrl", "U"], description: "Sublinhado", category: "Editor" },
  { keys: ["Ctrl", "S"], description: "Salvar nota", category: "Editor" },
];

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + ? ou Ctrl/Cmd + Shift + /
      if ((e.ctrlKey || e.metaKey) && (e.key === "?" || (e.shiftKey && e.key === "/"))) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Agrupar atalhos por categoria
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutItem[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-mono bg-background border rounded shadow-sm">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Pressione <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border rounded">Ctrl</kbd>
            {" + "}
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border rounded">?</kbd>
            {" "}para abrir/fechar este modal
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
