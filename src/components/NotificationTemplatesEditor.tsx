import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RotateCcw, Save, TestTube2, Wifi, WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ACTIVE_PUSH_TEMPLATES = [
  'task_completed',
  'due_overdue',
  'due_urgent',
  'due_warning',
  'due_early',
  'achievement_streak',
  'achievement_level',
];
import { useSettings } from "@/hooks/data/useSettings";
import { 
  defaultNotificationTemplates, 
  NotificationTemplate,
  formatNotificationTemplate 
} from "@/lib/defaultNotificationTemplates";
import { toast } from "sonner";

// Merge saved templates with defaults to ensure description and new fields are present
function mergeWithDefaults(saved: NotificationTemplate[]): NotificationTemplate[] {
  const oldDefaultBodies = [
    `"{{taskTitle}}" vence em {{timeRemaining}}`,
    `*"{{taskTitle}}"* vence em {{timeRemaining}}`,
  ];
  return defaultNotificationTemplates.map((defaultT) => {
    const savedT = saved.find((s) => s.id === defaultT.id);
    if (!savedT) return defaultT;
    const shouldUpdateBody = oldDefaultBodies.includes(savedT.body.trim()) && savedT.body.trim() !== defaultT.body.trim();
    return {
      ...defaultT,
      ...savedT,
      description: defaultT.description,
      ...(shouldUpdateBody ? { body: defaultT.body } : {}),
    };
  });
}

export function NotificationTemplatesEditor() {
  const { settings, updateSettings, saveSettings, isLoading } = useSettings();
  const [templates, setTemplates] = useState<NotificationTemplate[]>(
    () => settings.notificationTemplates ? mergeWithDefaults(settings.notificationTemplates) : defaultNotificationTemplates
  );
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(
    templates[0] || null
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when settings load/change from server
  useEffect(() => {
    if (settings.notificationTemplates) {
      const merged = mergeWithDefaults(settings.notificationTemplates);
      setTemplates(merged);
      const currentId = selectedTemplate?.id;
      if (currentId) {
        const updated = merged.find(t => t.id === currentId);
        if (updated) setSelectedTemplate(updated);
      } else {
        setSelectedTemplate(merged[0] || null);
      }
    }
  }, [settings.notificationTemplates]);

  const handleTemplateChange = (field: keyof NotificationTemplate, value: string | boolean) => {
    if (!selectedTemplate) return;

    const updatedTemplate = { ...selectedTemplate, [field]: value };
    const updatedTemplates = templates.map((t) =>
      t.id === selectedTemplate.id ? updatedTemplate : t
    );

    setTemplates(updatedTemplates);
    setSelectedTemplate(updatedTemplate);
    setHasChanges(true);
  };

  const handleToggleEnabled = (templateId: string, enabled: boolean) => {
    const updatedTemplates = templates.map((t) =>
      t.id === templateId ? { ...t, enabled } : t
    );
    setTemplates(updatedTemplates);
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate({ ...selectedTemplate, enabled });
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      updateSettings({ notificationTemplates: templates });
      await saveSettings();
      setHasChanges(false);
      toast.success("Templates salvos com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar templates");
    }
  };

  const handleRestore = (templateId: string) => {
    const defaultTemplate = defaultNotificationTemplates.find((t) => t.id === templateId);
    if (!defaultTemplate) return;

    const updatedTemplates = templates.map((t) =>
      t.id === templateId ? { ...defaultTemplate } : t
    );

    setTemplates(updatedTemplates);
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate({ ...defaultTemplate });
    }
    setHasChanges(true);
    toast.success("Template restaurado para o padrão");
  };

  const handleTestTemplate = async () => {
    if (!selectedTemplate) return;

    const testVariables: Record<string, string> = {
      taskTitle: "Exemplo de Tarefa",
      columnName: "Em Progresso",
      timeRemaining: "2 horas",
      streakDays: "7",
      totalTasks: "50",
      level: "5",
    };

    const formatted = formatNotificationTemplate(selectedTemplate, testVariables);

    try {
      const { oneSignalNotifier } = await import("@/lib/notifications/oneSignalNotifier");
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const success = await oneSignalNotifier.send({
          user_id: user.id,
          title: formatted.title,
          body: formatted.body,
          notification_type: `test_${selectedTemplate.id}`,
          url: '/',
        });
        
        if (success) {
          toast.success("Notificação de teste enviada!");
        } else {
          throw new Error("Failed to send");
        }
      } else {
        throw new Error("User not logged in");
      }
    } catch (error) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(formatted.title, {
          body: formatted.body,
          icon: "/pwa-icon.png",
          badge: "/favicon.png",
        });
        toast.success("Notificação de teste enviada (local)!");
      } else {
        toast.info(formatted.title, {
          description: formatted.body,
        });
      }
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "task":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "reminder":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "system":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "achievement":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const isTemplateEnabled = (template: NotificationTemplate) => template.enabled !== false;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <Skeleton className="h-5 w-56 mb-2" />
              <Skeleton className="h-4 w-80" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <div className="border rounded-md p-2 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-md" />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-[300px] w-full rounded-md" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1">Templates de Notificações</h3>
            <p className="text-xs text-muted-foreground">
              Personalize as mensagens das notificações push. Use variáveis como{" "}
              <code className="text-xs bg-muted px-1 rounded">{"{{taskTitle}}"}</code>,{" "}
              <code className="text-xs bg-muted px-1 rounded">{"{{timeRemaining}}"}</code>, etc.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Template List */}
            <div className="space-y-2">
              <Label className="text-xs">Templates Disponíveis</Label>
              <ScrollArea className="h-[400px] border rounded-md">
                <div className="p-2 space-y-1">
                  {templates.map((template) => {
                    const enabled = isTemplateEnabled(template);
                    return (
                      <div
                        key={template.id}
                        className={`relative rounded-md transition-all ${!enabled ? "opacity-50" : ""}`}
                      >
                        <button
                          onClick={() => setSelectedTemplate(template)}
                          className={`w-full text-left p-3 rounded-md transition-colors ${
                            selectedTemplate?.id === template.id
                              ? "bg-primary/10 border border-primary/20"
                              : "bg-muted/50 hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-base">{template.emoji}</span>
                                <span className="text-xs font-medium truncate">
                                  {template.name}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">
                                {template.title}
                              </p>
                              {template.description && (
                                <p className="text-[9px] text-muted-foreground/70 line-clamp-2 mt-0.5 italic">
                                  {template.description}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] h-5 ${getCategoryColor(template.category)}`}
                                >
                                  {template.category}
                                </Badge>
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={(checked) => {
                                    handleToggleEnabled(template.id, checked);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="scale-75"
                                />
                              </div>
                              {enabled ? (
                                ACTIVE_PUSH_TEMPLATES.includes(template.id) ? (
                                  <Badge variant="outline" className="text-[9px] h-5 bg-green-500/10 text-green-600 border-green-500/20">
                                    <Wifi className="h-2.5 w-2.5 mr-0.5" />
                                    Push Ativo
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] h-5 bg-muted text-muted-foreground">
                                    <WifiOff className="h-2.5 w-2.5 mr-0.5" />
                                    Apenas local
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="outline" className="text-[9px] h-5 bg-muted text-muted-foreground">
                                  Desativado
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Template Editor */}
            <div className="space-y-3">
              {selectedTemplate ? (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Editar Template</Label>
                    <div className="flex gap-1">
                      <Button
                        onClick={handleTestTemplate}
                        variant="outline"
                        size="sm"
                        className="h-7"
                        disabled={!isTemplateEnabled(selectedTemplate)}
                      >
                        <TestTube2 className="h-3 w-3 mr-1" />
                        Testar
                      </Button>
                      <Button
                        onClick={() => handleRestore(selectedTemplate.id)}
                        variant="outline"
                        size="sm"
                        className="h-7"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restaurar
                      </Button>
                    </div>
                  </div>

                  {selectedTemplate.description && (
                    <p className="text-[11px] text-muted-foreground italic bg-muted/50 rounded-md px-3 py-2 mb-1">
                      💡 {selectedTemplate.description}
                    </p>
                  )}

                  <Card className="p-3 space-y-3 bg-muted/30">
                    <div className="space-y-1.5">
                      <Label htmlFor="emoji" className="text-xs">
                        Emoji
                      </Label>
                      <Input
                        id="emoji"
                        value={selectedTemplate.emoji}
                        onChange={(e) => handleTemplateChange("emoji", e.target.value)}
                        className="h-9 text-xl text-center"
                        maxLength={2}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="title" className="text-xs">
                        Título da Notificação
                      </Label>
                      <Input
                        id="title"
                        value={selectedTemplate.title}
                        onChange={(e) => handleTemplateChange("title", e.target.value)}
                        className="h-9"
                        placeholder="Título..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="body" className="text-xs">
                        Corpo da Mensagem
                      </Label>
                      <Textarea
                        id="body"
                        value={selectedTemplate.body}
                        onChange={(e) => handleTemplateChange("body", e.target.value)}
                        className="min-h-[100px] resize-none"
                        placeholder="Mensagem..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Variáveis Disponíveis</Label>
                      <div className="flex flex-wrap gap-1">
                        {[
                          "taskTitle",
                          "columnName",
                          "timeRemaining",
                          "streakDays",
                          "totalTasks",
                          "level",
                        ].map((variable) => (
                          <Badge
                            key={variable}
                            variant="secondary"
                            className="text-[9px] cursor-pointer"
                            onClick={() => {
                              navigator.clipboard.writeText(`{{${variable}}}`);
                              toast.success("Variável copiada!");
                            }}
                          >
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Separator />

                  <div className="space-y-1.5">
                    <Label className="text-xs">Preview (com variáveis substituídas)</Label>
                    <Card className="p-3 bg-background space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-2xl">{selectedTemplate.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">
                            {formatNotificationTemplate(selectedTemplate, {
                              taskTitle: "Exemplo de Tarefa",
                              columnName: "Em Progresso",
                              timeRemaining: "2 horas",
                              streakDays: "7",
                              totalTasks: "50",
                              level: "5",
                            }).title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatNotificationTemplate(selectedTemplate, {
                              taskTitle: "Exemplo de Tarefa",
                              columnName: "Em Progresso",
                              timeRemaining: "2 horas",
                              streakDays: "7",
                              totalTasks: "50",
                              level: "5",
                            }).body}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  <p className="text-xs">Selecione um template para editar</p>
                </div>
              )}
            </div>
          </div>

          {hasChanges && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
