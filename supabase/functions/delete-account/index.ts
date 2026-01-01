import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[delete-account] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar cliente Supabase com token do usuário
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente com token do usuário para verificar identidade
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Obter usuário autenticado
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error("[delete-account] User authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log(`[delete-account] Starting account deletion for user: ${userId}`);

    // Cliente admin para deletar dados e usuário
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Ordem de deleção para respeitar dependências
    const tablesToDelete = [
      { table: "push_logs", column: "user_id" },
      { table: "push_subscriptions", column: "user_id" },
      { table: "task_history", column: "user_id" },
      { table: "activity_log", column: "user_id" },
      { table: "user_stats", column: "user_id" },
      { table: "pomodoro_sessions", column: "user_id" },
      { table: "pomodoro_templates", column: "user_id" },
      { table: "notes", column: "user_id" },
      { table: "notebooks", column: "user_id" },
      { table: "tasks", column: "user_id" },
      { table: "columns", column: "user_id" },
      { table: "categories", column: "user_id" },
      { table: "tags", column: "user_id" },
      { table: "user_settings", column: "user_id" },
      { table: "trash", column: "user_id" },
      { table: "project_templates", column: "created_by" },
      { table: "profiles", column: "id" },
    ];

    const deletionResults: { table: string; deleted: number; error?: string }[] = [];

    // Deletar dados de cada tabela
    for (const { table, column } of tablesToDelete) {
      try {
        const { data, error } = await adminClient
          .from(table)
          .delete()
          .eq(column, userId)
          .select("id");

        if (error) {
          console.error(`[delete-account] Error deleting from ${table}:`, error);
          deletionResults.push({ table, deleted: 0, error: error.message });
        } else {
          const count = data?.length || 0;
          console.log(`[delete-account] Deleted ${count} rows from ${table}`);
          deletionResults.push({ table, deleted: count });
        }
      } catch (err) {
        console.error(`[delete-account] Exception deleting from ${table}:`, err);
        deletionResults.push({ table, deleted: 0, error: String(err) });
      }
    }

    // Deletar o usuário do auth
    console.log(`[delete-account] Deleting user from auth: ${userId}`);
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("[delete-account] Error deleting user from auth:", deleteUserError);
      return new Response(
        JSON.stringify({
          error: "Erro ao deletar conta de autenticação",
          details: deleteUserError.message,
          deletionResults
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-account] Account deleted successfully for user: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Conta e todos os dados deletados com sucesso",
        deletionResults
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[delete-account] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
