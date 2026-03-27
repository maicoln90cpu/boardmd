import { handleCors } from '../_shared/cors.ts';
import { json, error } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('reset-daily-stats');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    log.info('Iniciando reset diário de estatísticas...');
    const supabase = createAdminClient();

    const { data: usersWithAutoReset, error: settingsError } = await supabase
      .from('user_settings').select('user_id, settings');

    if (settingsError) {
      log.error('Erro ao buscar configurações:', settingsError);
      throw settingsError;
    }

    log.info(`Encontradas ${usersWithAutoReset?.length || 0} configurações de usuários`);

    let resetCount = 0;

    for (const userSetting of usersWithAutoReset || []) {
      const settings = userSetting.settings as any;
      const autoResetEnabled = settings?.productivity?.autoResetDailyStats !== false;

      if (autoResetEnabled) {
        const { error: updateError } = await supabase
          .from('user_stats')
          .update({ tasks_completed_today: 0, updated_at: new Date().toISOString() })
          .eq('user_id', userSetting.user_id);

        if (updateError) {
          log.error(`Erro ao resetar stats do usuário ${userSetting.user_id}:`, updateError);
        } else {
          resetCount++;
        }
      }
    }

    log.info(`Reset concluído! ${resetCount} usuários atualizados`);
    return json({ success: true, message: `Reset diário concluído para ${resetCount} usuários`, resetCount });
  } catch (err) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    log.error('Erro no reset diário:', msg);
    return error(msg, 500);
  }
});
