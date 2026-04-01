import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, Home, Download, Upload, GripVertical, ArrowUpDown, FolderOpen, MousePointerClick, LayoutGrid, List } from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQuickLinks, QuickLink } from "@/hooks/useQuickLinks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { exportToBookmarkHtml, parseBookmarkHtml } from "@/lib/bookmarkUtils";
import { hapticSuccess, hapticLight } from "@/lib/haptic";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const ICON_OPTIONS = ["🔗", "📌", "⭐", "🌐", "📧", "💼", "📊", "🎨", "🛠️", "📱", "💡", "🎯"];

type SortMode = "manual" | "name" | "date" | "clicks";
type ViewMode = "cards" | "list";

function getFaviconUrl(url: string, size = 64) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
  } catch {
    return null;
  }
}

function SortableLinkCard({
  link, onDelete, onTrackClick,
}: {
  link: QuickLink;
  onDelete: (id: string) => void;
  onTrackClick: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  const [faviconError, setFaviconError] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const faviconUrl = getFaviconUrl(link.url);

  const handleClick = () => {
    onTrackClick(link.id);
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card ref={setNodeRef} style={style} className="group hover:shadow-lg transition-all cursor-pointer relative" onClick={handleClick}>
      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
        <button
          {...attributes} {...listeners}
          className="absolute top-1 left-1 h-7 w-7 flex items-center justify-center opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Favicon large + emoji badge */}
        <div className="relative">
          {faviconUrl && !faviconError ? (
            <img
              src={faviconUrl}
              alt=""
              className="h-12 w-12 rounded-lg object-contain"
              loading="lazy"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <span className="text-4xl">{link.icon}</span>
          )}
          {faviconUrl && !faviconError && (
            <span className="absolute -bottom-1 -right-1 text-lg leading-none bg-background rounded-full border shadow-sm px-0.5">
              {link.icon}
            </span>
          )}
        </div>

        <div className="min-w-0 w-full">
          <h3 className="font-medium text-sm truncate">{link.title}</h3>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {(() => { try { return new URL(link.url).hostname; } catch { return link.url; } })()}
          </p>
        </div>

        {link.click_count > 0 && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <MousePointerClick className="h-3 w-3" />
            {link.click_count}
          </span>
        )}

        <Button
          variant="ghost" size="icon"
          className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(link.id); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function SortableLinkRow({
  link, onDelete, onTrackClick,
}: {
  link: QuickLink;
  onDelete: (id: string) => void;
  onTrackClick: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  const [faviconError, setFaviconError] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const faviconUrl = getFaviconUrl(link.url, 32);

  const handleClick = () => {
    onTrackClick(link.id);
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer"
      onClick={handleClick}
    >
      <button
        {...attributes} {...listeners}
        className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {faviconUrl && !faviconError ? (
        <img
          src={faviconUrl}
          alt=""
          className="h-6 w-6 rounded-sm object-contain shrink-0"
          loading="lazy"
          onError={() => setFaviconError(true)}
        />
      ) : (
        <span className="text-lg shrink-0">{link.icon}</span>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-sm truncate">{link.title}</h3>
        <p className="text-[10px] text-muted-foreground truncate">
          {(() => { try { return new URL(link.url).hostname; } catch { return link.url; } })()}
        </p>
      </div>

      {link.folder && (
        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground shrink-0 hidden sm:inline">
          {link.folder}
        </span>
      )}

      {link.click_count > 0 && (
        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
          <MousePointerClick className="h-3 w-3" />
          {link.click_count}
        </span>
      )}

      <Button
        variant="ghost" size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0"
        onClick={(e) => { e.stopPropagation(); onDelete(link.id); }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function LinksView({
  links, onDelete, onTrackClick, sensors, onDragEnd, viewMode,
}: {
  links: QuickLink[];
  onDelete: (id: string) => void;
  onTrackClick: (id: string) => void;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (e: DragEndEvent) => void;
  viewMode: ViewMode;
}) {
  return (
    <DndContext id="quicklinks-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={links.map((l) => l.id)} strategy={viewMode === "cards" ? rectSortingStrategy : verticalListSortingStrategy}>
        {viewMode === "cards" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {links.map((link) => (
              <SortableLinkCard key={link.id} link={link} onDelete={onDelete} onTrackClick={onTrackClick} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <SortableLinkRow key={link.id} link={link} onDelete={onDelete} onTrackClick={onTrackClick} />
            ))}
          </div>
        )}
      </SortableContext>
    </DndContext>
  );
}

export default function QuickLinks() {
  const { links, isLoading, addLink, deleteLink, reorderLinks, trackClick, folders } = useQuickLinks();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIcon, setNewIcon] = useState("🔗");
  const [newFolder, setNewFolder] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [filterFolder, setFilterFolder] = useState<string | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const sortedLinks = useMemo(() => {
    const filtered = filterFolder === "all" ? links : filterFolder === "__none__"
      ? links.filter(l => !l.folder) : links.filter(l => l.folder === filterFolder);

    if (sortMode === "name") return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    if (sortMode === "date") return [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sortMode === "clicks") return [...filtered].sort((a, b) => b.click_count - a.click_count);
    return filtered;
  }, [links, sortMode, filterFolder]);

  const groupedByFolder = useMemo(() => {
    if (filterFolder !== "all") return null;
    const groups: Record<string, QuickLink[]> = {};
    const noFolder: QuickLink[] = [];
    for (const link of sortedLinks) {
      if (link.folder) {
        if (!groups[link.folder]) groups[link.folder] = [];
        groups[link.folder].push(link);
      } else {
        noFolder.push(link);
      }
    }
    const hasFolders = Object.keys(groups).length > 0;
    return hasFolders ? { groups, noFolder } : null;
  }, [sortedLinks, filterFolder]);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    await addLink({ title: newTitle.trim(), url, icon: newIcon, folder: newFolder.trim() || null });
    hapticSuccess();
    setNewTitle(""); setNewUrl(""); setNewIcon("🔗"); setNewFolder("");
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
    a.href = url; a.download = "bookmarks_links_rapidos.html"; a.click();
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
      for (const entry of newEntries) { await addLink({ title: entry.title, url: entry.url, icon: "🔗" }); imported++; }
      toast.success(`${imported} bookmark${imported > 1 ? "s" : ""} importado${imported > 1 ? "s" : ""}!`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex h-screen pt-14 md:pt-0">
      <Sidebar onExport={() => {}} onImport={() => {}} onThemeToggle={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3 border-b bg-background">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => navigate("/")} aria-label="Voltar para a página inicial" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm">Voltar</span>
            </button>
            <h2 className="text-base sm:text-lg font-semibold">🔗 Links Rápidos</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("cards")}
                aria-label="Visualizar como cards"
                aria-pressed={viewMode === "cards"}
                className={`p-2 transition-colors ${viewMode === "cards" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                title="Cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-label="Visualizar como lista"
                aria-pressed={viewMode === "list"}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                title="Lista"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Folder filter */}
            {folders.length > 0 && (
              <Select value={filterFolder} onValueChange={setFilterFolder}>
                <SelectTrigger className="w-[110px] h-8 text-xs">
                  <FolderOpen className="h-3.5 w-3.5 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="__none__">Sem pasta</SelectItem>
                  {folders.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="date">Recente</SelectItem>
                <SelectItem value="clicks">Mais clicados</SelectItem>
              </SelectContent>
            </Select>
            <input ref={fileInputRef} type="file" accept=".html,.htm" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} title="Importar bookmarks">
              <Upload className="h-4 w-4" /><span className="hidden sm:inline ml-1">Importar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} title="Exportar bookmarks">
              <Download className="h-4 w-4" /><span className="hidden sm:inline ml-1">Exportar</span>
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Novo Link</span></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Link Rápido</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Ícone</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {ICON_OPTIONS.map(icon => (
                        <button key={icon} onClick={() => setNewIcon(icon)} className={`text-2xl p-1.5 rounded-lg transition-colors ${newIcon === icon ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}>
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
                  <div>
                    <label className="text-sm font-medium">Pasta (opcional)</label>
                    <Input value={newFolder} onChange={e => setNewFolder(e.target.value)} placeholder="Ex: Trabalho, Pessoal..." className="mt-1" list="folder-suggestions" />
                    {folders.length > 0 && (
                      <datalist id="folder-suggestions">
                        {folders.map(f => <option key={f} value={f} />)}
                      </datalist>
                    )}
                  </div>
                  <Button onClick={handleAdd} disabled={!newTitle.trim() || !newUrl.trim()} className="w-full">Adicionar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 pb-24 md:pb-6">
          {links.length === 0 && !isLoading ? (
            <EmptyState variant="links" title="Nenhum link salvo" description="Adicione atalhos para seus sites e ferramentas mais usados, ou importe seus bookmarks do navegador" onAction={() => setIsAddOpen(true)} actionLabel="Adicionar Link" />
          ) : groupedByFolder ? (
            <div className="space-y-6 max-w-6xl mx-auto">
              {Object.entries(groupedByFolder.groups).map(([folderName, folderLinks]) => (
                <Collapsible key={folderName} defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3">
                    <FolderOpen className="h-4 w-4" />
                    {folderName}
                    <span className="text-xs font-normal">({folderLinks.length})</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <LinksView links={folderLinks} onDelete={deleteLink} onTrackClick={trackClick} sensors={sensors} onDragEnd={handleDragEnd} viewMode={viewMode} />
                  </CollapsibleContent>
                </Collapsible>
              ))}
              {groupedByFolder.noFolder.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-3">Sem pasta</p>
                  <LinksView links={groupedByFolder.noFolder} onDelete={deleteLink} onTrackClick={trackClick} sensors={sensors} onDragEnd={handleDragEnd} viewMode={viewMode} />
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              <LinksView links={sortedLinks} onDelete={deleteLink} onTrackClick={trackClick} sensors={sensors} onDragEnd={handleDragEnd} viewMode={viewMode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
