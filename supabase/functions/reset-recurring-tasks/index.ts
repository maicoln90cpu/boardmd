/**
 * ============================================================================
 * EDGE FUNCTION: RESET AUTOMÁTICO DE TAREFAS RECORRENTES (CRON JOB 23:59h)
 * ============================================================================
 * 
 * Esta função é executada automaticamente às 23:59h (02:59 UTC) via pg_cron.
 * 
 * IMPORTANTE: Esta função contém uma CÓPIA LOCAL de calculateNextRecurrenceDate
 * porque Edge Functions não podem importar de src/. Ao modificar a lógica de
 * recorrência, ATUALIZE TAMBÉM: src/lib/recurrenceUtils.ts
 * 
 * REGRAS DE NEGÓCIO:
 * - APENAS tarefas com is_completed === true são resetadas
 * - Cálculo usa DATA ATUAL no TIMEZONE DO USUÁRIO como base
 * - Horário original é PRESERVADO
 * - Sincronização bidirecional: atualiza mirror_task_id + reverse mirrors
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecurrenceRule {
  frequency?: "daily" | "weekly" | "monthly";
  interval?: number;
  weekday?: number;
}

interface Task {
  id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  is_completed: boolean;
  recurrence_rule: RecurrenceRule | null;
  mirror_task_id: string | null;
}

interface UserSettings {
  timezone?: string;
}

/**
 * Obtém a data/hora atual no timezone do usuário
 * @param timezone - IANA timezone string (ex: "America/Sao_Paulo")
 * @returns Date object representando "agora" no timezone do usuário
 */
function getNowInUserTimezone(timezone: string): Date {
  const now = new Date();
  
  try {
    // Formatar a data atual no timezone do usuário
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(now);
    const getValue = (type: string) => parts.find(p => p.type === type)?.value || '0';
    
    // Criar uma nova data com os componentes no timezone do usuário
    const year = parseInt(getValue('year'));
    const month = parseInt(getValue('month')) - 1; // JS months are 0-indexed
    const day = parseInt(getValue('day'));
    const hour = parseInt(getValue('hour'));
    const minute = parseInt(getValue('minute'));
    const second = parseInt(getValue('second'));
    
    // Retornar como Date local (será usada para cálculo de próxima recorrência)
    return new Date(year, month, day, hour, minute, second);
  } catch (error) {
    console.error(`[reset-recurring-tasks] Erro ao converter timezone ${timezone}, usando UTC:`, error);
    return now;
  }
}

/**
 * CÓPIA LOCAL de calculateNextRecurrenceDate
 * @see src/lib/recurrenceUtils.ts para documentação completa
 * 
 * IMPORTANTE: Manter sincronizado com a versão em recurrenceUtils.ts!
 * 
 * @param currentDueDate - Data de vencimento atual
 * @param recurrenceRule - Regra de recorrência
 * @param userTimezone - Timezone do usuário para cálculo correto
 */
function calculateNextRecurrenceDate(
  currentDueDate: string | null,
  recurrenceRule: RecurrenceRule | null,
  userTimezone: string = "America/Sao_Paulo"
): string {
  // Usar a data atual no timezone do usuário
  const now = getNowInUserTimezone(userTimezone);
  
  console.log(`[calculateNextRecurrenceDate] Timezone: ${userTimezone}, Now local: ${now.toISOString()}`);

  // Sem due_date = retorna hoje
  if (!currentDueDate) {
    return now.toISOString();
  }

  // Extrair horário original para preservar
  const baseDate = new Date(currentDueDate);
  const hours = baseDate.getUTCHours();
  const minutes = baseDate.getUTCMinutes();
  const seconds = baseDate.getUTCSeconds();

  // Helper para criar data com horário original
  const createDateWithTime = (date: Date): string => {
    return new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        minutes,
        seconds
      )
    ).toISOString();
  };

  if (!recurrenceRule || typeof recurrenceRule !== "object") {
    return createDateWithTime(now);
  }

  // MODO 1: Por dia da semana específico
  if (recurrenceRule.weekday !== undefined && recurrenceRule.weekday !== null) {
    const targetDay = recurrenceRule.weekday;
    const nextDate = new Date(now);

    const currentDay = nextDate.getDay();
    let daysUntilTarget = targetDay - currentDay;

    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }

    nextDate.setDate(nextDate.getDate() + daysUntilTarget);
    return createDateWithTime(nextDate);
  }

  // MODO 2: Por frequência (daily/weekly/monthly)
  const frequency = recurrenceRule.frequency || "daily";
  const interval = recurrenceRule.interval || 1;
  const nextDate = new Date(now);

  switch (frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7 * interval);
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    default:
      nextDate.setDate(nextDate.getDate() + 1);
  }

  return createDateWithTime(nextDate);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[reset-recurring-tasks] Iniciando reset automático às 23:59h");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar todas as tarefas recorrentes completadas
    const { data: tasks, error: fetchError } = await supabase
      .from("tasks")
      .select("id, user_id, title, due_date, is_completed, recurrence_rule, mirror_task_id")
      .eq("is_completed", true)
      .not("recurrence_rule", "is", null);

    if (fetchError) {
      console.error("[reset-recurring-tasks] Erro ao buscar tarefas:", fetchError);
      throw fetchError;
    }

    console.log(`[reset-recurring-tasks] Encontradas ${tasks?.length || 0} tarefas recorrentes completadas`);

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhuma tarefa recorrente completada encontrada",
          processed: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar configurações de timezone de todos os usuários únicos
    const userIds = [...new Set(tasks.map((t: Task) => t.user_id))];
    const { data: userSettingsData } = await supabase
      .from("user_settings")
      .select("user_id, settings")
      .in("user_id", userIds);

    // Criar mapa de timezone por usuário
    const userTimezones = new Map<string, string>();
    if (userSettingsData) {
      for (const setting of userSettingsData) {
        const settings = setting.settings as UserSettings | null;
        const timezone = settings?.timezone || "America/Sao_Paulo";
        userTimezones.set(setting.user_id, timezone);
      }
    }

    console.log(`[reset-recurring-tasks] Timezones carregados para ${userTimezones.size} usuários`);

    let processed = 0;
    let errors = 0;
    const processedMirrors = new Set<string>();

    for (const task of tasks as Task[]) {
      try {
        // Obter timezone do usuário (default: America/Sao_Paulo)
        const userTimezone = userTimezones.get(task.user_id) || "America/Sao_Paulo";
        
        // Calcular próxima data de recorrência usando timezone do usuário
        const nextDueDate = calculateNextRecurrenceDate(
          task.due_date,
          task.recurrence_rule,
          userTimezone
        );

        console.log(
          `[reset-recurring-tasks] Tarefa "${task.title}": ${task.due_date} -> ${nextDueDate}`
        );

        // Atualizar tarefa principal
        const { error: updateError } = await supabase
          .from("tasks")
          .update({
            is_completed: false,
            due_date: nextDueDate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", task.id);

        if (updateError) {
          console.error(`[reset-recurring-tasks] Erro ao atualizar tarefa ${task.id}:`, updateError);
          errors++;
          continue;
        }

        processed++;

        // Atualizar tarefa espelhada se existir
        if (task.mirror_task_id && !processedMirrors.has(task.mirror_task_id)) {
          const { error: mirrorError } = await supabase
            .from("tasks")
            .update({
              is_completed: false,
              due_date: nextDueDate,
              updated_at: new Date().toISOString(),
            })
            .eq("id", task.mirror_task_id);

          if (mirrorError) {
            console.error(`[reset-recurring-tasks] Erro ao atualizar mirror ${task.mirror_task_id}:`, mirrorError);
          } else {
            processedMirrors.add(task.mirror_task_id);
            console.log(`[reset-recurring-tasks] Mirror ${task.mirror_task_id} atualizado`);
          }
        }

        // Buscar e atualizar tarefas que apontam para esta (link reverso)
        const { data: reverseMirrors } = await supabase
          .from("tasks")
          .select("id")
          .eq("mirror_task_id", task.id)
          .neq("id", task.id);

        if (reverseMirrors && reverseMirrors.length > 0) {
          for (const mirror of reverseMirrors) {
            if (!processedMirrors.has(mirror.id)) {
              const { error: reverseError } = await supabase
                .from("tasks")
                .update({
                  is_completed: false,
                  due_date: nextDueDate,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", mirror.id);

              if (!reverseError) {
                processedMirrors.add(mirror.id);
                console.log(`[reset-recurring-tasks] Reverse mirror ${mirror.id} atualizado`);
              }
            }
          }
        }
      } catch (taskError) {
        console.error(`[reset-recurring-tasks] Erro processando tarefa ${task.id}:`, taskError);
        errors++;
      }
    }

    const result = {
      success: true,
      message: `Reset automático concluído`,
      processed,
      mirrors: processedMirrors.size,
      errors,
      timestamp: new Date().toISOString(),
    };

    console.log("[reset-recurring-tasks] Resultado:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[reset-recurring-tasks] Erro geral:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
