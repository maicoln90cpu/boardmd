import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw } from "lucide-react";
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
}

const DEFAULT_TEMPLATES: Omit<Template, "id">[] = [
  {
    template_type: "due_date",
    label: "Tarefa Vencendo",
    message_template: "⏰ *Alerta de Prazo*\n\nA tarefa \"{{taskTitle}}\" vence em {{timeRemaining}}.\n\nAcesse o BoardMD para gerenciar.",
    is_enabled: true,
    variables: ["taskTitle", "timeRemaining"],
  },
  {
    template_type: "daily_reminder",
    label: "Resumo Diário",
    message_template: "📋 *Resumo do Dia*\n\nVocê tem {{pendingTasks}} tarefa(s) pendente(s).\n{{overdueText}}\n\nBom trabalho! 💪",
    is_enabled: true,
    variables: ["pendingTasks", "overdueText"],
  },
  {
    template_type: "pomodoro",
    label: "Pomodoro",
    message_template: "🍅 *Pomodoro {{sessionType}}*\n\n{{message}}\n\nContinue focado!",
    is_enabled: false,
    variables: ["sessionType", "message"],
  },
  {
    template_type: "achievement",
    label: "Conquista",
    message_template: "🏆 *Nova Conquista!*\n\n{{achievementTitle}}\n+{{points}} pontos\n\nParabéns! 🎉",
    is_enabled: false,
    variables: ["achievementTitle", "points"],
  },
];

export function WhatsAppTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      // Merge with defaults for labels/variables
      const merged = DEFAULT_TEMPLATES.map((def) => {
        const saved = data.find((d) => d.template_type === def.template_type);
        return {
          ...def,
          id: saved?.id,
          message_template: saved?.message_template || def.message_template,
          is_enabled: saved?.is_enabled ?? def.is_enabled,
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
        if (tpl.id) {
          await supabase.from("whatsapp_templates").update({
            message_template: tpl.message_template,
            is_enabled: tpl.is_enabled,
          }).eq("id", tpl.id);
        } else {
          await supabase.from("whatsapp_templates").insert({
            user_id: user.id,
            template_type: tpl.template_type,
            message_template: tpl.message_template,
            is_enabled: tpl.is_enabled,
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
          <CardContent>
            <Textarea
              value={tpl.message_template}
              onChange={(e) => updateTemplate(idx, "message_template", e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
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
