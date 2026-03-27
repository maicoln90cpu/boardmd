import { handleCors } from '../_shared/cors.ts';
import { json, error } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('cleanup-old-logs');

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  log.info("Iniciando limpeza de logs antigos...");

  try {
    const supabase = createAdminClient();
    const now = new Date();

    // push_logs: keep last 30 days
    const pushLogsThreshold = new Date(now);
    pushLogsThreshold.setDate(pushLogsThreshold.getDate() - 30);

    // task_history: keep last 90 days
    const taskHistoryThreshold = new Date(now);
    taskHistoryThreshold.setDate(taskHistoryThreshold.getDate() - 90);

    // activity_log: keep last 60 days
    const activityLogThreshold = new Date(now);
    activityLogThreshold.setDate(activityLogThreshold.getDate() - 60);

    log.info("Thresholds:", {
      push_logs: pushLogsThreshold.toISOString(),
      task_history: taskHistoryThreshold.toISOString(),
      activity_log: activityLogThreshold.toISOString(),
    });

    const { error: pushLogsError } = await supabase
      .from("push_logs").delete().lt("timestamp", pushLogsThreshold.toISOString());
    if (pushLogsError) log.error("Erro ao limpar push_logs:", pushLogsError);

    const { error: taskHistoryError } = await supabase
      .from("task_history").delete().lt("created_at", taskHistoryThreshold.toISOString());
    if (taskHistoryError) log.error("Erro ao limpar task_history:", taskHistoryError);

    const { error: activityLogError } = await supabase
      .from("activity_log").delete().lt("created_at", activityLogThreshold.toISOString());
    if (activityLogError) log.error("Erro ao limpar activity_log:", activityLogError);

    const summary = {
      success: true,
      cleaned: { push_logs: !pushLogsError, task_history: !taskHistoryError, activity_log: !activityLogError },
      thresholds: { push_logs_days: 30, task_history_days: 90, activity_log_days: 60 },
      timestamp: now.toISOString(),
    };

    log.info("Limpeza concluída:", summary);
    return json(summary);
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("Erro crítico:", err);
    return error(err instanceof Error ? err.message : "Erro desconhecido", 500);
  }
});
