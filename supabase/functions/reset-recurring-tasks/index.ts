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
 * - Cálculo usa DATA ATUAL como base, NÃO a data original
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

/**
 * CÓPIA LOCAL de calculateNextRecurrenceDate
 * @see src/lib/recurrenceUtils.ts para documentação completa
 * 
 * IMPORTANTE: Manter sincronizado com a versão em recurrenceUtils.ts!
 */
function calculateNextRecurrenceDate(
  currentDueDate: string | null,
  recurrenceRule: RecurrenceRule | null
): string {
  const now = new Date();

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
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
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

    let processed = 0;
    let errors = 0;
    const processedMirrors = new Set<string>();

    for (const task of tasks as Task[]) {
      try {
        // Calcular próxima data de recorrência
        const nextDueDate = calculateNextRecurrenceDate(
          task.due_date,
          task.recurrence_rule
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
