import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWhatsAppEdgeFunctions } from "@/hooks/useEdgeFunctions";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  WhatsAppTemplate,
  WhatsAppColumn,
  DEFAULT_TEMPLATES,
  AUTO_GENERATED_TEMPLATES,
  SAMPLE_VARIABLES,
} from "@/components/whatsapp/whatsappTemplateDefaults";

export function useWhatsAppTemplates() {
  const { user } = useAuth();
  const { sendWhatsApp, triggerDailySummary } = useWhatsAppEdgeFunctions();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [columns, setColumns] = useState<WhatsAppColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  const loadColumns = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("columns")
      .select("id, name")
      .eq("user_id", user.id)
      .order("position");
    if (data) setColumns(data);
  }, [user]);

  const loadTemplates = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const { data } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("user_id", user.id);

    if (data && data.length > 0) {
      const merged = DEFAULT_TEMPLATES.map((def) => {
        const saved = data.find(
          (d: Record<string, unknown>) => d.template_type === def.template_type
        );
        const useDefaultMessage = AUTO_GENERATED_TEMPLATES.includes(def.template_type);
        return {
          ...def,
          id: saved?.id as string | undefined,
          message_template: useDefaultMessage
            ? def.message_template
            : ((saved?.message_template as string) || def.message_template),
          is_enabled: (saved?.is_enabled as boolean) ?? def.is_enabled,
          send_time: saved?.send_time
            ? (saved.send_time as string).slice(0, 5)
            : def.send_time,
          send_time_2: saved?.send_time_2
            ? (saved.send_time_2 as string).slice(0, 5)
            : def.send_time_2 || "",
          due_date_hours_before:
            (saved?.due_date_hours_before as number) ?? def.due_date_hours_before,
          due_date_hours_before_2:
            (saved?.due_date_hours_before_2 as number) ?? def.due_date_hours_before_2,
          excluded_column_ids:
            (saved?.excluded_column_ids as string[]) || def.excluded_column_ids || [],
        };
      });
      setTemplates(merged);
    } else {
      setTemplates(DEFAULT_TEMPLATES.map((t) => ({ ...t })));
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadTemplates();
    loadColumns();
  }, [user, loadTemplates, loadColumns]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      for (const tpl of templates) {
        const payload: Record<string, unknown> = {
          message_template: tpl.message_template,
          is_enabled: tpl.is_enabled,
          send_time: tpl.send_time ? tpl.send_time + ":00" : null,
          send_time_2: tpl.send_time_2
            ? tpl.send_time_2 + (tpl.template_type === "weekly_summary" ? "" : ":00")
            : null,
          due_date_hours_before: tpl.due_date_hours_before ?? 24,
          due_date_hours_before_2: tpl.due_date_hours_before_2 ?? null,
          excluded_column_ids: tpl.excluded_column_ids || [],
        };

        if (tpl.template_type === "weekly_summary") {
          payload.send_time_2 = tpl.send_time_2 || null;
        }

        if (tpl.id) {
          await supabase.from("whatsapp_templates").update(payload).eq("id", tpl.id);
        } else {
          await supabase.from("whatsapp_templates").insert([{
            user_id: user.id,
            template_type: tpl.template_type,
            message_template: payload.message_template as string,
            is_enabled: payload.is_enabled as boolean,
            send_time: payload.send_time as string | null,
            send_time_2: payload.send_time_2 as string | null,
            due_date_hours_before: payload.due_date_hours_before as number,
            due_date_hours_before_2: payload.due_date_hours_before_2 as number | null,
            excluded_column_ids: payload.excluded_column_ids as string[],
          }]);
        }
      }
      toast.success("Templates salvos!");
      await loadTemplates();
    } catch {
      toast.error("Erro ao salvar templates");
    } finally {
      setIsSaving(false);
    }
  }, [user, templates, loadTemplates]);

  const handleReset = useCallback(() => {
    setTemplates(DEFAULT_TEMPLATES.map((t) => ({ ...t })));
    toast.info("Templates restaurados para o padrão");
  }, []);

  const handleSendTest = useCallback(
    async (tpl: WhatsAppTemplate) => {
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

        if (AUTO_GENERATED_TEMPLATES.includes(tpl.template_type)) {
          const { data, error } = await triggerDailySummary({
            force: true,
            type: tpl.template_type,
            user_id: user.id,
          });

          if (error) throw error;
          if (data?.success) {
            const sentCount = (data.results || []).filter(
              (r: unknown) => (r as Record<string, unknown>).sent
            ).length;
            toast.success(`Teste "${tpl.label}" enviado! (${sentCount} mensagem(ns))`);
          } else {
            toast.error("Falha: " + (data?.error || "Erro desconhecido"));
          }
        } else {
          let message = tpl.message_template;
          for (const [key, value] of Object.entries(SAMPLE_VARIABLES)) {
            message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
          }

          const { data, error } = await sendWhatsApp({
            user_id: user.id,
            phone_number: config.phone_number,
            message,
            template_type: `test_${tpl.template_type}`,
          });

          if (error) throw error;
          if (data?.success) {
            toast.success(`Teste "${tpl.label}" enviado!`);
          } else {
            toast.error("Falha: " + (data?.error || "Erro desconhecido"));
          }
        }
      } catch (e: unknown) {
        const err = e as Error;
        logger.error("[WhatsAppTemplates] sendTest error:", err);
        toast.error("Erro: " + (err.message || "Erro desconhecido"));
      } finally {
        setSendingTest(null);
      }
    },
    [user, sendWhatsApp, triggerDailySummary]
  );

  const updateTemplate = useCallback(
    (index: number, field: keyof WhatsAppTemplate, value: string | boolean | number | undefined) => {
      setTemplates((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
    },
    []
  );

  const toggleColumnExclusion = useCallback((index: number, columnId: string) => {
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
  }, []);

  return {
    templates,
    columns,
    isLoading,
    isSaving,
    sendingTest,
    handleSave,
    handleReset,
    handleSendTest,
    updateTemplate,
    toggleColumnExclusion,
  };
}
