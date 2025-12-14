import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔄 Iniciando reset diário de estatísticas...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar todos os usuários que têm a opção de auto-reset habilitada
    const { data: usersWithAutoReset, error: settingsError } = await supabase
      .from('user_settings')
      .select('user_id, settings')

    if (settingsError) {
      console.error('❌ Erro ao buscar configurações:', settingsError)
      throw settingsError
    }

    console.log(`📊 Encontradas ${usersWithAutoReset?.length || 0} configurações de usuários`)

    let resetCount = 0

    for (const userSetting of usersWithAutoReset || []) {
      // Verificar se o usuário tem auto-reset habilitado
      const settings = userSetting.settings as any
      const autoResetEnabled = settings?.productivity?.autoResetDailyStats !== false // Default: true

      if (autoResetEnabled) {
        // Resetar tasks_completed_today para 0
        const { error: updateError } = await supabase
          .from('user_stats')
          .update({ 
            tasks_completed_today: 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userSetting.user_id)

        if (updateError) {
          console.error(`❌ Erro ao resetar stats do usuário ${userSetting.user_id}:`, updateError)
        } else {
          resetCount++
          console.log(`✅ Stats resetadas para usuário ${userSetting.user_id}`)
        }
      } else {
        console.log(`⏭️ Auto-reset desabilitado para usuário ${userSetting.user_id}`)
      }
    }

    console.log(`🎉 Reset concluído! ${resetCount} usuários atualizados`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reset diário concluído para ${resetCount} usuários`,
        resetCount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro no reset diário:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
