import { handleCors } from '../_shared/cors.ts';
import { json, error } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('reset-recurring-tasks');

interface RecurrenceRule {
  frequency?: "daily" | "weekly" | "monthly";
  interval?: number;
  weekday?: number;
  weekdays?: number[];
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

function getNowInUserTimezone(timezone: string): Date {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const getValue = (type: string) => parts.find(p => p.type === type)?.value || '0';
    return new Date(parseInt(getValue('year')), parseInt(getValue('month')) - 1, parseInt(getValue('day')),
      parseInt(getValue('hour')), parseInt(getValue('minute')), parseInt(getValue('second')));
  } catch {
    log.error(`Erro ao converter timezone ${timezone}, usando UTC`);
    return now;
  }
}

function calculateNextRecurrenceDate(currentDueDate: string | null, recurrenceRule: RecurrenceRule | null, userTimezone = "America/Sao_Paulo"): string {
  const now = getNowInUserTimezone(userTimezone);
  if (!currentDueDate) return now.toISOString();

  const baseDate = new Date(currentDueDate);
  const hours = baseDate.getUTCHours(), minutes = baseDate.getUTCMinutes(), seconds = baseDate.getUTCSeconds();
  const createDateWithTime = (date: Date): string =>
    new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, seconds)).toISOString();

  if (!recurrenceRule || typeof recurrenceRule !== "object") return createDateWithTime(now);

  const weekdays = recurrenceRule.weekdays ||
    (recurrenceRule.weekday !== undefined && recurrenceRule.weekday !== null ? [recurrenceRule.weekday] : null);

  if (weekdays && weekdays.length > 0) {
    const currentDay = now.getDay();
    const sortedDays = [...weekdays].sort((a, b) => a - b);
    let nextDay = sortedDays.find(d => d > currentDay);
    let daysToAdd = nextDay !== undefined ? nextDay - currentDay : 7 - currentDay + sortedDays[0];
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    return createDateWithTime(nextDate);
  }

  const frequency = recurrenceRule.frequency || "daily";
  const interval = recurrenceRule.interval || 1;
  const nextDate = new Date(now);

  switch (frequency) {
    case "daily": nextDate.setDate(nextDate.getDate() + interval); break;
    case "weekly": nextDate.setDate(nextDate.getDate() + 7 * interval); break;
    case "monthly": nextDate.setMonth(nextDate.getMonth() + interval); break;
    default: nextDate.setDate(nextDate.getDate() + 1);
  }

  return createDateWithTime(nextDate);
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    log.info("Iniciando reset automático (apenas tarefas completadas com recurrence_rule)");
    const supabase = createAdminClient();

    // Buscar APENAS tarefas recorrentes completadas
    const { data: completedData, error: fetchError } = await supabase.from("tasks")
      .select("id, user_id, title, due_date, is_completed, recurrence_rule, mirror_task_id")
      .eq("is_completed", true)
      .not("recurrence_rule", "is", null);

    if (fetchError) { log.error("Erro fetch completadas:", fetchError); throw fetchError; }

    const tasks = (completedData || []) as Task[];
    log.info(`Encontradas ${tasks.length} tarefas recorrentes completadas para processar`);

    if (tasks.length === 0) {
      return json({ success: true, message: "Nenhuma tarefa recorrente para processar", processed: 0 });
    }

    const userIds = [...new Set(tasks.map(t => t.user_id))];
    const { data: userSettingsData } = await supabase
      .from("user_settings").select("user_id, settings").in("user_id", userIds);

    const userTimezones = new Map<string, string>();
    if (userSettingsData) {
      for (const setting of userSettingsData) {
        userTimezones.set(setting.user_id, (setting.settings as any)?.timezone || "America/Sao_Paulo");
      }
    }

    let processed = 0, errors = 0;
    const processedMirrors = new Set<string>();

    for (const task of tasks) {
      try {
        const userTimezone = userTimezones.get(task.user_id) || "America/Sao_Paulo";
        const nextDueDate = calculateNextRecurrenceDate(task.due_date, task.recurrence_rule, userTimezone);

        const updatePayload: Record<string, unknown> = {
          due_date: nextDueDate,
          updated_at: new Date().toISOString(),
        };
        // Só reseta is_completed se estava completada
        if (task.is_completed) {
          updatePayload.is_completed = false;
        }

        const { error: updateError } = await supabase.from("tasks")
          .update(updatePayload)
          .eq("id", task.id);

        if (updateError) { log.error(`Erro tarefa ${task.id}:`, updateError); errors++; continue; }
        processed++;

        if (task.mirror_task_id && !processedMirrors.has(task.mirror_task_id)) {
          await supabase.from("tasks")
            .update({ is_completed: false, due_date: nextDueDate, updated_at: new Date().toISOString() })
            .eq("id", task.mirror_task_id);
          processedMirrors.add(task.mirror_task_id);
        }

        const { data: reverseMirrors } = await supabase.from("tasks")
          .select("id").eq("mirror_task_id", task.id).neq("id", task.id);

        if (reverseMirrors) {
          for (const mirror of reverseMirrors) {
            if (!processedMirrors.has(mirror.id)) {
              await supabase.from("tasks")
                .update({ is_completed: false, due_date: nextDueDate, updated_at: new Date().toISOString() })
                .eq("id", mirror.id);
              processedMirrors.add(mirror.id);
            }
          }
        }
      } catch (taskError) { log.error(`Erro processando tarefa ${task.id}:`, taskError); errors++; }
    }

    const result = { success: true, message: "Reset automático concluído", processed, mirrors: processedMirrors.size, errors, timestamp: new Date().toISOString() };
    log.info("Resultado:", result);
    return json(result);
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("Erro geral:", err);
    return error(err instanceof Error ? err.message : "Erro desconhecido", 500);
  }
});
