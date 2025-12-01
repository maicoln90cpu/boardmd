import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/contexts/ThemeContext";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/hooks/use-toast";
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
import { Pencil, Trash2, Plus, Download, Upload, LogOut, ArrowLeft, GripVertical, Info, RotateCcw, Calendar, FileText, Settings, Layers, BarChart3, Bell } from "lucide-react";
import { SettingsLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ColumnManager } from "@/components/kanban/ColumnManager";
import { useColumns } from "@/hooks/useColumns";
import { getAllPrompts } from "@/lib/defaultAIPrompts";
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

// Sortable category item component
function SortableCategoryItem({ 
  category, 
  editingId, 
  editingName, 
  setEditingId, 
  setEditingName,
  handleEditCategory,
  handleDeleteCategory 
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
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
          <span className="flex-1 text-sm">{category.name}</span>
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
            onClick={() => handleDeleteCategory(category.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export default function Config() {
  const { settings, updateSettings, saveSettings, resetSettings, isDirty, isLoading, getAIPrompt, updateAIPrompt, resetAIPrompt, resetAllAIPrompts } = useSettings();
  const { theme, setTheme } = useTheme();
  const { categories, addCategory, deleteCategory, reorderCategories } = useCategories();
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
  const [showColumnManager, setShowColumnManager] = useState(false);
  
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

  const handleDeleteCategory = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (category?.name === "Diário") {
      toast({ title: "Não é possível excluir a categoria Diário", variant: "destructive" });
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
      <div className="hidden md:block">
        <div className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-card">
          <div className="px-6 py-4 border-b">
            <h1 className="text-xl font-bold">Kanban Board</h1>
          </div>
          <nav className="flex flex-col gap-1 p-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="justify-start gap-3">
              <Calendar className="h-4 w-4" />
              Diário
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="justify-start gap-3">
              <Layers className="h-4 w-4" />
              Projetos
            </Button>
            <Button variant="ghost" onClick={() => navigate("/calendar")} className="justify-start gap-3">
              <Calendar className="h-4 w-4" />
              Calendário
            </Button>
            <Button variant="ghost" onClick={() => navigate("/notes")} className="justify-start gap-3">
              <FileText className="h-4 w-4" />
              Anotações
            </Button>
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="justify-start gap-3">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="ghost" onClick={() => navigate("/notifications")} className="justify-start gap-3">
              <Bell className="h-4 w-4" />
              Notificações
            </Button>
            <Button variant="secondary" className="justify-start gap-3">
              <Settings className="h-4 w-4" />
              Setup
            </Button>
          </nav>
        </div>
      </div>

      <div className="flex-1 md:ml-64">
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

                <div className="space-y-4">
                  <Label>Mobile</Label>
                  
                  <div className="space-y-2">
                    <Label htmlFor="grid-columns-daily">Colunas do Grid Mobile (Diário)</Label>
                    <Select 
                      value={settings.mobile.dailyGridColumns.toString()} 
                      onValueChange={(value) => updateSettings({ mobile: { ...settings.mobile, dailyGridColumns: Number(value) as 1 | 2 } })}
                    >
                      <SelectTrigger id="grid-columns-daily">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Coluna</SelectItem>
                        <SelectItem value="2">2 Colunas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grid-columns-projects">Colunas do Grid Mobile (Projetos)</Label>
                    <Select 
                      value={settings.mobile.projectsGridColumns.toString()} 
                      onValueChange={(value) => updateSettings({ mobile: { ...settings.mobile, projectsGridColumns: Number(value) as 1 | 2 } })}
                    >
                      <SelectTrigger id="grid-columns-projects">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Coluna</SelectItem>
                        <SelectItem value="2">2 Colunas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="hide-badges">Ocultar Badges no Mobile</Label>
                    <Switch
                      id="hide-badges"
                      checked={settings.mobile.hideBadges}
                      onCheckedChange={(checked) => updateSettings({ mobile: { ...settings.mobile, hideBadges: checked } })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Progressive Web App (PWA)</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Instale o aplicativo para acesso rápido, uso offline e notificações push
                  </p>
                  <Button 
                    onClick={() => {
                      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
                      if (isStandalone) {
                        toast({
                          title: "App já instalado",
                          description: "O aplicativo já está instalado neste dispositivo",
                        });
                        return;
                      }

                      // Forçar mostrar o prompt removendo o timestamp de dismiss
                      localStorage.removeItem('pwa_install_dismissed');
                      
                      // Disparar evento customizado para mostrar o InstallPrompt
                      window.dispatchEvent(new Event('show-install-prompt'));
                      
                      // Se estiver no Safari/iOS, mostrar instruções
                      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                      
                      if (isSafari || isIOS) {
                        toast({
                          title: "Como instalar no iOS/Safari",
                          description: "Toque no botão Compartilhar (⎙) e selecione 'Adicionar à Tela de Início'",
                          duration: 8000,
                        });
                      } else {
                        toast({
                          title: "Prompt de instalação",
                          description: "Se disponível, o prompt de instalação aparecerá em breve",
                        });
                      }
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    📱 Instalar Aplicativo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Notificações */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>🔔 Notificações</CardTitle>
                <CardDescription>Configure os alertas do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="due-date">Alertas de Prazo</Label>
                    <p className="text-sm text-muted-foreground">Receba notificações quando tarefas estiverem próximas do prazo</p>
                  </div>
                  <Switch
                    id="due-date"
                    checked={settings.notifications.dueDate}
                    onCheckedChange={(checked) => updateSettings({ notifications: { ...settings.notifications, dueDate: checked } })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="due-hours">Horas antes do prazo</Label>
                  <Input
                    id="due-hours"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.notifications.dueDateHours}
                    onChange={(e) => updateSettings({ notifications: { ...settings.notifications, dueDateHours: parseInt(e.target.value) || 24 } })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="check-interval">Periodicidade de Verificação</Label>
                  <Select 
                    value={settings.notifications.checkInterval.toString()} 
                    onValueChange={(value) => updateSettings({ notifications: { ...settings.notifications, checkInterval: Number(value) as 5 | 15 | 30 | 60 } })}
                  >
                    <SelectTrigger id="check-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">A cada 5 minutos</SelectItem>
                      <SelectItem value="15">A cada 15 minutos</SelectItem>
                      <SelectItem value="30">A cada 30 minutos</SelectItem>
                      <SelectItem value="60">A cada hora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="snooze-minutes">Intervalo de Repetição (Snooze)</Label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Repetir notificação a cada quantos minutos se a tarefa não for concluída
                  </div>
                  <Input
                    id="snooze-minutes"
                    type="number"
                    min="5"
                    max="120"
                    step="5"
                    value={settings.notifications.snoozeMinutes}
                    onChange={(e) => updateSettings({ notifications: { ...settings.notifications, snoozeMinutes: parseInt(e.target.value) || 30 } })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="achievements">Notificações de Conquistas</Label>
                    <p className="text-sm text-muted-foreground">Receba avisos ao completar metas e conquistas</p>
                  </div>
                  <Switch
                    id="achievements"
                    checked={settings.notifications.achievements}
                    onCheckedChange={(checked) => updateSettings({ notifications: { ...settings.notifications, achievements: checked } })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sound">Sons de Notificação</Label>
                    <p className="text-sm text-muted-foreground">Reproduzir sons ao receber notificações</p>
                  </div>
                  <Switch
                    id="sound"
                    checked={settings.notifications.sound}
                    onCheckedChange={(checked) => updateSettings({ notifications: { ...settings.notifications, sound: checked } })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔔 Notificações</CardTitle>
                <CardDescription>Configure os alertas do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="due-date">Alertas de Prazo</Label>
                    <p className="text-sm text-muted-foreground">Receba notificações quando tarefas estiverem próximas do prazo</p>
                  </div>
                  <Switch
                    id="due-date"
                    checked={settings.notifications.dueDate}
                    onCheckedChange={(checked) => updateSettings({ notifications: { ...settings.notifications, dueDate: checked } })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="due-hours">Horas antes do prazo</Label>
                  <Input
                    id="due-hours"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.notifications.dueDateHours}
                    onChange={(e) => updateSettings({ notifications: { ...settings.notifications, dueDateHours: parseInt(e.target.value) || 24 } })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="check-interval">Periodicidade de Verificação</Label>
                  <Select 
                    value={settings.notifications.checkInterval.toString()} 
                    onValueChange={(value) => updateSettings({ notifications: { ...settings.notifications, checkInterval: Number(value) as 5 | 15 | 30 | 60 } })}
                  >
                    <SelectTrigger id="check-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">A cada 5 minutos</SelectItem>
                      <SelectItem value="15">A cada 15 minutos</SelectItem>
                      <SelectItem value="30">A cada 30 minutos</SelectItem>
                      <SelectItem value="60">A cada hora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="snooze-minutes">Intervalo de Repetição (Snooze)</Label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Repetir notificação a cada quantos minutos se a tarefa não for concluída
                  </div>
                  <Input
                    id="snooze-minutes"
                    type="number"
                    min="5"
                    max="120"
                    step="5"
                    value={settings.notifications.snoozeMinutes}
                    onChange={(e) => updateSettings({ notifications: { ...settings.notifications, snoozeMinutes: parseInt(e.target.value) || 30 } })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="achievements">Notificações de Conquistas</Label>
                    <p className="text-sm text-muted-foreground">Receba avisos ao completar metas e conquistas</p>
                  </div>
                  <Switch
                    id="achievements"
                    checked={settings.notifications.achievements}
                    onCheckedChange={(checked) => updateSettings({ notifications: { ...settings.notifications, achievements: checked } })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sound">Sons de Notificação</Label>
                    <p className="text-sm text-muted-foreground">Reproduzir sons ao receber notificações</p>
                  </div>
                  <Switch
                    id="sound"
                    checked={settings.notifications.sound}
                    onCheckedChange={(checked) => updateSettings({ notifications: { ...settings.notifications, sound: checked } })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Central de Notificações Push</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure notificações push, templates e monitore entregas na central dedicada
                  </p>
                  <Button 
                    onClick={() => navigate("/notifications")}
                    variant="outline"
                    className="w-full justify-start gap-3"
                  >
                    <Bell className="h-4 w-4" />
                    Ir para Central de Notificações
                  </Button>
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
                    <Label htmlFor="auto-reset">Reset Automático Diário</Label>
                    <p className="text-sm text-muted-foreground">Resetar automaticamente o Kanban Diário</p>
                  </div>
                  <Switch
                    id="auto-reset"
                    checked={settings.kanban.autoReset}
                    onCheckedChange={(checked) => updateSettings({ kanban: { ...settings.kanban, autoReset: checked } })}
                  />
                </div>

                {settings.kanban.autoReset && (
                  <div className="space-y-2">
                    <Label htmlFor="reset-time">Horário do Reset</Label>
                    <Input
                      id="reset-time"
                      type="time"
                      value={settings.kanban.resetTime}
                      onChange={(e) => updateSettings({ kanban: { ...settings.kanban, resetTime: e.target.value } })}
                    />
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="max-tasks">Máximo de Tarefas por Coluna</Label>
                  <Input
                    id="max-tasks"
                    type="number"
                    min="1"
                    max="100"
                    value={settings.kanban.maxTasksPerColumn}
                    onChange={(e) => updateSettings({ kanban: { ...settings.kanban, maxTasksPerColumn: parseInt(e.target.value) || 20 } })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="cross-drag">Arrastar entre Categorias</Label>
                    <p className="text-sm text-muted-foreground">Permitir mover tarefas entre diferentes categorias</p>
                  </div>
                  <Switch
                    id="cross-drag"
                    checked={settings.kanban.allowCrossCategoryDrag}
                    onCheckedChange={(checked) => updateSettings({ kanban: { ...settings.kanban, allowCrossCategoryDrag: checked } })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="favorites-panel">Mostrar Painel de Favoritos</Label>
                    <p className="text-sm text-muted-foreground">Exibir painel lateral com tarefas favoritas</p>
                  </div>
                  <Switch
                    id="favorites-panel"
                    checked={settings.kanban.showFavoritesPanel}
                    onCheckedChange={(checked) => updateSettings({ kanban: { ...settings.kanban, showFavoritesPanel: checked } })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="hide-completed">Ocultar Tarefas Concluídas</Label>
                    <p className="text-sm text-muted-foreground">Esconder tarefas marcadas como concluídas</p>
                  </div>
                  <Switch
                    id="hide-completed"
                    checked={settings.kanban.hideCompletedTasks}
                    onCheckedChange={handleToggleHideCompleted}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="daily-sort">Ordenação Padrão (Kanban Diário)</Label>
                  <Select 
                    value={settings.kanban.dailySortOption} 
                    onValueChange={(value) => updateSettings({ kanban: { ...settings.kanban, dailySortOption: value as 'time' | 'name' | 'priority' } })}
                  >
                    <SelectTrigger id="daily-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Horário</SelectItem>
                      <SelectItem value="name">Nome</SelectItem>
                      <SelectItem value="priority">Prioridade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daily-order">Ordem de Classificação</Label>
                  <Select 
                    value={settings.kanban.dailySortOrder} 
                    onValueChange={(value) => updateSettings({ kanban: { ...settings.kanban, dailySortOrder: value as 'asc' | 'desc' } })}
                  >
                    <SelectTrigger id="daily-order">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Crescente</SelectItem>
                      <SelectItem value="desc">Decrescente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="simplified">Modo Simplificado</Label>
                    <p className="text-sm text-muted-foreground">Mostrar apenas 3 colunas principais</p>
                  </div>
                  <Switch
                    id="simplified"
                    checked={settings.kanban.simplifiedMode}
                    onCheckedChange={(checked) => updateSettings({ kanban: { ...settings.kanban, simplifiedMode: checked } })}
                  />
                </div>

                <Separator />

                <div>
                  <Button onClick={() => setShowColumnManager(true)} className="w-full">
                    Gerenciar Colunas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Produtividade */}
          <TabsContent value="productivity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>📈 Produtividade</CardTitle>
                <CardDescription>Configure suas metas e ferramentas de produtividade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="daily-goal">Meta Diária de Tarefas</Label>
                  <Input
                    id="daily-goal"
                    type="number"
                    min="1"
                    max="50"
                    value={settings.productivity.dailyGoal}
                    onChange={(e) => updateSettings({ productivity: { ...settings.productivity, dailyGoal: parseInt(e.target.value) || 5 } })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pomodoro">Habilitar Pomodoro</Label>
                    <p className="text-sm text-muted-foreground">Ativar timer Pomodoro para foco</p>
                  </div>
                  <Switch
                    id="pomodoro"
                    checked={settings.productivity.pomodoroEnabled}
                    onCheckedChange={(checked) => updateSettings({ productivity: { ...settings.productivity, pomodoroEnabled: checked } })}
                  />
                </div>

                {settings.productivity.pomodoroEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="pomodoro-duration">Duração do Pomodoro (minutos)</Label>
                    <Input
                      id="pomodoro-duration"
                      type="number"
                      min="1"
                      max="60"
                      value={settings.productivity.pomodoroDuration}
                      onChange={(e) => updateSettings({ productivity: { ...settings.productivity, pomodoroDuration: parseInt(e.target.value) || 25 } })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Categorias */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>🗂️ Categorias</CardTitle>
                <CardDescription>Gerencie suas categorias de projetos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingCategory(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Categoria
                  </Button>
                </div>

                {isAddingCategory && (
                  <div className="flex items-center gap-2 p-2 rounded-md border bg-card">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome da nova categoria..."
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddCategory();
                        }
                        if (e.key === "Escape") {
                          setIsAddingCategory(false);
                          setNewCategoryName("");
                        }
                      }}
                    />
                    <Button size="sm" onClick={handleAddCategory}>
                      Criar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={categories.filter(cat => cat.name !== "Diário").map(cat => cat.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {categories
                        .filter(cat => cat.name !== "Diário")
                        .map((category) => (
                          <SortableCategoryItem
                            key={category.id}
                            category={category}
                            editingId={editingId}
                            editingName={editingName}
                            setEditingId={setEditingId}
                            setEditingName={setEditingName}
                            handleEditCategory={handleEditCategory}
                            handleDeleteCategory={handleDeleteCategory}
                          />
                        ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Avançado */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>🔧 Avançado</CardTitle>
                <CardDescription>Configurações avançadas do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      Resetar Todas as Configurações
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso irá resetar todas as configurações para os valores padrão. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Separator />

                <Button variant="outline" onClick={handleLogout} className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair da Conta
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba IA & Prompts */}
          <TabsContent value="ai-prompts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>🤖 Prompts de IA</CardTitle>
                <CardDescription>
                  Personalize os prompts usados pelos assistentes de IA do aplicativo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Seção: Formatação de Notas */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    📝 Formatação de Notas
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Usados ao formatar notas com IA</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </h3>
                  <div className="space-y-6">
                    {getAllPrompts()
                      .filter(p => p.category === 'notes')
                      .map(prompt => {
                        const currentValue = getAIPrompt(prompt.key) || prompt.defaultValue;
                        const isCustom = !!getAIPrompt(prompt.key);
                        
                        return (
                          <div key={prompt.key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={prompt.key} className="font-medium">
                                {prompt.label}
                              </Label>
                              {isCustom && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resetAIPrompt(prompt.key)}
                                  className="text-xs"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Restaurar padrão
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{prompt.description}</p>
                            <Textarea
                              id={prompt.key}
                              value={currentValue}
                              onChange={(e) => updateAIPrompt(prompt.key, e.target.value)}
                              rows={6}
                              className="font-mono text-xs"
                              placeholder={prompt.defaultValue}
                            />
                            <p className="text-xs text-muted-foreground text-right">
                              {currentValue.length} caracteres
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <Separator />

                {/* Seção: Kanban Diário */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    📅 Kanban Diário
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Usado ao organizar tarefas com IA</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </h3>
                  <div className="space-y-6">
                    {getAllPrompts()
                      .filter(p => p.category === 'kanban')
                      .map(prompt => {
                        const currentValue = getAIPrompt(prompt.key) || prompt.defaultValue;
                        const isCustom = !!getAIPrompt(prompt.key);
                        
                        return (
                          <div key={prompt.key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={prompt.key} className="font-medium">
                                {prompt.label}
                              </Label>
                              {isCustom && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resetAIPrompt(prompt.key)}
                                  className="text-xs"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Restaurar padrão
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{prompt.description}</p>
                            <Textarea
                              id={prompt.key}
                              value={currentValue}
                              onChange={(e) => updateAIPrompt(prompt.key, e.target.value)}
                              rows={8}
                              className="font-mono text-xs"
                              placeholder={prompt.defaultValue}
                            />
                            <p className="text-xs text-muted-foreground text-right">
                              {currentValue.length} caracteres
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <Separator />

                {/* Seção: Análise de Produtividade */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    📊 Análise de Produtividade
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Usado ao gerar insights de produtividade</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </h3>
                  <div className="space-y-6">
                    {getAllPrompts()
                      .filter(p => p.category === 'productivity')
                      .map(prompt => {
                        const currentValue = getAIPrompt(prompt.key) || prompt.defaultValue;
                        const isCustom = !!getAIPrompt(prompt.key);
                        
                        return (
                          <div key={prompt.key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={prompt.key} className="font-medium">
                                {prompt.label}
                              </Label>
                              {isCustom && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resetAIPrompt(prompt.key)}
                                  className="text-xs"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Restaurar padrão
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{prompt.description}</p>
                            <Textarea
                              id={prompt.key}
                              value={currentValue}
                              onChange={(e) => updateAIPrompt(prompt.key, e.target.value)}
                              rows={10}
                              className="font-mono text-xs"
                              placeholder={prompt.defaultValue}
                            />
                            <p className="text-xs text-muted-foreground text-right">
                              {currentValue.length} caracteres
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <Separator />

                {/* Botão para restaurar todos */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurar Todos os Prompts para Padrão
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Restaurar todos os prompts?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso irá resetar todos os prompts customizados para os valores padrão. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => {
                        resetAllAIPrompts();
                        toast({ title: "Prompts restaurados", description: "Todos os prompts foram restaurados aos valores padrão" });
                      }}>
                        Restaurar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Dados */}
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>💾 Dados</CardTitle>
                <CardDescription>Gerencie seus dados e backups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleExport} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Dados
                </Button>

                <Button onClick={handleImport} variant="outline" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Dados
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de Gerenciamento de Colunas */}
      <ColumnManager
        open={showColumnManager}
        onOpenChange={setShowColumnManager}
        columns={columns}
        hiddenColumns={hiddenColumns}
        onToggleVisibility={toggleColumnVisibility}
        onDeleteColumn={deleteColumn}
        onResetToDefault={resetToDefaultView}
        onRenameColumn={renameColumn}
        onAddColumn={addColumn}
        onReorderColumns={reorderColumns}
        onToggleKanbanVisibility={toggleColumnKanbanVisibility}
      />
      </div>
    </div>
  );
}
