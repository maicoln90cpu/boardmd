import { useState, useRef, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useQuickLinks, QuickLink } from "@/hooks/useQuickLinks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Plus, Trash2, Home, Globe, Link2, Download, Upload, GripVertical, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state";
import { exportToBookmarkHtml, parseBookmarkHtml } from "@/lib/bookmarkUtils";
import { toast } from "sonner";
import { hapticSuccess, hapticLight } from "@/lib/haptic";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const ICON_OPTIONS = ["🔗", "📌", "⭐", "🌐", "📧", "💼", "📊", "🎨", "🛠️", "📱", "💡", "🎯"];

type SortMode = "manual" | "name" | "date";

function SortableLinkCard({ link, onDelete }: { link: QuickLink; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="group hover:shadow-lg transition-all cursor-pointer relative"
      onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
    >
      <CardContent className="p-4 flex flex-col items-center text-center gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="absolute top-1 left-1 h-7 w-7 flex items-center justify-center opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <span className="text-4xl">{link.icon}</span>
        <div className="min-w-0 w-full">
          <h3 className="font-medium text-sm truncate">{link.title}</h3>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {(() => { try { return new URL(link.url).hostname; } catch { return link.url; } })()}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(link.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function QuickLinks() {
  const { links, isLoading, addLink, deleteLink, reorderLinks } = useQuickLinks();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIcon, setNewIcon] = useState("🔗");
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const sortedLinks = useMemo(() => {
    if (sortMode === "name") return [...links].sort((a, b) => a.title.localeCompare(b.title));
    if (sortMode === "date") return [...links].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return links; // manual = by position
  }, [links, sortMode]);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    await addLink({ title: newTitle.trim(), url, icon: newIcon });
    hapticSuccess();
    setNewTitle("");
    setNewUrl("");
    setNewIcon("🔗");
    setIsAddOpen(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedLinks.findIndex((l) => l.id === active.id);
    const newIndex = sortedLinks.findIndex((l) => l.id === over.id);

    const reordered = [...sortedLinks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    hapticLight();
    reorderLinks(reordered.map((l, i) => ({ ...l, position: i })));
  };

  const handleExport = () => {
    if (links.length === 0) { toast.error("Nenhum link para exportar"); return; }
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
      if (entries.length === 0) { toast.error("Nenhum bookmark encontrado no arquivo"); return; }
      const existingUrls = new Set(links.map(l => l.url));
      const newEntries = entries.filter(e => !existingUrls.has(e.url));
      if (newEntries.length === 0) { toast.info("Todos os bookmarks já existem"); return; }
      let imported = 0;
      for (const entry of newEntries) {
        await addLink({ title: entry.title, url: entry.url, icon: "🔗" });
        imported++;
      }
      toast.success(`${imported} bookmark${imported > 1 ? "s" : ""} importado${imported > 1 ? "s" : ""}!`);
    };
    reader.readAsText(file);
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
            {/* Sort */}
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="date">Recente</SelectItem>
              </SelectContent>
            </Select>
            <input ref={fileInputRef} type="file" accept=".html,.htm" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} title="Importar bookmarks">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Importar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} title="Exportar bookmarks">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Exportar</span>
            </Button>
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
                  <Button onClick={handleAdd} disabled={!newTitle.trim() || !newUrl.trim()} className="w-full">Adicionar</Button>
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedLinks.map((l) => l.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 max-w-6xl mx-auto">
                  {sortedLinks.map((link) => (
                    <SortableLinkCard key={link.id} link={link} onDelete={deleteLink} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
