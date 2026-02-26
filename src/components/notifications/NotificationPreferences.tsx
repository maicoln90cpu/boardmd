import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Clock, Trophy, Columns } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings, AppSettings } from "@/hooks/data/useSettings";
import { useColumns } from "@/hooks/data/useColumns";
import { useToast } from "@/hooks/ui/useToast";

export function NotificationPreferences() {
  const { settings, updateSettings, saveSettings, isLoading } = useSettings();
  const { columns } = useColumns();
  const { toast } = useToast();

  // Local state for pending changes (avoids auto-save stealing the Save button)
  const [localNotifications, setLocalNotifications] = useState(settings.notifications);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Sync local state when settings load from DB (but not if user has pending changes)
  useEffect(() => {
    if (!hasLocalChanges) {
      setLocalNotifications(settings.notifications);
    }
  }, [settings.notifications, hasLocalChanges]);

  const handleSave = async () => {
    try {
      updateSettings({ notifications: localNotifications });
      await saveSettings();
      setHasLocalChanges(false);
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

  const handleNotificationChange = (key: keyof typeof localNotifications, value: boolean | number | string[] | null) => {
    setLocalNotifications(prev => ({
      ...prev,
      [key]: value,
    }));
    setHasLocalChanges(true);
  };

  const toggleExcludedColumn = (columnId: string) => {
    const current = localNotifications.excludedPushColumnIds || [];
    const updated = current.includes(columnId)
      ? current.filter(id => id !== columnId)
      : [...current, columnId];
    handleNotificationChange('excludedPushColumnIds', updated);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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
              checked={localNotifications.dueDate}
              onCheckedChange={(checked) => handleNotificationChange('dueDate', checked)}
            />
          </div>

          {localNotifications.dueDate && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="dueDateHours" className="flex flex-col gap-1">
                  <span>Antecedência do alerta</span>
                  <span className="font-normal text-muted-foreground text-sm">
                    Quantas horas antes do vencimento
                  </span>
                </Label>
                <Select
                  value={String(localNotifications.dueDateHours)}
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
                <Label htmlFor="dueDateHours2" className="flex flex-col gap-1">
                  <span>2º Alerta (opcional)</span>
                  <span className="font-normal text-muted-foreground text-sm">
                    Segundo alerta com antecedência diferente
                  </span>
                </Label>
                <Select
                  value={String(localNotifications.dueDateHours2 ?? 'off')}
                  onValueChange={(value) => handleNotificationChange('dueDateHours2', value === 'off' ? null as any : Number(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Desativado</SelectItem>
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
                  value={String(localNotifications.checkInterval)}
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

              {/* Column filter for push notifications */}
              <div className="border-t pt-4 mt-4">
                <Label className="flex items-center gap-2 mb-3">
                  <Columns className="h-4 w-4" />
                  <span className="flex flex-col gap-1">
                    <span>Colunas excluídas dos alertas</span>
                    <span className="font-normal text-muted-foreground text-sm">
                      Tarefas nestas colunas NÃO gerarão notificações push
                    </span>
                  </span>
                </Label>
                <div className="space-y-2 ml-1">
                  {columns.map(col => {
                    const excluded = (localNotifications.excludedPushColumnIds || []).includes(col.id);
                    return (
                      <div key={col.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`exclude-col-${col.id}`}
                          checked={excluded}
                          onCheckedChange={() => toggleExcludedColumn(col.id)}
                        />
                        <Label
                          htmlFor={`exclude-col-${col.id}`}
                          className="font-normal text-sm cursor-pointer"
                        >
                          {col.name}
                        </Label>
                      </div>
                    );
                  })}
                  {columns.length === 0 && (
                    <span className="text-xs text-muted-foreground">Nenhuma coluna encontrada</span>
                  )}
                </div>
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
              checked={localNotifications.achievements}
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
              checked={localNotifications.sound}
              onCheckedChange={(checked) => handleNotificationChange('sound', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {hasLocalChanges && (
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
