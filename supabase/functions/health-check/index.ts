import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ModuleStatus {
  name: string;
  status: "healthy" | "degraded" | "critical";
  latency_ms: number;
  message: string;
  checked_at: string;
}

interface HealthCheckResponse {
  overall_status: "healthy" | "degraded" | "critical";
  timestamp: string;
  modules: ModuleStatus[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    critical: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[health-check] Starting health check...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const modules: ModuleStatus[] = [];
  const now = new Date().toISOString();

  // 1. Check Database Connection
  const dbStart = performance.now();
  try {
    const { data, error } = await supabase.from("profiles").select("id").limit(1);
    const dbLatency = Math.round(performance.now() - dbStart);
    
    if (error) {
      console.error("[health-check] Database error:", error.message);
      modules.push({
        name: "Database",
        status: "critical",
        latency_ms: dbLatency,
        message: `Erro: ${error.message}`,
        checked_at: now,
      });
    } else {
      modules.push({
        name: "Database",
        status: dbLatency < 500 ? "healthy" : "degraded",
        latency_ms: dbLatency,
        message: dbLatency < 500 ? "Conexão normal" : "Latência elevada",
        checked_at: now,
      });
    }
  } catch (error) {
    console.error("[health-check] Database connection failed:", error);
    modules.push({
      name: "Database",
      status: "critical",
      latency_ms: Math.round(performance.now() - dbStart),
      message: "Falha na conexão",
      checked_at: now,
    });
  }

  // 2. Check Tasks Table
  const tasksStart = performance.now();
  try {
    const { count, error } = await supabase.from("tasks").select("*", { count: "exact", head: true });
    const tasksLatency = Math.round(performance.now() - tasksStart);
    
    if (error) {
      modules.push({
        name: "Tasks Module",
        status: "critical",
        latency_ms: tasksLatency,
        message: `Erro: ${error.message}`,
        checked_at: now,
      });
    } else {
      modules.push({
        name: "Tasks Module",
        status: "healthy",
        latency_ms: tasksLatency,
        message: `${count || 0} tarefas registradas`,
        checked_at: now,
      });
    }
  } catch (error) {
    modules.push({
      name: "Tasks Module",
      status: "critical",
      latency_ms: Math.round(performance.now() - tasksStart),
      message: "Falha ao verificar tarefas",
      checked_at: now,
    });
  }

  // 3. Check Notes Table
  const notesStart = performance.now();
  try {
    const { count, error } = await supabase.from("notes").select("*", { count: "exact", head: true });
    const notesLatency = Math.round(performance.now() - notesStart);
    
    if (error) {
      modules.push({
        name: "Notes Module",
        status: "critical",
        latency_ms: notesLatency,
        message: `Erro: ${error.message}`,
        checked_at: now,
      });
    } else {
      modules.push({
        name: "Notes Module",
        status: "healthy",
        latency_ms: notesLatency,
        message: `${count || 0} notas registradas`,
        checked_at: now,
      });
    }
  } catch (error) {
    modules.push({
      name: "Notes Module",
      status: "critical",
      latency_ms: Math.round(performance.now() - notesStart),
      message: "Falha ao verificar notas",
      checked_at: now,
    });
  }

  // 4. Check Push Subscriptions
  const pushStart = performance.now();
  try {
    const { count, error } = await supabase.from("push_subscriptions").select("*", { count: "exact", head: true });
    const pushLatency = Math.round(performance.now() - pushStart);
    
    if (error) {
      modules.push({
        name: "Push Notifications",
        status: "degraded",
        latency_ms: pushLatency,
        message: `Erro: ${error.message}`,
        checked_at: now,
      });
    } else {
      modules.push({
        name: "Push Notifications",
        status: "healthy",
        latency_ms: pushLatency,
        message: `${count || 0} dispositivos registrados`,
        checked_at: now,
      });
    }
  } catch (error) {
    modules.push({
      name: "Push Notifications",
      status: "degraded",
      latency_ms: Math.round(performance.now() - pushStart),
      message: "Falha ao verificar push",
      checked_at: now,
    });
  }

  // 5. Check Pomodoro Sessions
  const pomodoroStart = performance.now();
  try {
    const { count, error } = await supabase.from("pomodoro_sessions").select("*", { count: "exact", head: true });
    const pomodoroLatency = Math.round(performance.now() - pomodoroStart);
    
    if (error) {
      modules.push({
        name: "Pomodoro Module",
        status: "degraded",
        latency_ms: pomodoroLatency,
        message: `Erro: ${error.message}`,
        checked_at: now,
      });
    } else {
      modules.push({
        name: "Pomodoro Module",
        status: "healthy",
        latency_ms: pomodoroLatency,
        message: `${count || 0} sessões registradas`,
        checked_at: now,
      });
    }
  } catch (error) {
    modules.push({
      name: "Pomodoro Module",
      status: "degraded",
      latency_ms: Math.round(performance.now() - pomodoroStart),
      message: "Falha ao verificar pomodoro",
      checked_at: now,
    });
  }

  // 6. Check User Stats
  const statsStart = performance.now();
  try {
    const { count, error } = await supabase.from("user_stats").select("*", { count: "exact", head: true });
    const statsLatency = Math.round(performance.now() - statsStart);
    
    if (error) {
      modules.push({
        name: "Gamification",
        status: "degraded",
        latency_ms: statsLatency,
        message: `Erro: ${error.message}`,
        checked_at: now,
      });
    } else {
      modules.push({
        name: "Gamification",
        status: "healthy",
        latency_ms: statsLatency,
        message: `${count || 0} usuários com stats`,
        checked_at: now,
      });
    }
  } catch (error) {
    modules.push({
      name: "Gamification",
      status: "degraded",
      latency_ms: Math.round(performance.now() - statsStart),
      message: "Falha ao verificar gamificação",
      checked_at: now,
    });
  }

  // 7. Check Auth (via profiles count)
  const authStart = performance.now();
  try {
    const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const authLatency = Math.round(performance.now() - authStart);
    
    if (error) {
      modules.push({
        name: "Authentication",
        status: "critical",
        latency_ms: authLatency,
        message: `Erro: ${error.message}`,
        checked_at: now,
      });
    } else {
      modules.push({
        name: "Authentication",
        status: "healthy",
        latency_ms: authLatency,
        message: `${count || 0} usuários registrados`,
        checked_at: now,
      });
    }
  } catch (error) {
    modules.push({
      name: "Authentication",
      status: "critical",
      latency_ms: Math.round(performance.now() - authStart),
      message: "Falha ao verificar autenticação",
      checked_at: now,
    });
  }

  // Calculate summary
  const summary = {
    total: modules.length,
    healthy: modules.filter((m) => m.status === "healthy").length,
    degraded: modules.filter((m) => m.status === "degraded").length,
    critical: modules.filter((m) => m.status === "critical").length,
  };

  // Determine overall status
  let overall_status: "healthy" | "degraded" | "critical" = "healthy";
  if (summary.critical > 0) {
    overall_status = "critical";
  } else if (summary.degraded > 0) {
    overall_status = "degraded";
  }

  const response: HealthCheckResponse = {
    overall_status,
    timestamp: now,
    modules,
    summary,
  };

  console.log(`[health-check] Completed: ${overall_status} (${summary.healthy}/${summary.total} healthy)`);

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
};

serve(handler);
