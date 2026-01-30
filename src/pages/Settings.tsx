import { Sidebar } from "@/components/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/data/useSettings";
import { useTheme } from "@/contexts/ThemeContext";
import { CustomColorPicker } from "@/components/settings/CustomColorPicker";
import { useNavigate } from "react-router-dom";
import { Home, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/ui/useToast";

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleReset = () => {
    if (confirm("Deseja realmente resetar todas as configurações para o padrão?")) {
      resetSettings();
      toast({ title: "Configurações resetadas com sucesso!" });
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={toggleTheme}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden md:ml-64">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-3 border-b bg-background">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-5 w-5" />
            <span className="text-sm">Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Configurações</h2>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="appearance" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="appearance">Aparência</TabsTrigger>
                <TabsTrigger value="notifications">Notificações</TabsTrigger>
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="productivity">Produtividade</TabsTrigger>
                <TabsTrigger value="advanced">Avançado</TabsTrigger>
              </TabsList>

              {/* Aparência */}
              <TabsContent value="appearance" className="space-y-4">
              {/* Custom Color Picker with presets */}
                <CustomColorPicker />

                <Card>
                  <CardHeader>
                    <CardTitle>Tema</CardTitle>
                    <CardDescription>Personalize a aparência do aplicativo</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="theme">Modo de Cor</Label>
                      <Select
                        value={settings.theme}
                        onValueChange={(value: any) => updateSettings({ theme: value })}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Claro</SelectItem>
                          <SelectItem value="dark">Escuro</SelectItem>
                          <SelectItem value="auto">Automático</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="density">Densidade Padrão</Label>
                      <Select
                        value={settings.defaultDensity}
                        onValueChange={(value: any) => updateSettings({ defaultDensity: value })}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comfortable">Confortável</SelectItem>
                          <SelectItem value="compact">Compacto</SelectItem>
                          <SelectItem value="ultra-compact">Ultra Compacto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notificações */}
              <TabsContent value="notifications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Alertas e Notificações</CardTitle>
                    <CardDescription>Configure como você deseja ser notificado</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="dueDate">Alertas de Prazo</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba notificações sobre tarefas próximas do prazo
                        </p>
                      </div>
                      <Switch
                        id="dueDate"
                        checked={settings.notifications.dueDate}
                        onCheckedChange={(checked) =>
                          updateSettings({
                            notifications: { ...settings.notifications, dueDate: checked },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="dueDateHours">Horas antes do prazo</Label>
                      <Input
                        id="dueDateHours"
                        type="number"
                        min="1"
                        max="168"
                        className="w-[180px]"
                        value={settings.notifications.dueDateHours}
                        onChange={(e) =>
                          updateSettings({
                            notifications: {
                              ...settings.notifications,
                              dueDateHours: parseInt(e.target.value) || 24,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="achievements">Notificações de Conquistas</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba alertas ao completar metas e ganhar badges
                        </p>
                      </div>
                      <Switch
                        id="achievements"
                        checked={settings.notifications.achievements}
                        onCheckedChange={(checked) =>
                          updateSettings({
                            notifications: { ...settings.notifications, achievements: checked },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sound">Som de Notificação</Label>
                        <p className="text-sm text-muted-foreground">
                          Reproduzir som ao receber notificações
                        </p>
                      </div>
                      <Switch
                        id="sound"
                        checked={settings.notifications.sound}
                        onCheckedChange={(checked) =>
                          updateSettings({
                            notifications: { ...settings.notifications, sound: checked },
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Kanban */}
              <TabsContent value="kanban" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações do Kanban</CardTitle>
                    <CardDescription>Personalize o comportamento do quadro Kanban</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    <div className="flex items-center justify-between">
                      <Label htmlFor="resetTime">Horário de Reset</Label>
                      <Input
                        id="resetTime"
                        type="time"
                        className="w-[180px]"
                        value={settings.kanban.resetTime}
                        onChange={(e) =>
                          updateSettings({
                            kanban: { ...settings.kanban, resetTime: e.target.value },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="maxTasks">Máximo de Tarefas por Coluna</Label>
                      <Input
                        id="maxTasks"
                        type="number"
                        min="1"
                        max="100"
                        className="w-[180px]"
                        value={settings.kanban.maxTasksPerColumn}
                        onChange={(e) =>
                          updateSettings({
                            kanban: {
                              ...settings.kanban,
                              maxTasksPerColumn: parseInt(e.target.value) || 20,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="crossCategory">Arrastar entre Categorias</Label>
                        <p className="text-sm text-muted-foreground">
                          Permitir mover tarefas entre diferentes categorias
                        </p>
                      </div>
                      <Switch
                        id="crossCategory"
                        checked={settings.kanban.allowCrossCategoryDrag}
                        onCheckedChange={(checked) =>
                          updateSettings({
                            kanban: { ...settings.kanban, allowCrossCategoryDrag: checked },
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Produtividade */}
              <TabsContent value="productivity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Metas e Produtividade</CardTitle>
                    <CardDescription>Configure suas metas diárias e ferramentas de foco</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dailyGoal">Meta Diária de Tarefas</Label>
                      <Input
                        id="dailyGoal"
                        type="number"
                        min="1"
                        max="50"
                        className="w-[180px]"
                        value={settings.productivity.dailyGoal}
                        onChange={(e) =>
                          updateSettings({
                            productivity: {
                              ...settings.productivity,
                              dailyGoal: parseInt(e.target.value) || 5,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="pomodoro">Timer Pomodoro</Label>
                        <p className="text-sm text-muted-foreground">
                          Ativar contador de sessões focadas (em breve)
                        </p>
                      </div>
                      <Switch
                        id="pomodoro"
                        checked={settings.productivity.pomodoroEnabled}
                        onCheckedChange={(checked) =>
                          updateSettings({
                            productivity: { ...settings.productivity, pomodoroEnabled: checked },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="pomodoroDuration">Duração do Pomodoro (min)</Label>
                      <Input
                        id="pomodoroDuration"
                        type="number"
                        min="5"
                        max="60"
                        className="w-[180px]"
                        value={settings.productivity.pomodoroDuration}
                        onChange={(e) =>
                          updateSettings({
                            productivity: {
                              ...settings.productivity,
                              pomodoroDuration: parseInt(e.target.value) || 25,
                            },
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Avançado */}
              <TabsContent value="advanced" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações Avançadas</CardTitle>
                    <CardDescription>Opções avançadas e personalização da interface</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="language">Idioma</Label>
                      <Select
                        value={settings.interface.language}
                        onValueChange={(value: any) =>
                          updateSettings({
                            interface: { ...settings.interface, language: value },
                          })
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pt-BR">Português (BR)</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        variant="destructive"
                        onClick={handleReset}
                        className="w-full"
                      >
                        Resetar Todas as Configurações
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
