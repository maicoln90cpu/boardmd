import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/contexts/ThemeContext";
import { useCategories } from "@/hooks/useCategories";
import { useTags, TAG_PRESET_COLORS } from "@/hooks/useTags";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, Download, Upload, LogOut, ArrowLeft, GripVertical, Info, RotateCcw, FolderPlus, CornerDownRight, ChevronRight, ChevronDown, UserX } from "lucide-react";
import { DataIntegrityMonitor } from "@/components/DataIntegrityMonitor";
import { SettingsLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ColumnManager } from "@/components/kanban/ColumnManager";
import { useColumns } from "@/hooks/useColumns";
import { getAllPrompts } from "@/lib/defaultAIPrompts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sidebar } from "@/components/Sidebar";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable category item component with hierarchy support
function SortableCategoryItem({ 
  category, 
  editingId, 
  editingName, 
  setEditingId, 
  setEditingName,
  handleEditCategory,
  handleDeleteCategory,
  onAddSubcategory,
  hasChildren
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const depth = category.depth || 0;
  const paddingLeft = depth * 24; // 24px per level

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, marginLeft: `${paddingLeft}px` }}
      className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {depth > 0 && (
        <div className="flex items-center text-muted-foreground">
          <CornerDownRight className="h-3 w-3" />
        </div>
      )}
      
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
          <span className="flex-1 text-sm font-medium">{category.name}</span>
          
          {/* Add subcategory button - only for root categories (depth 0) */}
          {depth < 2 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary hover:text-primary"
                    onClick={() => onAddSubcategory(category.id)}
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Adicionar subcategoria</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
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
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => handleDeleteCategory(category.id, hasChildren)}
            disabled={hasChildren}
            title={hasChildren ? "Exclua primeiro as subcategorias" : undefined}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
// Componente para opção de fixar menu lateral
function SidebarPinOption() {
  const [sidebarPinned, setSidebarPinned] = useLocalStorage("sidebar-pinned", false);
  const [sidebarExpandedWhenPinned, setSidebarExpandedWhenPinned] = useLocalStorage("sidebar-expanded-when-pinned", true);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Fixar Menu Lateral</Label>
          <p className="text-sm text-muted-foreground">
            Mantém o menu fixo sem responder ao hover
          </p>
        </div>
        <Switch
          checked={sidebarPinned}
          onCheckedChange={setSidebarPinned}
        />
      </div>
      
      {sidebarPinned && (
        <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
          <div className="space-y-0.5">
            <Label>Menu Expandido</Label>
            <p className="text-sm text-muted-foreground">
              Quando ativado, menu fica expandido. Desativado, fica colapsado.
            </p>
          </div>
          <Switch
            checked={sidebarExpandedWhenPinned}
            onCheckedChange={setSidebarExpandedWhenPinned}
          />
        </div>
      )}
    </div>
  );
}

// Componente para deletar conta (LGPD/GDPR)
function DeleteAccountButton() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETAR") {
      toast({ 
        title: "Confirmação incorreta", 
        description: "Digite DELETAR para confirmar",
        variant: "destructive" 
      });
      return;
    }

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({ 
          title: "Erro", 
          description: "Você precisa estar logado para deletar sua conta",
          variant: "destructive" 
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error("Erro ao deletar conta:", error);
        toast({ 
          title: "Erro ao deletar conta", 
          description: error.message,
          variant: "destructive" 
        });
        return;
      }

      toast({ 
        title: "Conta deletada", 
        description: "Todos os seus dados foram removidos permanentemente" 
      });

      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      toast({ 
        title: "Erro ao deletar conta", 
        description: "Tente novamente mais tarde",
        variant: "destructive" 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <UserX className="h-4 w-4 mr-2" />
          Excluir Conta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">⚠️ Excluir Conta Permanentemente</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Esta ação é <strong>irreversível</strong>. Todos os seus dados serão permanentemente deletados, incluindo:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Tarefas e categorias</li>
              <li>Notas e cadernos</li>
              <li>Sessões Pomodoro e estatísticas</li>
              <li>Configurações e preferências</li>
              <li>Histórico de atividades</li>
            </ul>
            <div className="pt-4">
              <Label htmlFor="confirm-delete">Digite <strong>DELETAR</strong> para confirmar:</Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETAR"
                className="mt-2"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>Cancelar</AlertDialogCancel>
          <Button 
            variant="destructive" 
            onClick={handleDeleteAccount}
            disabled={isDeleting || confirmText !== "DELETAR"}
          >
            {isDeleting ? "Deletando..." : "Excluir Conta Permanentemente"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function Config() {
  const { settings, updateSettings, saveSettings, resetSettings, isDirty, isLoading, getAIPrompt, updateAIPrompt, resetAIPrompt, resetAllAIPrompts } = useSettings();
  const { theme, setTheme, toggleTheme } = useTheme();
  const { categories, addCategory, deleteCategory, reorderCategories, getFlatHierarchy, getSubcategories } = useCategories();
  const { tags, addTag, updateTag, deleteTag } = useTags();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  // OTIMIZAÇÃO: Remover disparo de evento storage - não mais necessário
  const handleToggleHideCompleted = (checked: boolean) => {
    localStorage.setItem('hideCompletedTasks', checked.toString());
    updateSettings({ kanban: { ...settings.kanban, hideCompletedTasks: checked } });
  };
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [addingSubcategoryParentId, setAddingSubcategoryParentId] = useState<string | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [showColumnManager, setShowColumnManager] = useState(false);
  
  // Estados para gerenciamento de tags
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingTagColor, setEditingTagColor] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [isAddingTag, setIsAddingTag] = useState(false);
  
  const { 
    columns, 
    hiddenColumns,
    toggleColumnVisibility,
    getVisibleColumns,
    resetToDefaultView,
    deleteColumn,
    renameColumn,
    reorderColumns,
    addColumn,
    toggleColumnKanbanVisibility
  } = useColumns();

  // Setup drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const nonDiarioCategories = categories.filter(cat => cat.name !== "Diário");
      const oldIndex = nonDiarioCategories.findIndex((cat) => cat.id === active.id);
      const newIndex = nonDiarioCategories.findIndex((cat) => cat.id === over.id);

      const reordered = arrayMove(nonDiarioCategories, oldIndex, newIndex);
      
      // Include "Diário" back if it exists
      const diarioCategory = categories.find(cat => cat.name === "Diário");
      const finalCategories = diarioCategory ? [diarioCategory, ...reordered] : reordered;
      
      reorderCategories(finalCategories);
    }
  };

  const handleLogout = async () => {
    await signOut();
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

  const handleDeleteCategory = async (id: string, hasChildren?: boolean) => {
    const category = categories.find(c => c.id === id);
    if (category?.name === "Diário") {
      toast({ title: "Não é possível excluir a categoria Diário", variant: "destructive" });
      return;
    }

    if (hasChildren) {
      toast({ title: "Exclua primeiro as subcategorias", variant: "destructive" });
      return;
    }

    if (confirm(`Deseja realmente excluir a categoria "${category?.name}"?`)) {
      await deleteCategory(id);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: "Nome não pode ser vazio", variant: "destructive" });
      return;
    }

    await addCategory(newCategoryName.trim());
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const handleAddSubcategory = async () => {
    if (!newSubcategoryName.trim() || !addingSubcategoryParentId) {
      toast({ title: "Nome não pode ser vazio", variant: "destructive" });
      return;
    }

    await addCategory(newSubcategoryName.trim(), addingSubcategoryParentId);
    setNewSubcategoryName("");
    setAddingSubcategoryParentId(null);
    toast({ title: "Subcategoria criada!" });
  };

  const startAddSubcategory = (parentId: string) => {
    setAddingSubcategoryParentId(parentId);
    setNewSubcategoryName("");
  };

  // Handlers para Tags
  const handleEditTag = async (id: string) => {
    if (!editingTagName.trim()) {
      toast({ title: "Nome não pode ser vazio", variant: "destructive" });
      return;
    }

    await updateTag(id, { name: editingTagName.trim(), color: editingTagColor });
    setEditingTagId(null);
    setEditingTagName("");
    setEditingTagColor("");
    toast({ title: "Tag atualizada!" });
  };

  const handleDeleteTag = async (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir a tag "${name}"?`)) {
      await deleteTag(id);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast({ title: "Nome não pode ser vazio", variant: "destructive" });
      return;
    }

    await addTag(newTagName.trim(), newTagColor);
    setNewTagName("");
    setNewTagColor("#3B82F6");
    setIsAddingTag(false);
  };

  const handleExport = () => {
    const data = {
      categories,
      settings,
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kanban-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Exportação concluída", description: "Arquivo JSON baixado com sucesso" });
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.categories && Array.isArray(data.categories)) {
          for (const cat of data.categories) {
            if (cat.name !== "Diário") {
              await addCategory(cat.name);
            }
          }
        }
        
        toast({ 
          title: "Importação bem-sucedida", 
          description: "Dados importados com sucesso" 
        });
      } catch (error) {
        toast({ 
          title: "Erro na importação", 
          description: "Arquivo inválido",
          variant: "destructive" 
        });
      }
    };
    input.click();
  };

  const handleSave = async () => {
    try {
      await saveSettings();
      toast({ title: "✅ Configurações salvas", description: "Suas preferências foram salvas com sucesso" });
    } catch (error) {
      toast({ 
        title: "Erro ao salvar", 
        description: "Não foi possível salvar as configurações",
        variant: "destructive" 
      });
    }
  };

  const handleReset = () => {
    resetSettings();
    toast({ title: "Configurações resetadas", description: "Todas as configurações foram restauradas aos valores padrão" });
  };

  // OTIMIZAÇÃO FASE 3: Skeleton loading
  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        onExport={handleExport}
        onImport={handleImport}
        onThemeToggle={toggleTheme}
        onViewChange={(mode) => navigate(`/?view=${mode}`)}
        viewMode="daily"
      />

      <div className="flex-1">
        {/* Header com botão voltar e salvar */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">⚙️ Configurações</h1>
            </div>
            {isDirty && (
              <Button onClick={handleSave} className="font-semibold">
                💾 Salvar Alterações
              </Button>
            )}
          </div>
        </div>

        <div className="container max-w-6xl mx-auto p-6 pb-24">
          <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="productivity">Produtividade</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="ai-prompts">IA & Prompts</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
            <TabsTrigger value="data">Dados</TabsTrigger>
          </TabsList>

          {/* Aba Aparência */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>🎨 Aparência</CardTitle>
                <CardDescription>Personalize a interface do aplicativo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select 
                    value={settings.theme} 
                    onValueChange={(value) => {
                      const newTheme = value as 'light' | 'dark' | 'auto';
                      updateSettings({ theme: newTheme });
                      setTheme(newTheme);
                    }}
                  >
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="auto">Automático</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Opção de fixar menu lateral */}
                <SidebarPinOption />

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="density">Densidade Padrão</Label>
                  <Select 
                    value={settings.defaultDensity} 
                    onValueChange={(value) => updateSettings({ defaultDensity: value as 'comfortable' | 'compact' | 'ultra-compact' })}
                  >
                    <SelectTrigger id="density">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comfortable">Confortável</SelectItem>
                      <SelectItem value="compact">Compacto</SelectItem>
                      <SelectItem value="ultra-compact">Ultra Compacto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select 
                    value={settings.interface.language} 
                    onValueChange={(value) => updateSettings({ interface: { ...settings.interface, language: value as 'pt-BR' | 'en' | 'es' } })}
                  >
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (BR)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Timezone do usuário */}
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Select 
                    value={settings.timezone || 'America/Sao_Paulo'} 
                    onValueChange={(value) => updateSettings({ timezone: value })}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (UTC-3)</SelectItem>
                      <SelectItem value="America/Manaus">Manaus (UTC-4)</SelectItem>
                      <SelectItem value="America/Rio_Branco">Rio Branco (UTC-5)</SelectItem>
                      <SelectItem value="America/Noronha">Fernando de Noronha (UTC-2)</SelectItem>
                      <SelectItem value="America/New_York">Nova York (UTC-5)</SelectItem>
                      <SelectItem value="Europe/London">Londres (UTC+0)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (UTC+1)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tóquio (UTC+9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Cores de prioridade */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Label>Cores de Prioridade</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cores usadas nos cards de tarefas para indicar prioridade</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="highPriorityColor" className="text-sm text-muted-foreground">Alta Prioridade</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="highPriorityColor"
                          value={settings.customization?.priorityColors?.high?.background || '#fee2e2'}
                          onChange={(e) => updateSettings({ 
                            customization: { 
                              ...settings.customization,
                              priorityColors: {
                                ...settings.customization?.priorityColors,
                                high: { 
                                  ...settings.customization?.priorityColors?.high,
                                  background: e.target.value 
                                }
                              }
                            } 
                          })}
                          className="h-10 w-14 rounded border cursor-pointer"
                        />
                        <span className="text-sm text-muted-foreground">{settings.customization?.priorityColors?.high?.background || '#fee2e2'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mediumPriorityColor" className="text-sm text-muted-foreground">Média Prioridade</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="mediumPriorityColor"
                          value={settings.customization?.priorityColors?.medium?.background || '#fef3c7'}
                          onChange={(e) => updateSettings({ 
                            customization: { 
                              ...settings.customization,
                              priorityColors: {
                                ...settings.customization?.priorityColors,
                                medium: { 
                                  ...settings.customization?.priorityColors?.medium,
                                  background: e.target.value 
                                }
                              }
                            } 
                          })}
                          className="h-10 w-14 rounded border cursor-pointer"
                        />
                        <span className="text-sm text-muted-foreground">{settings.customization?.priorityColors?.medium?.background || '#fef3c7'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lowPriorityColor" className="text-sm text-muted-foreground">Baixa Prioridade</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="lowPriorityColor"
                          value={settings.customization?.priorityColors?.low?.background || '#dcfce7'}
                          onChange={(e) => updateSettings({ 
                            customization: { 
                              ...settings.customization,
                              priorityColors: {
                                ...settings.customization?.priorityColors,
                                low: { 
                                  ...settings.customization?.priorityColors?.low,
                                  background: e.target.value 
                                }
                              }
                            } 
                          })}
                          className="h-10 w-14 rounded border cursor-pointer"
                        />
                        <span className="text-sm text-muted-foreground">{settings.customization?.priorityColors?.low?.background || '#dcfce7'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Kanban */}
          <TabsContent value="kanban" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>📋 Kanban</CardTitle>
                <CardDescription>Configure o comportamento do quadro Kanban</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ocultar Tarefas Concluídas</Label>
                    <p className="text-sm text-muted-foreground">
                      Remove tarefas riscadas do quadro
                    </p>
                  </div>
                  <Switch
                    checked={settings.kanban.hideCompletedTasks}
                    onCheckedChange={handleToggleHideCompleted}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mostrar Painel de Favoritos</Label>
                    <p className="text-sm text-muted-foreground">
                      Exibe seção com tarefas favoritas no topo
                    </p>
                  </div>
                  <Switch
                    checked={settings.kanban.showFavoritesPanel}
                    onCheckedChange={(checked) => updateSettings({ kanban: { ...settings.kanban, showFavoritesPanel: checked } })}
                  />
                </div>

                <Separator />

                {/* Página Inicial */}
                <div className="space-y-2">
                  <Label>Página Inicial</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Qual Kanban abrir por padrão ao fazer login
                  </p>
                  <Select 
                    value={settings.kanban.defaultView} 
                    onValueChange={(value) => updateSettings({ kanban: { ...settings.kanban, defaultView: value as 'daily' | 'projects' } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Kanban Diário</SelectItem>
                      <SelectItem value="projects">Kanban Projetos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Automação Semana Atual */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automação "Semana Atual"</Label>
                    <p className="text-sm text-muted-foreground">
                      Mover automaticamente tarefas com prazo na semana corrente para a coluna "Semana Atual"
                    </p>
                  </div>
                  <Switch
                    checked={settings.kanban.autoMoveToCurrentWeek ?? false}
                    onCheckedChange={(checked) => updateSettings({ kanban: { ...settings.kanban, autoMoveToCurrentWeek: checked } })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Ordenação Padrão (Diário)</Label>
                  <Select 
                    value={settings.kanban.dailySortOption} 
                    onValueChange={(value) => updateSettings({ kanban: { ...settings.kanban, dailySortOption: value as 'time' | 'name' | 'priority' } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Por Horário</SelectItem>
                      <SelectItem value="name">Por Nome</SelectItem>
                      <SelectItem value="priority">Por Prioridade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Direção da Ordenação (Diário)</Label>
                  <Select 
                    value={settings.kanban.dailySortOrder} 
                    onValueChange={(value) => updateSettings({ kanban: { ...settings.kanban, dailySortOrder: value as 'asc' | 'desc' } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Crescente</SelectItem>
                      <SelectItem value="desc">Decrescente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Ordenação Padrão (Projetos)</Label>
                  <Select 
                    value={settings.kanban.projectsSortOption} 
                    onValueChange={(value) => updateSettings({ kanban: { ...settings.kanban, projectsSortOption: value as 'manual' | 'date_asc' | 'date_desc' | 'name_asc' | 'name_desc' | 'priority_asc' | 'priority_desc' } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="date_asc">Data (Mais Próxima)</SelectItem>
                      <SelectItem value="date_desc">Data (Mais Distante)</SelectItem>
                      <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                      <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
                      <SelectItem value="priority_asc">Prioridade (Baixa → Alta)</SelectItem>
                      <SelectItem value="priority_desc">Prioridade (Alta → Baixa)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Gerenciar Colunas</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Adicione, remova ou reordene colunas do Kanban
                  </p>
                  <Button variant="outline" onClick={() => setShowColumnManager(true)}>
                    Abrir Gerenciador de Colunas
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Settings */}
            <Card>
              <CardHeader>
                <CardTitle>📱 Configurações Mobile</CardTitle>
                <CardDescription>Ajustes específicos para dispositivos móveis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ocultar Badges no Mobile</Label>
                    <p className="text-sm text-muted-foreground">
                      Remove badges de prioridade e tags em telas pequenas
                    </p>
                  </div>
                  <Switch
                    checked={settings.mobile.hideBadges}
                    onCheckedChange={(checked) => updateSettings({ mobile: { ...settings.mobile, hideBadges: checked } })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Colunas no Grid (Diário)</Label>
                  <Select 
                    value={String(settings.mobile.dailyGridColumns)} 
                    onValueChange={(value) => updateSettings({ mobile: { ...settings.mobile, dailyGridColumns: Number(value) as 1 | 2 } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Coluna</SelectItem>
                      <SelectItem value="2">2 Colunas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Colunas no Grid (Projetos)</Label>
                  <Select 
                    value={String(settings.mobile.projectsGridColumns)} 
                    onValueChange={(value) => updateSettings({ mobile: { ...settings.mobile, projectsGridColumns: Number(value) as 1 | 2 } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Coluna</SelectItem>
                      <SelectItem value="2">2 Colunas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Produtividade */}
          <TabsContent value="productivity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>⏰ Notificações de Prazo</CardTitle>
                <CardDescription>Configure alertas para tarefas próximas do vencimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ativar Notificações de Prazo</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba alertas quando tarefas estiverem próximas do vencimento
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.dueDate}
                    onCheckedChange={(checked) => updateSettings({ notifications: { ...settings.notifications, dueDate: checked } })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="alertHours">Alertar com antecedência de (horas)</Label>
                  <Input
                    id="alertHours"
                    type="number"
                    min="1"
                    max="72"
                    value={settings.notifications.dueDateHours}
                    onChange={(e) => updateSettings({ notifications: { ...settings.notifications, dueDateHours: Number(e.target.value) } })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Você receberá notificações quando faltar esse tempo para o prazo
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkInterval">Verificar a cada (minutos)</Label>
                  <Select 
                    value={String(settings.notifications.checkInterval)} 
                    onValueChange={(value) => updateSettings({ notifications: { ...settings.notifications, checkInterval: Number(value) as 5 | 15 | 30 | 60 } })}
                  >
                    <SelectTrigger id="checkInterval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutos</SelectItem>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Frequência de verificação de tarefas próximas do vencimento
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="snoozeMinutes">Soneca (minutos)</Label>
                  <Input
                    id="snoozeMinutes"
                    type="number"
                    min="5"
                    max="120"
                    value={settings.notifications.snoozeMinutes}
                    onChange={(e) => updateSettings({ notifications: { ...settings.notifications, snoozeMinutes: Number(e.target.value) } })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Tempo para adiar uma notificação antes de ser lembrado novamente
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Daily Review */}
            <Card>
              <CardHeader>
                <CardTitle>🌅 Revisão Diária</CardTitle>
                <CardDescription>Popup matinal com resumo de tarefas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ativar Revisão Diária</Label>
                    <p className="text-sm text-muted-foreground">
                      Exibir popup ao abrir o app com tarefas atrasadas e do dia
                    </p>
                  </div>
                  <Switch
                    checked={settings.productivity.dailyReviewEnabled ?? true}
                    onCheckedChange={(checked) => updateSettings({ productivity: { ...settings.productivity, dailyReviewEnabled: checked } })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Gamificação */}
            <Card>
              <CardHeader>
                <CardTitle>🎮 Gamificação</CardTitle>
                <CardDescription>Configure o sistema de pontos e estatísticas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Reset Automático Diário</Label>
                    <p className="text-sm text-muted-foreground">
                      Zerar automaticamente "Tarefas Concluídas Hoje" à meia-noite
                    </p>
                  </div>
                  <Switch
                    checked={settings.productivity.autoResetDailyStats}
                    onCheckedChange={(checked) => updateSettings({ productivity: { ...settings.productivity, autoResetDailyStats: checked } })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Categorias */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>📁 Categorias & Subprojetos</CardTitle>
                <CardDescription>
                  Gerencie as categorias do seu Kanban. Use o ícone <FolderPlus className="h-4 w-4 inline mx-1" /> para criar subcategorias.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={getFlatHierarchy().filter(cat => cat.name !== "Diário").map(cat => cat.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {getFlatHierarchy().filter(cat => cat.name !== "Diário").map((category) => {
                        const hasChildren = categories.some(c => c.parent_id === category.id);
                        return (
                          <div key={category.id}>
                            <SortableCategoryItem
                              category={category}
                              editingId={editingId}
                              editingName={editingName}
                              setEditingId={setEditingId}
                              setEditingName={setEditingName}
                              handleEditCategory={handleEditCategory}
                              handleDeleteCategory={handleDeleteCategory}
                              onAddSubcategory={startAddSubcategory}
                              hasChildren={hasChildren}
                            />
                            
                            {/* Inline subcategory form */}
                            {addingSubcategoryParentId === category.id && (
                              <div 
                                className="flex items-center gap-2 p-2 rounded-md border bg-muted mt-2"
                                style={{ marginLeft: `${((category.depth || 0) + 1) * 24}px` }}
                              >
                                <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                                <Input
                                  value={newSubcategoryName}
                                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                                  placeholder="Nome da subcategoria"
                                  className="flex-1"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAddSubcategory();
                                    if (e.key === "Escape") {
                                      setAddingSubcategoryParentId(null);
                                      setNewSubcategoryName("");
                                    }
                                  }}
                                />
                                <Button size="sm" onClick={handleAddSubcategory}>Adicionar</Button>
                                <Button size="sm" variant="ghost" onClick={() => {
                                  setAddingSubcategoryParentId(null);
                                  setNewSubcategoryName("");
                                }}>Cancelar</Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>

                {isAddingCategory ? (
                  <div className="flex items-center gap-2 p-2 rounded-md border bg-muted">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome da categoria principal"
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddCategory();
                        if (e.key === "Escape") {
                          setIsAddingCategory(false);
                          setNewCategoryName("");
                        }
                      }}
                    />
                    <Button size="sm" onClick={handleAddCategory}>Adicionar</Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName("");
                    }}>Cancelar</Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsAddingCategory(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Categoria Principal
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Card de Tags */}
            <Card>
              <CardHeader>
                <CardTitle>🏷️ Tags</CardTitle>
                <CardDescription>Gerencie as tags para organizar suas tarefas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                    >
                      {editingTagId === tag.id ? (
                        <>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className="h-6 w-6 rounded-full border-2 border-border shrink-0"
                                style={{ backgroundColor: editingTagColor }}
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2">
                              <div className="grid grid-cols-5 gap-1">
                                {TAG_PRESET_COLORS.map((color) => (
                                  <button
                                    key={color.value}
                                    className={`h-6 w-6 rounded-full border-2 transition-all ${
                                      editingTagColor === color.value ? 'border-foreground scale-110' : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    onClick={() => setEditingTagColor(color.value)}
                                    title={color.name}
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Input
                            value={editingTagName}
                            onChange={(e) => setEditingTagName(e.target.value)}
                            className="flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditTag(tag.id);
                              if (e.key === "Escape") {
                                setEditingTagId(null);
                                setEditingTagName("");
                                setEditingTagColor("");
                              }
                            }}
                          />
                          <Button size="sm" onClick={() => handleEditTag(tag.id)}>
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingTagId(null);
                              setEditingTagName("");
                              setEditingTagColor("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <div
                            className="h-4 w-4 rounded-full shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="flex-1 text-sm">{tag.name}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingTagId(tag.id);
                              setEditingTagName(tag.name);
                              setEditingTagColor(tag.color);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteTag(tag.id, tag.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}

                  {tags.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma tag criada. Crie tags para organizar suas tarefas.
                    </p>
                  )}
                </div>

                {isAddingTag ? (
                  <div className="flex items-center gap-2 p-2 rounded-md border bg-muted">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="h-6 w-6 rounded-full border-2 border-border shrink-0"
                          style={{ backgroundColor: newTagColor }}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="grid grid-cols-5 gap-1">
                          {TAG_PRESET_COLORS.map((color) => (
                            <button
                              key={color.value}
                              className={`h-6 w-6 rounded-full border-2 transition-all ${
                                newTagColor === color.value ? 'border-foreground scale-110' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color.value }}
                              onClick={() => setNewTagColor(color.value)}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Nome da tag"
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTag();
                        if (e.key === "Escape") {
                          setIsAddingTag(false);
                          setNewTagName("");
                          setNewTagColor("#3B82F6");
                        }
                      }}
                    />
                    <Button size="sm" onClick={handleAddTag}>Adicionar</Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setIsAddingTag(false);
                      setNewTagName("");
                      setNewTagColor("#3B82F6");
                    }}>Cancelar</Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsAddingTag(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Tag
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba IA & Prompts */}
          <TabsContent value="ai-prompts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>🤖 IA & Prompts</CardTitle>
                <CardDescription>Personalize os prompts usados pela IA para melhorar suas notas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Resetar Todos
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Resetar todos os prompts?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso restaurará todos os prompts para os valores padrão. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={resetAllAIPrompts}>
                          Resetar Todos
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {getAllPrompts().map((prompt) => (
                  <div key={prompt.key} className="space-y-2 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">{prompt.label}</Label>
                        <p className="text-sm text-muted-foreground">{prompt.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetAIPrompt(prompt.key)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={getAIPrompt(prompt.key)}
                      onChange={(e) => updateAIPrompt(prompt.key, e.target.value)}
                      className="min-h-[100px] font-mono text-sm"
                      placeholder={prompt.defaultValue}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Avançado */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>⚡ Configurações Avançadas</CardTitle>
                <CardDescription>Opções avançadas e gerenciamento de conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Modo Simplificado</Label>
                    <p className="text-sm text-muted-foreground">
                      Remove elementos decorativos para melhor performance
                    </p>
                  </div>
                  <Switch
                    checked={settings.kanban.simplifiedMode}
                    onCheckedChange={(checked) => updateSettings({ kanban: { ...settings.kanban, simplifiedMode: checked } })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Importar/Exportar Dados</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                    <Button variant="outline" onClick={handleImport}>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Resetar Configurações</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Restaura todas as configurações para os valores padrão
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Resetar Tudo
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Resetar configurações?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso restaurará todas as configurações para os valores padrão. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReset}>
                          Resetar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Conta</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair da Conta
                    </Button>
                    <DeleteAccountButton />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Dados */}
          <TabsContent value="data" className="space-y-4">
            <DataIntegrityMonitor />
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Column Manager Modal */}
      {showColumnManager && (
        <ColumnManager
          open={showColumnManager}
          onOpenChange={setShowColumnManager}
          columns={columns}
          hiddenColumns={hiddenColumns}
          onToggleVisibility={toggleColumnVisibility}
          onResetToDefault={resetToDefaultView}
          onDeleteColumn={deleteColumn}
          onRenameColumn={renameColumn}
          onReorderColumns={reorderColumns}
          onAddColumn={addColumn}
          onToggleKanbanVisibility={toggleColumnKanbanVisibility}
        />
      )}
    </div>
  );
}
