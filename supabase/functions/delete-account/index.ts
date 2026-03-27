import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors } from '../_shared/cors.ts';
import { json, error } from '../_shared/response.ts';
import { getAuthenticatedUser, createAdminClient } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('delete-account');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId } = await getAuthenticatedUser(req);
    log.info(`Starting account deletion for user: ${userId}`);

    const adminClient = createAdminClient();

    // Log audit event BEFORE deleting
    await adminClient.from("audit_logs").insert({
      user_id: userId,
      event_type: "delete_account",
      metadata: { requested_at: new Date().toISOString(), reason: "user_requested" },
      user_agent: req.headers.get("user-agent") || "unknown"
    });

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
      { table: "audit_logs", column: "user_id" },
      { table: "profiles", column: "id" },
    ];

    const deletionResults: { table: string; deleted: number; error?: string }[] = [];

    for (const { table, column } of tablesToDelete) {
      try {
        const { data, error: delErr } = await adminClient
          .from(table)
          .delete()
          .eq(column, userId)
          .select("id");

        if (delErr) {
          log.error(`Error deleting from ${table}:`, delErr);
          deletionResults.push({ table, deleted: 0, error: delErr.message });
        } else {
          const count = data?.length || 0;
          log.info(`Deleted ${count} rows from ${table}`);
          deletionResults.push({ table, deleted: count });
        }
      } catch (err) {
        log.error(`Exception deleting from ${table}:`, err);
        deletionResults.push({ table, deleted: 0, error: String(err) });
      }
    }

    log.info(`Deleting user from auth: ${userId}`);
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      log.error("Error deleting user from auth:", deleteUserError);
      return error("Erro ao deletar conta de autenticação", 500, { details: deleteUserError.message, deletionResults });
    }

    log.info(`Account deleted successfully for user: ${userId}`);
    return json({ success: true, message: "Conta e todos os dados deletados com sucesso", deletionResults });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("Unexpected error:", err);
    return error("Erro interno do servidor", 500, String(err));
  }
});
