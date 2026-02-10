import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw, Send, Loader2, Clock } from "lucide-react";
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
}

const DEFAULT_TEMPLATES: Omit<Template, "id">[] = [
  {
    template_type: "due_date",
    label: "Tarefa Vencendo",
    message_template: "⏰ *Alerta de Prazo*\n\nA tarefa \"{{taskTitle}}\" vence em {{timeRemaining}}.\n\nAcesse o BoardMD para gerenciar.",
    is_enabled: true,
    variables: ["taskTitle", "timeRemaining"],
    send_time: "08:00",
  },
  {
    template_type: "daily_reminder",
    label: "Resumo Diário",
    message_template: "📋 *Resumo do Dia*\n\nVocê tem {{pendingTasks}} tarefa(s) pendente(s).\n{{overdueText}}\n\nBom trabalho! 💪",
    is_enabled: true,
    variables: ["pendingTasks", "overdueText"],
    send_time: "07:00",
  },
  {
    template_type: "pomodoro",
    label: "Pomodoro",
    message_template: "🍅 *Pomodoro {{sessionType}}*\n\n{{message}}\n\nContinue focado!",
    is_enabled: false,
    variables: ["sessionType", "message"],
    send_time: "09:00",
  },
  {
    template_type: "achievement",
    label: "Conquista",
    message_template: "🏆 *Nova Conquista!*\n\n{{achievementTitle}}\n+{{points}} pontos\n\nParabéns! 🎉",
    is_enabled: false,
    variables: ["achievementTitle", "points"],
    send_time: "18:00",
  },
];

export function WhatsAppTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadTemplates();
  }, [user]);

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
        const payload = {
          message_template: tpl.message_template,
          is_enabled: tpl.is_enabled,
          send_time: tpl.send_time + ":00",
        };

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
      // Get user's WhatsApp config for phone number
      const { data: config } = await supabase
        .from("whatsapp_config")
        .select("phone_number, is_connected")
        .eq("user_id", user.id)
        .single();

      if (!config?.is_connected) {
        toast.error("WhatsApp não está conectado. Conecte primeiro na aba Conexão.");
        return;
      }

      if (!config?.phone_number) {
        toast.error("Nenhum número de telefone configurado no WhatsApp.");
        return;
      }

      // Replace variables with sample values
      const sampleVars: Record<string, string> = {
        taskTitle: "Tarefa de Exemplo",
        timeRemaining: "2 horas",
        pendingTasks: "5",
        overdueText: "⚠️ 2 tarefa(s) atrasada(s)",
        sessionType: "Foco",
        message: "Hora de voltar ao trabalho!",
        achievementTitle: "Mestre da Produtividade",
        points: "100",
      };

      let message = tpl.message_template;
      for (const [key, value] of Object.entries(sampleVars)) {
        message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      }

      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          user_id: user.id,
          phone_number: config.phone_number,
          message,
          template_type: `test_${tpl.template_type}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Teste "${tpl.label}" enviado!`);
      } else {
        toast.error("Falha ao enviar teste: " + (data?.error || "Erro desconhecido"));
      }
    } catch (e: any) {
      toast.error("Erro ao enviar teste: " + (e.message || "Erro desconhecido"));
    } finally {
      setSendingTest(null);
    }
  };

  const updateTemplate = (index: number, field: keyof Template, value: string | boolean) => {
    setTemplates((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

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
              <Switch
                checked={tpl.is_enabled}
                onCheckedChange={(v) => updateTemplate(idx, "is_enabled", v)}
              />
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

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm text-muted-foreground">Horário de envio:</Label>
                <Input
                  type="time"
                  value={tpl.send_time}
                  onChange={(e) => updateTemplate(idx, "send_time", e.target.value)}
                  className="w-28 h-8 text-sm"
                />
              </div>

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
