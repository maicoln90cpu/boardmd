import { useState, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useQuickLinks } from "@/hooks/useQuickLinks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink, Plus, Trash2, Home, Globe, Link2, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state";
import { exportToBookmarkHtml, parseBookmarkHtml } from "@/lib/bookmarkUtils";
import { toast } from "sonner";

const ICON_OPTIONS = ["🔗", "📌", "⭐", "🌐", "📧", "💼", "📊", "🎨", "🛠️", "📱", "💡", "🎯"];

export default function QuickLinks() {
  const { links, isLoading, addLink, deleteLink } = useQuickLinks();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIcon, setNewIcon] = useState("🔗");
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    await addLink({ title: newTitle.trim(), url, icon: newIcon });
    setNewTitle("");
    setNewUrl("");
    setNewIcon("🔗");
    setIsAddOpen(false);
  };

  const handleExport = () => {
    if (links.length === 0) {
      toast.error("Nenhum link para exportar");
      return;
    }
    const html = exportToBookmarkHtml(links.map(l => ({ title: l.title, url: l.url })));
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookmarks_links_rapidos.html";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Bookmarks exportados!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const html = ev.target?.result as string;
      const entries = parseBookmarkHtml(html);

      if (entries.length === 0) {
        toast.error("Nenhum bookmark encontrado no arquivo");
        return;
      }

      // Filter out duplicates
      const existingUrls = new Set(links.map(l => l.url));
      const newEntries = entries.filter(e => !existingUrls.has(e.url));

      if (newEntries.length === 0) {
        toast.info("Todos os bookmarks já existem");
        return;
      }

      let imported = 0;
      for (const entry of newEntries) {
        await addLink({ title: entry.title, url: entry.url, icon: "🔗" });
        imported++;
      }
      toast.success(`${imported} bookmark${imported > 1 ? "s" : ""} importado${imported > 1 ? "s" : ""}!`);
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex h-screen pt-14 md:pt-0">
      <Sidebar onExport={() => {}} onImport={() => {}} onThemeToggle={() => {}} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3 border-b bg-background">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => navigate("/")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm">Voltar</span>
            </button>
            <h2 className="text-base sm:text-lg font-semibold">🔗 Links Rápidos</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              className="hidden"
              onChange={handleImport}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              title="Importar bookmarks do navegador"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Importar</span>
            </Button>
            {/* Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              title="Exportar para arquivo de bookmarks"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Exportar</span>
            </Button>
            {/* Add */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo Link</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Link Rápido</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Ícone</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {ICON_OPTIONS.map(icon => (
                        <button
                          key={icon}
                          onClick={() => setNewIcon(icon)}
                          className={`text-2xl p-1.5 rounded-lg transition-colors ${newIcon === icon ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Título</label>
                    <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Gmail, Figma, GitHub..." className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">URL</label>
                    <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." className="mt-1" />
                  </div>
                  <Button onClick={handleAdd} disabled={!newTitle.trim() || !newUrl.trim()} className="w-full">
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {links.length === 0 && !isLoading ? (
            <EmptyState
              variant="links"
              title="Nenhum link salvo"
              description="Adicione atalhos para seus sites e ferramentas mais usados, ou importe seus bookmarks do navegador"
              onAction={() => setIsAddOpen(true)}
              actionLabel="Adicionar Link"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 max-w-6xl mx-auto">
              {links.map(link => (
                <Card
                  key={link.id}
                  className="group hover:shadow-lg hover:scale-105 transition-all cursor-pointer relative"
                  onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                    <span className="text-4xl">{link.icon}</span>
                    <div className="min-w-0 w-full">
                      <h3 className="font-medium text-sm truncate">{link.title}</h3>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {new URL(link.url).hostname}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLink(link.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
