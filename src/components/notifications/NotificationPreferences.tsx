import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Clock, Trophy, Timer, Calendar } from "lucide-react";
import { useSettings } from "@/hooks/data/useSettings";
import { useToast } from "@/hooks/ui/useToast";

export function NotificationPreferences() {
  const { settings, updateSettings, saveSettings, isDirty } = useSettings();
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await saveSettings();
      toast({
        title: "Preferências salvas",
        description: "Suas configurações de notificação foram atualizadas.",
      });
    } catch {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as preferências.",
        variant: "destructive",
      });
    }
  };

  const handleNotificationChange = (key: keyof typeof settings.notifications, value: boolean | number) => {
    updateSettings({
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Alertas de Prazo
          </CardTitle>
          <CardDescription>
            Receba notificações quando suas tarefas estiverem próximas do vencimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="dueDate" className="flex flex-col gap-1">
              <span>Notificações de prazo</span>
              <span className="font-normal text-muted-foreground text-sm">
                Alertas quando tarefas estão vencendo
              </span>
            </Label>
            <Switch
              id="dueDate"
              checked={settings.notifications.dueDate}
              onCheckedChange={(checked) => handleNotificationChange('dueDate', checked)}
            />
          </div>

          {settings.notifications.dueDate && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="dueDateHours" className="flex flex-col gap-1">
                  <span>Antecedência do alerta</span>
                  <span className="font-normal text-muted-foreground text-sm">
                    Quantas horas antes do vencimento
                  </span>
                </Label>
                <Select
                  value={String(settings.notifications.dueDateHours)}
                  onValueChange={(value) => handleNotificationChange('dueDateHours', Number(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hora</SelectItem>
                    <SelectItem value="2">2 horas</SelectItem>
                    <SelectItem value="6">6 horas</SelectItem>
                    <SelectItem value="12">12 horas</SelectItem>
                    <SelectItem value="24">24 horas</SelectItem>
                    <SelectItem value="48">48 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="checkInterval" className="flex flex-col gap-1">
                  <span>Frequência de verificação</span>
                  <span className="font-normal text-muted-foreground text-sm">
                    Com que frequência verificar prazos
                  </span>
                </Label>
                <Select
                  value={String(settings.notifications.checkInterval)}
                  onValueChange={(value) => handleNotificationChange('checkInterval', Number(value) as 5 | 15 | 30 | 60)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutos</SelectItem>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="snoozeMinutes" className="flex flex-col gap-1">
                  <span>Soneca</span>
                  <span className="font-normal text-muted-foreground text-sm">
                    Tempo antes de repetir o mesmo alerta
                  </span>
                </Label>
                <Select
                  value={String(settings.notifications.snoozeMinutes)}
                  onValueChange={(value) => handleNotificationChange('snoozeMinutes', Number(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="240">4 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Conquistas e Gamificação
          </CardTitle>
          <CardDescription>
            Notificações de progresso, níveis e conquistas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="achievements" className="flex flex-col gap-1">
              <span>Notificações de conquistas</span>
              <span className="font-normal text-muted-foreground text-sm">
                Alertas quando você atingir novas conquistas
              </span>
            </Label>
            <Switch
              id="achievements"
              checked={settings.notifications.achievements}
              onCheckedChange={(checked) => handleNotificationChange('achievements', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferências Gerais
          </CardTitle>
          <CardDescription>
            Configurações adicionais de notificação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="sound" className="flex flex-col gap-1">
              <span>Som de notificação</span>
              <span className="font-normal text-muted-foreground text-sm">
                Tocar som ao receber notificações
              </span>
            </Label>
            <Switch
              id="sound"
              checked={settings.notifications.sound}
              onCheckedChange={(checked) => handleNotificationChange('sound', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {isDirty && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Salvar Preferências
          </button>
        </div>
      )}
    </div>
  );
}
