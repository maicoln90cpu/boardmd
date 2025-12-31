import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[cleanup-old-logs] Iniciando limpeza de logs antigos...");

  try {
    // Inicializar cliente Supabase com service role para operações admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[cleanup-old-logs] Variáveis de ambiente não configuradas");
      throw new Error("Configuração do Supabase incompleta");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calcular datas de corte
    const now = new Date();
    
    // push_logs: manter últimos 30 dias
    const pushLogsThreshold = new Date(now);
    pushLogsThreshold.setDate(pushLogsThreshold.getDate() - 30);
    const pushLogsThresholdISO = pushLogsThreshold.toISOString();

    // task_history: manter últimos 90 dias
    const taskHistoryThreshold = new Date(now);
    taskHistoryThreshold.setDate(taskHistoryThreshold.getDate() - 90);
    const taskHistoryThresholdISO = taskHistoryThreshold.toISOString();

    // activity_log: manter últimos 60 dias
    const activityLogThreshold = new Date(now);
    activityLogThreshold.setDate(activityLogThreshold.getDate() - 60);
    const activityLogThresholdISO = activityLogThreshold.toISOString();

    console.log("[cleanup-old-logs] Thresholds:", {
      push_logs: pushLogsThresholdISO,
      task_history: taskHistoryThresholdISO,
      activity_log: activityLogThresholdISO,
    });

    // Limpar push_logs (mais de 30 dias)
    const { error: pushLogsError } = await supabase
      .from("push_logs")
      .delete()
      .lt("timestamp", pushLogsThresholdISO);

    if (pushLogsError) {
      console.error("[cleanup-old-logs] Erro ao limpar push_logs:", pushLogsError);
    } else {
      console.log("[cleanup-old-logs] push_logs: registros antigos removidos");
    }

    // Limpar task_history (mais de 90 dias)
    const { error: taskHistoryError } = await supabase
      .from("task_history")
      .delete()
      .lt("created_at", taskHistoryThresholdISO);

    if (taskHistoryError) {
      console.error("[cleanup-old-logs] Erro ao limpar task_history:", taskHistoryError);
    } else {
      console.log("[cleanup-old-logs] task_history: registros antigos removidos");
    }

    // Limpar activity_log (mais de 60 dias)
    const { error: activityLogError } = await supabase
      .from("activity_log")
      .delete()
      .lt("created_at", activityLogThresholdISO);

    if (activityLogError) {
      console.error("[cleanup-old-logs] Erro ao limpar activity_log:", activityLogError);
    } else {
      console.log("[cleanup-old-logs] activity_log: registros antigos removidos");
    }

    const summary = {
      success: true,
      cleaned: {
        push_logs: !pushLogsError,
        task_history: !taskHistoryError,
        activity_log: !activityLogError,
      },
      thresholds: {
        push_logs_days: 30,
        task_history_days: 90,
        activity_log_days: 60,
      },
      timestamp: now.toISOString(),
    };

    console.log("[cleanup-old-logs] Limpeza concluída:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[cleanup-old-logs] Erro crítico:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
