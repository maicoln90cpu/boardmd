import { useState } from "react";
import { Bookmark, Plus, Trash2, Edit2, Check, X, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useFilterPresets, FilterPreset } from "@/hooks/useFilterPresets";
import { cn } from "@/lib/utils";

// Ícones disponíveis para presets
const PRESET_ICONS = ["🔖", "⭐", "🎯", "📌", "🔥", "💡", "🚀", "📊", "🎨", "🔍"];

interface FilterPresetsManagerProps {
  currentFilters: FilterPreset["filters"];
  onApplyPreset: (filters: FilterPreset["filters"]) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function FilterPresetsManager({
  currentFilters,
  onApplyPreset,
  onClearFilters,
  hasActiveFilters,
}: FilterPresetsManagerProps) {
  const {
    presets,
    activePresetId,
    activePreset,
    savePreset,
    updatePreset,
    deletePreset,
    applyPreset,
    clearActivePreset,
  } = useFilterPresets();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<FilterPreset | null>(null);
  const [presetToEdit, setPresetToEdit] = useState<FilterPreset | null>(null);
  const [newPresetName, setNewPresetName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🔖");

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return;
    
    await savePreset(newPresetName.trim(), currentFilters, selectedIcon);
    setSaveDialogOpen(false);
    setNewPresetName("");
    setSelectedIcon("🔖");
  };

  const handleApplyPreset = async (preset: FilterPreset) => {
    const filters = await applyPreset(preset.id);
    if (filters) {
      onApplyPreset(filters);
    }
  };

  const handleDeletePreset = async () => {
    if (!presetToDelete) return;
    await deletePreset(presetToDelete.id);
    setDeleteDialogOpen(false);
    setPresetToDelete(null);
  };

  const handleEditPreset = async () => {
    if (!presetToEdit || !newPresetName.trim()) return;
    await updatePreset(presetToEdit.id, {
      name: newPresetName.trim(),
      icon: selectedIcon,
    });
    setEditDialogOpen(false);
    setPresetToEdit(null);
    setNewPresetName("");
    setSelectedIcon("🔖");
  };

  const openEditDialog = (preset: FilterPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresetToEdit(preset);
    setNewPresetName(preset.name);
    setSelectedIcon(preset.icon || "🔖");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (preset: FilterPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresetToDelete(preset);
    setDeleteDialogOpen(true);
  };

  const handleClearAndReset = () => {
    clearActivePreset();
    onClearFilters();
  };

  // Descrição do filtro atual
  const getFilterDescription = (filters: FilterPreset["filters"]) => {
    const parts: string[] = [];
    if (filters.searchTerm) parts.push(`"${filters.searchTerm}"`);
    if (filters.priorityFilter && filters.priorityFilter !== "all") {
      const priorityLabels: Record<string, string> = {
        high: "Alta",
        medium: "Média",
        low: "Baixa",
      };
      parts.push(priorityLabels[filters.priorityFilter] || filters.priorityFilter);
    }
    if (filters.tagFilter && filters.tagFilter !== "all") {
      parts.push(`#${filters.tagFilter}`);
    }
    return parts.length > 0 ? parts.join(" • ") : "Sem filtros";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={activePreset ? "default" : "outline"}
            size="sm"
            className={cn(
              "gap-2 h-10",
              activePreset && "bg-primary text-primary-foreground"
            )}
          >
            <Bookmark className="h-4 w-4" />
            {activePreset ? (
              <span className="flex items-center gap-1">
                {activePreset.icon} {activePreset.name}
              </span>
            ) : (
              "Presets"
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Presets de Filtros
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {presets.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum preset salvo</p>
              <p className="text-xs mt-1">Salve combinações de filtros para acesso rápido</p>
            </div>
          ) : (
            presets.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                className={cn(
                  "flex items-center justify-between cursor-pointer group",
                  activePresetId === preset.id && "bg-primary/10"
                )}
                onClick={() => handleApplyPreset(preset)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg">{preset.icon || "🔖"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{preset.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getFilterDescription(preset.filters)}
                    </p>
                  </div>
                  {activePresetId === preset.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => openEditDialog(preset, e)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => openDeleteDialog(preset, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          
          {hasActiveFilters && (
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onClick={() => setSaveDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Salvar filtros atuais
            </DropdownMenuItem>
          )}
          
          {activePreset && (
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-muted-foreground"
              onClick={handleClearAndReset}
            >
              <X className="h-4 w-4" />
              Limpar preset ativo
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog para salvar novo preset */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Preset de Filtros</DialogTitle>
            <DialogDescription>
              Salve a combinação atual de filtros para acesso rápido
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do preset</label>
              <Input
                placeholder="Ex: Tarefas urgentes, Trabalho, etc."
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Ícone</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map((icon) => (
                  <Button
                    key={icon}
                    variant={selectedIcon === icon ? "default" : "outline"}
                    size="sm"
                    className="w-10 h-10 text-lg"
                    onClick={() => setSelectedIcon(icon)}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Filtros a serem salvos
              </label>
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                {getFilterDescription(currentFilters)}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePreset} disabled={!newPresetName.trim()}>
              Salvar Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar preset */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Preset</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do preset</label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditPreset()}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Ícone</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map((icon) => (
                  <Button
                    key={icon}
                    variant={selectedIcon === icon ? "default" : "outline"}
                    size="sm"
                    className="w-10 h-10 text-lg"
                    onClick={() => setSelectedIcon(icon)}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditPreset} disabled={!newPresetName.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert para deletar preset */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover preset?</AlertDialogTitle>
            <AlertDialogDescription>
              O preset "{presetToDelete?.name}" será removido permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePreset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
