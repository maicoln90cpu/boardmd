import { handleCors } from '../_shared/cors.ts';
import { json } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('health-check');

interface ModuleStatus {
  name: string;
  status: "healthy" | "degraded" | "critical";
  latency_ms: number;
  message: string;
  checked_at: string;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  log.info("Starting health check...");

  const supabase = createAdminClient();
  const modules: ModuleStatus[] = [];
  const now = new Date().toISOString();

  // Helper to check a table
  async function checkTable(name: string, table: string, severity: "critical" | "degraded") {
    const start = performance.now();
    try {
      const { count, error: err } = await supabase.from(table).select("*", { count: "exact", head: true });
      const latency = Math.round(performance.now() - start);
      if (err) {
        modules.push({ name, status: severity, latency_ms: latency, message: `Erro: ${err.message}`, checked_at: now });
      } else {
        modules.push({ name, status: latency < 500 ? "healthy" : "degraded", latency_ms: latency, message: `${count || 0} registros`, checked_at: now });
      }
    } catch {
      modules.push({ name, status: severity, latency_ms: Math.round(performance.now() - start), message: "Falha na conexão", checked_at: now });
    }
  }

  // Check Database + Tables
  const dbStart = performance.now();
  try {
    const { error: err } = await supabase.from("profiles").select("id").limit(1);
    const dbLatency = Math.round(performance.now() - dbStart);
    modules.push({
      name: "Database",
      status: err ? "critical" : (dbLatency < 500 ? "healthy" : "degraded"),
      latency_ms: dbLatency,
      message: err ? `Erro: ${err.message}` : (dbLatency < 500 ? "Conexão normal" : "Latência elevada"),
      checked_at: now,
    });
  } catch {
    modules.push({ name: "Database", status: "critical", latency_ms: Math.round(performance.now() - dbStart), message: "Falha na conexão", checked_at: now });
  }

  await checkTable("Tasks Module", "tasks", "critical");
  await checkTable("Notes Module", "notes", "critical");
  await checkTable("Push Notifications", "push_subscriptions", "degraded");
  await checkTable("Pomodoro Module", "pomodoro_sessions", "degraded");
  await checkTable("Gamification", "user_stats", "degraded");
  await checkTable("Authentication", "profiles", "critical");

  const summary = {
    total: modules.length,
    healthy: modules.filter(m => m.status === "healthy").length,
    degraded: modules.filter(m => m.status === "degraded").length,
    critical: modules.filter(m => m.status === "critical").length,
  };

  let overall_status: "healthy" | "degraded" | "critical" = "healthy";
  if (summary.critical > 0) overall_status = "critical";
  else if (summary.degraded > 0) overall_status = "degraded";

  // Proactive alerts for critical modules
  let alerts_sent = false;
  if (summary.critical > 0) {
    log.warn("Critical modules detected, sending alerts...");
    const criticalNames = modules.filter(m => m.status === "critical").map(m => m.name).join(", ");

    try {
      const { data: users } = await supabase.from("profiles").select("id").limit(10);
      if (users && users.length > 0) {
        const activityLogs = users.map(user => ({
          user_id: user.id,
          action: "health_alert",
          details: { type: "critical_modules", modules: criticalNames, summary, timestamp: now },
        }));
        await supabase.from("activity_log").insert(activityLogs);

        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("user_id")
          .in("user_id", users.map(u => u.id));

        if (subscriptions && subscriptions.length > 0) {
          const pushLogs = subscriptions.map(sub => ({
            user_id: sub.user_id,
            title: "⚠️ Alerta do Sistema",
            body: `Módulos críticos detectados: ${criticalNames}`,
            status: "pending",
            notification_type: "health_alert",
            data: { summary },
          }));
          await supabase.from("push_logs").insert(pushLogs);
          alerts_sent = true;
        }
      }
    } catch (alertError) {
      log.error("Error sending alerts:", alertError);
    }
  }

  log.info(`Completed: ${overall_status} (${summary.healthy}/${summary.total} healthy), alerts_sent: ${alerts_sent}`);

  return json({ overall_status, timestamp: now, modules, summary, alerts_sent });
});
