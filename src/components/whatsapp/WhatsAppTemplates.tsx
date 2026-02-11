import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, RotateCcw, Send, Loader2, Clock, Filter, ChevronDown, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Template {
  id?: string;
  template_type: string;
  message_template: string;
  is_enabled: boolean;
  label: string;
  variables: string[];
  send_time: string;
  send_time_2?: string;
  due_date_hours_before?: number;
  due_date_hours_before_2?: number;
  excluded_column_ids: string[];
}

interface Column {
  id: string;
  name: string;
}

// Templates de evento (sem campo de horário)
const EVENT_TEMPLATES = ["pomodoro", "achievement", "task_completed", "goal_reached"];
// Templates de horário fixo
const FIXED_TIME_TEMPLATES = ["daily_reminder", "daily_report", "daily_motivation", "weekly_summary"];
// Template dinâmico (horas antes)
const DYNAMIC_TEMPLATES = ["due_date"];
// Templates com cron que também verificam overdue
const CRON_EVENT_TEMPLATES = ["task_overdue"];
// Templates com filtro de colunas
const COLUMN_FILTER_TEMPLATES = ["due_date", "daily_reminder", "daily_report", "daily_motivation", "weekly_summary", "task_completed", "task_overdue"];

const WEEKDAYS = [
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

const DEFAULT_TEMPLATES: Omit<Template, "id">[] = [
  {
    template_type: "due_date",
    label: "⏰ Tarefa Vencendo",
    message_template: "⏰ *Alerta de Prazo*\n\nA tarefa \"{{taskTitle}}\" vence em {{timeRemaining}}.\n\nAcesse o BoardMD para gerenciar.",
    is_enabled: true,
    variables: ["taskTitle", "timeRemaining"],
    send_time: "",
    send_time_2: "",
    due_date_hours_before: 24,
    due_date_hours_before_2: 2,
    excluded_column_ids: [],
  },
  {
    template_type: "daily_reminder",
    label: "📋 Resumo Diário",
    message_template: "📋 *Resumo do Dia*\n\n📌 *Tarefas pendentes ({{pendingTasks}}):*\n{{tasksList}}\n\n⚠️ *Tarefas atrasadas:*\n{{overdueList}}\n\nBom trabalho! 💪",
    is_enabled: true,
    variables: ["pendingTasks", "tasksList", "overdueText", "overdueList"],
    send_time: "08:00",
    excluded_column_ids: [],
  },
  {
    template_type: "daily_report",
    label: "📊 Relatório Diário",
    message_template: "📊 *Relatório do Dia*\n\n✅ Concluídas: {{completedToday}}/{{totalTasks}} ({{completionPercent}}%)\n{{progressBar}}\n\n📋 *Pendentes ({{pendingTasks}}):*\n{{pendingList}}\n\n⚠️ *Atrasadas:*\n{{overdueList}}\n\nAté amanhã! 🌙",
    is_enabled: true,
    variables: ["completedToday", "totalTasks", "completionPercent", "pendingTasks", "overdueText", "progressBar", "pendingList", "overdueList"],
    send_time: "23:00",
    excluded_column_ids: [],
  },
  {
    template_type: "daily_motivation",
    label: "🌅 Bom Dia Motivacional",
    message_template: "☀️ *Bom dia!*\n\n💡 *Frase do dia:*\n{{motivationalQuote}}\n\n📖 *Palavra de Deus:*\n{{bibleQuote}}\n\nTenha um ótimo dia! 🙏",
    is_enabled: false,
    variables: ["motivationalQuote", "bibleQuote"],
    send_time: "07:00",
    excluded_column_ids: [],
  },
  {
    template_type: "weekly_summary",
    label: "📅 Resumo Semanal",
    message_template: "📅 *Resumo da Semana*\n\n✅ Concluídas: {{completedWeek}} tarefas\n📋 Pendentes: {{pendingTasks}}\n🔥 Sequência: {{streak}} dias\n📁 Categoria mais ativa: {{topCategory}}\n\nNova semana, novas conquistas! 🚀",
    is_enabled: false,
    variables: ["completedWeek", "pendingTasks", "streak", "topCategory"],
    send_time: "09:00",
    send_time_2: "1",
    excluded_column_ids: [],
  },
  {
    template_type: "task_completed",
    label: "✅ Tarefa Concluída",
    message_template: "🎉 *Parabéns!*\n\nVocê concluiu \"{{taskTitle}}\"!\nJá são {{completedCount}} tarefas hoje. Restam {{pendingCount}} pendentes.\n\nContinue assim! 💪",
    is_enabled: false,
    variables: ["taskTitle", "completedCount", "pendingCount"],
    send_time: "",
    excluded_column_ids: [],
  },
  {
    template_type: "task_overdue",
    label: "🚨 Tarefa Atrasada",
    message_template: "🚨 *Atenção!*\n\nA tarefa \"{{taskTitle}}\" está atrasada há {{overdueTime}}.\nVocê tem {{totalOverdue}} tarefa(s) atrasada(s) no total.\n\nAcesse o BoardMD para resolver.",
    is_enabled: false,
    variables: ["taskTitle", "overdueTime", "totalOverdue"],
    send_time: "",
    excluded_column_ids: [],
  },
  {
    template_type: "goal_reached",
    label: "🏆 Meta Atingida",
    message_template: "🏆 *Meta Atingida!*\n\n\"{{goalTitle}}\" - {{target}} tarefas no período {{period}}.\n\nVocê é incrível! 🎉",
    is_enabled: false,
    variables: ["goalTitle", "target", "period"],
    send_time: "",
    excluded_column_ids: [],
  },
  {
    template_type: "pomodoro",
    label: "🍅 Pomodoro",
    message_template: "🍅 *Pomodoro {{sessionType}}*\n\n{{message}}\n\nContinue focado!",
    is_enabled: false,
    variables: ["sessionType", "message"],
    send_time: "",
    excluded_column_ids: [],
  },
  {
    template_type: "achievement",
    label: "🏅 Conquista",
    message_template: "🏆 *Nova Conquista!*\n\n{{achievementTitle}}\n+{{points}} pontos\n\nParabéns! 🎉",
    is_enabled: false,
    variables: ["achievementTitle", "points"],
    send_time: "",
    excluded_column_ids: [],
  },
];

export function WhatsAppTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadTemplates();
    loadColumns();
  }, [user]);

  const loadColumns = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("columns")
      .select("id, name")
      .eq("user_id", user.id)
      .order("position");
    if (data) setColumns(data);
  };

  const loadTemplates = async () => {
    if (!user) return;
    setIsLoading(true);

    const { data } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("user_id", user.id);

    if (data && data.length > 0) {
      const merged = DEFAULT_TEMPLATES.map((def) => {
        const saved = data.find((d: any) => d.template_type === def.template_type);
        return {
          ...def,
          id: saved?.id,
          message_template: saved?.message_template || def.message_template,
          is_enabled: saved?.is_enabled ?? def.is_enabled,
          send_time: saved?.send_time ? (saved.send_time as string).slice(0, 5) : def.send_time,
          send_time_2: saved?.send_time_2 ? (saved.send_time_2 as string).slice(0, 5) : (def.send_time_2 || ""),
          due_date_hours_before: (saved as any)?.due_date_hours_before ?? def.due_date_hours_before,
          due_date_hours_before_2: (saved as any)?.due_date_hours_before_2 ?? def.due_date_hours_before_2,
          excluded_column_ids: (saved as any)?.excluded_column_ids || def.excluded_column_ids || [],
        };
      });
      setTemplates(merged);
    } else {
      setTemplates(DEFAULT_TEMPLATES.map((t) => ({ ...t })));
    }

    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      for (const tpl of templates) {
        const payload: any = {
          message_template: tpl.message_template,
          is_enabled: tpl.is_enabled,
          send_time: tpl.send_time ? tpl.send_time + ":00" : null,
          send_time_2: tpl.send_time_2 ? tpl.send_time_2 + (tpl.template_type === "weekly_summary" ? "" : ":00") : null,
          due_date_hours_before: tpl.due_date_hours_before ?? 24,
          due_date_hours_before_2: tpl.due_date_hours_before_2 ?? null,
          excluded_column_ids: tpl.excluded_column_ids || [],
        };

        // For weekly_summary, store weekday in send_time_2
        if (tpl.template_type === "weekly_summary") {
          payload.send_time_2 = tpl.send_time_2 || null;
        }

        if (tpl.id) {
          await supabase.from("whatsapp_templates").update(payload).eq("id", tpl.id);
        } else {
          await supabase.from("whatsapp_templates").insert({
            user_id: user.id,
            template_type: tpl.template_type,
            ...payload,
          });
        }
      }
      toast.success("Templates salvos!");
      await loadTemplates();
    } catch {
      toast.error("Erro ao salvar templates");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTemplates(DEFAULT_TEMPLATES.map((t) => ({ ...t })));
    toast.info("Templates restaurados para o padrão");
  };

  const handleSendTest = async (tpl: Template) => {
    if (!user) return;
    setSendingTest(tpl.template_type);

    try {
      const { data: config } = await supabase
        .from("whatsapp_config")
        .select("phone_number, is_connected")
        .eq("user_id", user.id)
        .single();

      if (!config?.is_connected) {
        toast.error("WhatsApp não está conectado.");
        return;
      }
      if (!config?.phone_number) {
        toast.error("Nenhum número configurado.");
        return;
      }

      const sampleVars: Record<string, string> = {
        taskTitle: "Tarefa de Exemplo",
        timeRemaining: "2 horas",
        pendingTasks: "5",
        overdueText: "⚠️ 2 tarefa(s) atrasada(s)",
        sessionType: "Foco",
        message: "Hora de voltar ao trabalho!",
        achievementTitle: "Mestre da Produtividade",
        points: "100",
        completedToday: "8",
        totalTasks: "12",
        completionPercent: "67",
        progressBar: "▓▓▓▓▓▓▓░░░ 67%",
        completedCount: "3",
        pendingCount: "7",
        completedWeek: "22",
        streak: "5",
        topCategory: "Trabalho",
        topPriority: "Finalizar relatório",
        goalTitle: "Meta Semanal",
        target: "10",
        period: "semanal",
        overdueTime: "3 horas",
        totalOverdue: "2",
        tasksList: "• Finalizar relatório | Vence: 11/02 14:00\n• Reunião equipe | Vence: 12/02 09:00\n• Revisar documentação | Sem prazo",
        overdueList: "• Enviar proposta | Desde: 09/02 18:00\n• Atualizar planilha | Desde: 10/02 10:00",
        pendingList: "🔴 Tarefa urgente | Vence: 12/02\n🟡 Tarefa média | Vence: 13/02\n🟢 Tarefa baixa | Sem prazo",
        motivationalQuote: "\"A educação é a arma mais poderosa que você pode usar para mudar o mundo.\"\n— Nelson Mandela",
        bibleQuote: "\"Tudo posso naquele que me fortalece.\"\nFilipenses 4:13",
      };

      let message = tpl.message_template;
      for (const [key, value] of Object.entries(sampleVars)) {
        message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      }

      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { user_id: user.id, phone_number: config.phone_number, message, template_type: `test_${tpl.template_type}` },
      });

      if (error) throw error;
      if (data?.success) {
        toast.success(`Teste "${tpl.label}" enviado!`);
      } else {
        toast.error("Falha: " + (data?.error || "Erro desconhecido"));
      }
    } catch (e: any) {
      toast.error("Erro: " + (e.message || "Erro desconhecido"));
    } finally {
      setSendingTest(null);
    }
  };

  const updateTemplate = (index: number, field: keyof Template, value: any) => {
    setTemplates((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const toggleColumnExclusion = (index: number, columnId: string) => {
    setTemplates((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t;
        const excluded = t.excluded_column_ids || [];
        const next = excluded.includes(columnId)
          ? excluded.filter((id) => id !== columnId)
          : [...excluded, columnId];
        return { ...t, excluded_column_ids: next };
      })
    );
  };

  const getExclusionSummary = (tpl: Template) => {
    if (!tpl.excluded_column_ids?.length) return "Enviando para todas as colunas";
    const names = tpl.excluded_column_ids
      .map((id) => columns.find((c) => c.id === id)?.name)
      .filter(Boolean);
    return `Excluindo: ${names.join(", ")}`;
  };

  const isEventTemplate = (type: string) => EVENT_TEMPLATES.includes(type);
  const isFixedTimeTemplate = (type: string) => FIXED_TIME_TEMPLATES.includes(type);
  const isDynamicTemplate = (type: string) => DYNAMIC_TEMPLATES.includes(type);
  const isCronEventTemplate = (type: string) => CRON_EVENT_TEMPLATES.includes(type);
  const hasColumnFilter = (type: string) => COLUMN_FILTER_TEMPLATES.includes(type);

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Carregando templates...</div>;
  }

  return (
    <div className="space-y-4">
      {templates.map((tpl, idx) => (
        <Card key={tpl.template_type}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{tpl.label}</CardTitle>
              <Switch checked={tpl.is_enabled} onCheckedChange={(v) => updateTemplate(idx, "is_enabled", v)} />
            </div>
            <CardDescription className="text-xs">
              Variáveis: {tpl.variables.map((v) => `{{${v}}}`).join(", ")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={tpl.message_template}
              onChange={(e) => updateTemplate(idx, "message_template", e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />

            <div className="flex items-center gap-4 flex-wrap">
              {/* Event templates - no time picker */}
              {(isEventTemplate(tpl.template_type) || isCronEventTemplate(tpl.template_type)) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5">
                  <Zap className="h-4 w-4" />
                  <span>Disparado automaticamente por evento</span>
                </div>
              )}

              {/* Fixed time templates - time picker */}
              {isFixedTimeTemplate(tpl.template_type) && tpl.template_type !== "weekly_summary" && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm text-muted-foreground">Horário:</Label>
                  <Input
                    type="time"
                    value={tpl.send_time}
                    onChange={(e) => updateTemplate(idx, "send_time", e.target.value)}
                    className="w-28 h-8 text-sm"
                  />
                </div>
              )}

              {/* Weekly summary - time picker + day of week */}
              {tpl.template_type === "weekly_summary" && (
                <>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm text-muted-foreground">Horário:</Label>
                    <Input
                      type="time"
                      value={tpl.send_time}
                      onChange={(e) => updateTemplate(idx, "send_time", e.target.value)}
                      className="w-28 h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Dia:</Label>
                    <Select
                      value={tpl.send_time_2 || "1"}
                      onValueChange={(v) => updateTemplate(idx, "send_time_2", v)}
                    >
                      <SelectTrigger className="w-40 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Due date template - hours before */}
              {isDynamicTemplate(tpl.template_type) && (
                <>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm text-muted-foreground">1º Alerta:</Label>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={tpl.due_date_hours_before ?? 24}
                      onChange={(e) => updateTemplate(idx, "due_date_hours_before", parseInt(e.target.value) || 24)}
                      className="w-20 h-8 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">horas antes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm text-muted-foreground">2º Alerta:</Label>
                    <Input
                      type="number"
                      min={0}
                      max={168}
                      value={tpl.due_date_hours_before_2 ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        updateTemplate(idx, "due_date_hours_before_2", val);
                      }}
                      placeholder="Opcional"
                      className="w-20 h-8 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">horas antes</span>
                  </div>
                </>
              )}
            </div>

            {/* Column exclusion selector */}
            {hasColumnFilter(tpl.template_type) && columns.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground h-8">
                    <span className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5" />
                      {getExclusionSummary(tpl)}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="grid grid-cols-2 gap-2 p-2 border rounded-md">
                    {columns.map((col) => (
                      <label key={col.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={tpl.excluded_column_ids?.includes(col.id) || false}
                          onCheckedChange={() => toggleColumnExclusion(idx, col.id)}
                        />
                        <span className="truncate">{col.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Marque as colunas que deseja <strong>excluir</strong> do envio.</p>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSendTest(tpl)}
                disabled={sendingTest === tpl.template_type}
              >
                {sendingTest === tpl.template_type ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Teste
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Templates
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Padrão
        </Button>
      </div>
    </div>
  );
}
